import { describe, expect, it } from "vitest"
import type { RisksRestrictionsData } from "@/lib/use-risks-restrictions"
import type { NearbyPlacesResult } from "@/lib/nearby-amenities"
import {
  SECTION_MAX,
  TOTAL_MAX,
  atLeastMatch,
  homeLensScore,
  normalizePropertyType,
  piecewise,
  propertyTypeMatch,
  scoreDailyLife,
  scoreMarket,
  scoreMustHaves,
  scorePrice,
  scoreRisks,
  type SectionScore,
} from "./homelens-score"

const clearRisks: RisksRestrictionsData = {
  planningConstraints: {
    conservationAreas: [],
    article4Directions: [],
    greenBelt: [],
    floodRiskZones: [],
    listedBuildingsNearby: [],
    treePreservationNearby: [],
  },
  crimeSummary: { month: "2026-08", totalCount: 10, topCategories: [], baseline: null },
  broadbandCoverage: { postcode: "LS184BE", gigabitAvailability: 100, ultrafastAvailability: 100, superfastAvailability: 100, belowUso: 0, decentBroadbandFwa: 0 },
  environmentData: { airQuality: { no2: 10, pm25: 7, pm10: 10 }, noiseLevels: { roadNoiseDb: 50, railNoiseDb: null, airportNoiseDb: null } },
} as unknown as RisksRestrictionsData

const place = (distanceKm: number) => [{ name: "x", distance: distanceKm }]
const emptyPlaces: NearbyPlacesResult = {
  schools: [], stations: [], parks: [], supermarkets: [], placesOfWorship: [], gyms: [],
  hospitals: [], gpSurgeries: [], dentists: [], nurseries: [],
}

describe("piecewise", () => {
  it("interpolates and clamps", () => {
    expect(piecewise(-20, [[-10, 1], [0, 0.5], [20, 0]])).toBe(1)
    expect(piecewise(0, [[-10, 1], [0, 0.5], [20, 0]])).toBe(0.5)
    expect(piecewise(10, [[-10, 1], [0, 0.5], [20, 0]])).toBe(0.25)
    expect(piecewise(99, [[-10, 1], [0, 0.5], [20, 0]])).toBe(0)
  })
})

describe("§01 price", () => {
  it("gives full marks to a home well below the area on price and £/m² with strong growth", () => {
    const s = scorePrice({ askingPrice: 85, districtAveragePrice: 100, pricePerSqm: 85, districtPricePerSqm: 100, areaGrowthRatePercent: 6 })
    expect(s.score).toBe(200)
  })
  it("scores an average-priced home with flat growth in the middle", () => {
    // 80·50/80 + 80·50/80 + 40·15/40 = 115
    const s = scorePrice({ askingPrice: 100, districtAveragePrice: 100, pricePerSqm: 100, districtPricePerSqm: 100, areaGrowthRatePercent: 0 })
    expect(s.score).toBe(115)
  })
  it("rescales when £/m² is unknown, and gives up when most of the section is missing", () => {
    const partial = scorePrice({ askingPrice: 100, districtAveragePrice: 100, pricePerSqm: null, districtPricePerSqm: null, areaGrowthRatePercent: 0 })
    expect(partial).toMatchObject({ itemsUsed: 2, itemsTotal: 3, score: Math.round(((50 + 15) / 120) * 200) })
    const tooLittle = scorePrice({ askingPrice: null, districtAveragePrice: null, pricePerSqm: null, districtPricePerSqm: null, areaGrowthRatePercent: 2 })
    expect(tooLittle.score).toBeNull()
  })
})

describe("§02 market", () => {
  it("treats a long time on the market as a warning sign", () => {
    const fresh = scoreMarket({ supplyDemandLabel: "Balanced", daysOnMarket: 20, salesTrendChangePercent: 0 })
    const stale = scoreMarket({ supplyDemandLabel: "Balanced", daysOnMarket: 200, salesTrendChangePercent: 0 })
    expect(fresh.score).toBeGreaterThan(stale.score as number)
    expect((fresh.score as number) - (stale.score as number)).toBe(60)
  })
  it("rewards a buyer's market and rising sales", () => {
    expect(scoreMarket({ supplyDemandLabel: "Buyer's", daysOnMarket: 10, salesTrendChangePercent: 15 }).score).toBe(200)
    expect(scoreMarket({ supplyDemandLabel: "Seller's", daysOnMarket: 180, salesTrendChangePercent: -50 }).score).toBe(20)
  })
})

