// A compact, structured summary of everything a report found, sent to the model
// that writes the key points. Everything the model may cite must be in here.
// Deliberately excludes the buyer's own preferences (must-haves) and basic listing
// features (garden, parking, garage): the key points focus on what the report found,
// so the model never sees them.

import type { NearbyPlace, NearbyPlacesResult } from "@/lib/nearby-amenities"
import type { RisksRestrictionsData } from "@/lib/use-risks-restrictions"
import { walkingMinutes, type HomeLensScoreResult } from "@/lib/scoring/homelens-score"

export type ReportFindings = {
  property: {
    address: string | null
    askingPrice: number | null
    propertyType: string | null
    bedrooms: number | null
    bathrooms: number | null
    floorAreaSqm: number | null
    epcRating: string | null
    estimatedYearBuilt: string | null
    tenure: string | null
  }
  price: {
    outcode: string | null
    areaAveragePrice: number | null
    areaAverageYear: number | null
    askingVsAreaPercent: number | null
    pricePerSqm: number | null
    areaPricePerSqm: number | null
    pricePerSqmVsAreaPercent: number | null
    areaGrowthPercentPerYear: number | null
    lastSale: { price: number; year: number } | null
    /** Every past sale of this home (oldest first). */
    saleHistory: { price: number; year: number }[]
    /** The closest recent sales of the same type — the main pricing evidence. */
    recentSalesNearby: { street: string; sold: string; price: number; pricePerSqm: number | null; distanceMiles: number }[]
    sellersGainPercent: number | null
  }
  market: {
    daysOnMarket: number | null
    firstListed: string | null
    supplyDemand: { label: string; forSaleNow: number; salesPerYear: number; monthsOfSupply: number } | null
    areaSalesLast12Months: number | null
    areaSalesPrevious12Months: number | null
    areaSalesChangePercent: number | null
    postcodeSalesLast12Months: number | null
    /** The closest homes of the same type for sale now: the competition. */
    listingsForSaleNearby: { price: number; bedrooms: number | null; bathrooms: number | null; pricePerSqm: number | null; distanceMiles: number }[]
  }
  risks: {
    floodZone: boolean
    conservationArea: boolean
    article4Direction: boolean
    listedBuildingsNearby: boolean
    treePreservationNearby: boolean
    greenBelt: boolean
    crimeReportsWithinAboutAMile: number | null
    crimeMonth: string | null
    topCrimeCategories: string[]
    roadNoiseDb: number | null
    railNoiseDb: number | null
    aircraftNoiseDb: number | null
    airQualityWithinUkObjectives: boolean | null
    gigabitBroadbandPercent: number | null
  } | null
  dailyLife: Record<string, { name: string; walkMinutes: number; rating: string | null } | null> | null
  score: { total: number | null; max: number; sections: Record<string, { score: number | null; max: number }> }
}

const round1 = (n: number) => Math.round(n * 10) / 10

export function percentVs(value: number | null, average: number | null): number | null {
  if (value === null || average === null || average <= 0) return null
  return round1(((value - average) / average) * 100)
}

function nearest(places: NearbyPlace[]): { name: string; walkMinutes: number; rating: string | null } | null {
  if (places.length === 0) return null
  const p = [...places].sort((a, b) => a.distance - b.distance)[0]
  return { name: p.name, walkMinutes: walkingMinutes(p.distance), rating: p.rating ?? null }
}

export function summariseDailyLife(places: NearbyPlacesResult | null): ReportFindings["dailyLife"] {
  if (!places) return null
  return {
    school: nearest(places.schools),
    station: nearest(places.stations),
    gp: nearest(places.gpSurgeries),
    dentist: nearest(places.dentists),
    hospital: nearest(places.hospitals),
    park: nearest(places.parks),
    nursery: nearest(places.nurseries),
    supermarket: nearest(places.supermarkets),
  }
}

export function summariseRisks(data: RisksRestrictionsData | null): ReportFindings["risks"] {
  if (!data) return null
  const pc = data.planningConstraints
  const air = data.environmentData.airQuality
  const noise = data.environmentData.noiseLevels
  return {
    floodZone: pc.floodRiskZones.length > 0,
    conservationArea: pc.conservationAreas.length > 0,
    article4Direction: pc.article4Directions.length > 0,
    listedBuildingsNearby: pc.listedBuildingsNearby.length > 0,
    treePreservationNearby: pc.treePreservationNearby.length > 0,
    greenBelt: pc.greenBelt.length > 0,
    crimeReportsWithinAboutAMile: data.crimeSummary?.totalCount ?? null,
    crimeMonth: data.crimeSummary?.month ?? null,
    topCrimeCategories: (data.crimeSummary?.topCategories ?? []).slice(0, 3).map((c) => `${c.category} (${c.count})`),
    roadNoiseDb: noise.roadNoiseDb === null ? null : Math.round(noise.roadNoiseDb),
    railNoiseDb: noise.railNoiseDb === null ? null : Math.round(noise.railNoiseDb),
    aircraftNoiseDb: noise.airportNoiseDb === null ? null : Math.round(noise.airportNoiseDb),
    airQualityWithinUkObjectives: air ? air.no2 < 40 && air.pm25 < 20 && air.pm10 < 40 : null,
    gigabitBroadbandPercent: data.broadbandCoverage?.gigabitAvailability ?? null,
  }
}

export function summariseScore(result: HomeLensScoreResult): ReportFindings["score"] {
  return {
    total: result.total,
    max: result.max,
    // Without the must-haves section, which reflects the buyer's preferences.
    sections: Object.fromEntries(
      Object.entries(result.sections)
        .filter(([k]) => k !== "mustHaves")
        .map(([k, s]) => [k, { score: s.score, max: s.max }])
    ),
  }
}

const miles = (km: number) => Math.round(km * 0.621371 * 10) / 10
const perSqm = (price: number, area: number | null) => (area && area > 0 ? Math.round(price / area) : null)
const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())

/** Street only (no house number): "39 KING EDWARD AVENUE" → "King Edward Avenue". */
export function streetOnly(address: string): string {
  return titleCase(address.replace(/^(flat|unit|apartment)?\s*[\d\w]*\d[\w-]*,?\s+/i, "").trim())
}

export function summariseRecentSales(
  sales: { address: string; price: number; dateOfTransfer: string; distanceKm: number | null; areaSqm: number | null }[]
): ReportFindings["price"]["recentSalesNearby"] {
  return sales.map((s) => ({
    street: streetOnly(s.address),
    sold: new Date(s.dateOfTransfer).toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
    price: s.price,
    pricePerSqm: perSqm(s.price, s.areaSqm),
    distanceMiles: s.distanceKm === null ? 0 : miles(s.distanceKm),
  }))
}

export function summariseListings(
  listings: { price: number; bedrooms: number | null; bathrooms: number | null; areaSqm: number | null; distanceKm: number }[]
): ReportFindings["market"]["listingsForSaleNearby"] {
  return listings.map((l) => ({
    price: l.price,
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    pricePerSqm: perSqm(l.price, l.areaSqm),
    distanceMiles: miles(l.distanceKm),
  }))
}