describe("§03 risks", () => {
  it("gives full marks when every check is clear", () => {
    expect(scoreRisks(clearRisks).score).toBe(200)
  })
  it("deducts each flagged check's points", () => {
    const flagged = {
      ...clearRisks,
      planningConstraints: { ...clearRisks.planningConstraints, article4Directions: [{ name: "A4D01", reference: "A4D01" }] },
      crimeSummary: { ...clearRisks.crimeSummary!, totalCount: 171 },
    } as RisksRestrictionsData
    expect(scoreRisks(flagged).score).toBe(200 - 15 - 30)
  })
  it("has no score until risk data has loaded", () => {
    expect(scoreRisks(null).score).toBeNull()
  })
})

describe("§04 daily life", () => {
  it("scores walking times: 5 min or less = full, 30+ = none", () => {
    const close = { ...emptyPlaces, schools: place(0.3), stations: place(0.3), gpSurgeries: place(0.3), parks: place(0.3), nurseries: place(0.3) }
    const far = { ...emptyPlaces, schools: place(5), stations: place(5), gpSurgeries: place(5), parks: place(5), nurseries: place(5) }
    expect(scoreDailyLife(close).score).toBe(200)
    expect(scoreDailyLife(far).score).toBe(0)
  })
  it("uses the nearer of a GP or dentist for health", () => {
    const s = scoreDailyLife({ ...emptyPlaces, schools: place(0.3), stations: place(0.3), gpSurgeries: place(5), dentists: place(0.3), parks: place(0.3), nurseries: place(0.3) })
    expect(s.score).toBe(200)
  })
  it("treats an empty category as missing data, not 'none nearby'", () => {
    const s = scoreDailyLife({ ...emptyPlaces, schools: place(0.3), stations: place(0.3), gpSurgeries: place(0.3) })
    expect(s).toMatchObject({ itemsUsed: 3, score: 200 })
  })
})

describe("§05 must-haves", () => {
  it("normalises property types, checking semi before detached", () => {
    expect(normalizePropertyType("Semi-Detached")).toBe("semi-detached")
    expect(normalizePropertyType("Detached Bungalow")).toBe("bungalow")
    expect(normalizePropertyType("End of Terrace")).toBe("terraced")
    expect(normalizePropertyType("Apartment")).toBe("flat")
  })
  it("gives close property types partial credit", () => {
    expect(propertyTypeMatch("semi-detached", "Semi-Detached")).toBe(1)
    expect(propertyTypeMatch("detached", "Semi-Detached")).toBe(0.6)
    expect(propertyTypeMatch("flat", "Detached")).toBe(0)
  })
  it("treats more than you asked for as meeting it", () => {
    expect(atLeastMatch(3, 4)).toBe(1)
    expect(atLeastMatch(3, 2)).toBe(0.4)
    expect(atLeastMatch(3, 1)).toBe(0)
  })
  it("scores a flat 100 when the buyer hasn't filled in any preferences", () => {
    const untouched = { bedrooms: 50, bathrooms: 50, propertyType: 50, size: 50, garden: 50, parking: 50, garage: 50 }
    const home = { bedrooms: 3, bathrooms: 1, propertyType: "Semi-Detached", areaSqm: 90, garden: true, parking: true, garage: false }
    const none = { bedrooms: null, bathrooms: null, propertyType: null, size: null }
    expect(scoreMustHaves({ wanted: none, importance: untouched, home }).score).toBe(100)
    // Moving even one slider counts as filling them in.
    expect(scoreMustHaves({ wanted: none, importance: { ...untouched, garage: 80 }, home }).score).not.toBe(100)
  })
  it("weights by importance and ignores things the buyer doesn't want", () => {
    const s = scoreMustHaves({
      wanted: { bedrooms: "3", bathrooms: null, propertyType: null, size: null },
      importance: { bedrooms: 100, bathrooms: 50, propertyType: 50, size: 50, garden: 100, parking: 0, garage: 0 },
      home: { bedrooms: 4, bathrooms: 1, propertyType: "Detached", areaSqm: 90, garden: false, parking: false, garage: false },
    })
    // Only bedrooms (met, weight 100) and garden (missing, weight 100) count.
    expect(s).toMatchObject({ itemsTotal: 2, score: Math.round(0.5 * SECTION_MAX.mustHaves) })
  })
})

describe("total", () => {
  const s = (score: number | null, max: number): SectionScore => ({ score, max, itemsUsed: 1, itemsTotal: 1 })
  it("is the plain sum when all five sections score, out of 999", () => {
    const r = homeLensScore({ price: s(100, 200), market: s(100, 200), risks: s(100, 200), dailyLife: s(100, 200), mustHaves: s(99, 199) })
    expect(r).toMatchObject({ total: 499, max: TOTAL_MAX })
  })
  it("rescales to 999 when a section has no score", () => {
    const r = homeLensScore({ price: s(200, 200), market: s(null, 200), risks: s(200, 200), dailyLife: s(200, 200), mustHaves: s(199, 199) })
    expect(r.total).toBe(999)
  })
})
