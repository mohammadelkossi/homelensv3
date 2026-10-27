// HomeLens score: one score per report section, out of 999 overall.
// §01 Price 200 · §02 Market 200 · §03 Risks 200 · §04 Daily life 200 · §05 Must-haves 199.
//
// Each section is a set of weighted items, each scoring a fraction from 0 to 1.
// An item with no data is left out and the section rescales from the items that
// do have data; if under half the section's points have data, the section shows
// no score and the total rescales from the other sections instead.

import type { RisksRestrictionsData } from "@/lib/use-risks-restrictions"
import type { NearbyPlacesResult } from "@/lib/nearby-amenities"

export const SECTION_MAX = { price: 200, market: 200, risks: 200, dailyLife: 200, mustHaves: 199 } as const
export const TOTAL_MAX = 999

export type SectionKey = keyof typeof SECTION_MAX

export type SectionScore = {
  score: number | null
  max: number
  /** Items with data / all items, so the report can say "based on 4 of 5 checks". */
  itemsUsed: number
  itemsTotal: number
}

export type HomeLensScoreResult = {
  total: number | null
  max: number
  sections: Record<SectionKey, SectionScore>
}

type Item = { points: number; fraction: number | null }

/** Linear interpolation through (x, y) points sorted by x, clamped at both ends. */
export function piecewise(x: number, points: [number, number][]): number {
  if (x <= points[0][0]) return points[0][1]
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1]
    const [x1, y1] = points[i]
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0)
  }
  return points[points.length - 1][1]
}

function scoreSection(max: number, items: Item[]): SectionScore {
  const available = items.filter((i) => i.fraction !== null)
  const availablePoints = available.reduce((sum, i) => sum + i.points, 0)
  const allPoints = items.reduce((sum, i) => sum + i.points, 0)
  const base = { max, itemsUsed: available.length, itemsTotal: items.length }
  if (allPoints === 0 || availablePoints < allPoints / 2) return { ...base, score: null }
  const earned = available.reduce((sum, i) => sum + i.points * (i.fraction as number), 0)
  return { ...base, score: Math.round((earned / availablePoints) * max) }
}

// ── §01 What is a fair price? ───────────────────────────────────────────────

export type PriceInput = {
  askingPrice: number | null
  districtAveragePrice: number | null
  pricePerSqm: number | null
  districtPricePerSqm: number | null
  /** Area's annualised growth over recent years, in % per year. */
  areaGrowthRatePercent: number | null
}

// 10%+ below the area = full marks, at the area average = 50/80, 20%+ above = 0.
const PREMIUM_CURVE: [number, number][] = [[-10, 1], [0, 50 / 80], [20, 0]]

function premiumPercent(value: number | null, average: number | null): number | null {
  if (value === null || average === null || average <= 0) return null
  return ((value - average) / average) * 100
}

export function scorePrice(input: PriceInput): SectionScore {
  const asking = premiumPercent(input.askingPrice, input.districtAveragePrice)
  const sqm = premiumPercent(input.pricePerSqm, input.districtPricePerSqm)
  const growth = input.areaGrowthRatePercent
  return scoreSection(SECTION_MAX.price, [
    { points: 80, fraction: asking === null ? null : piecewise(asking, PREMIUM_CURVE) },
    { points: 80, fraction: sqm === null ? null : piecewise(sqm, PREMIUM_CURVE) },
    // −3%/yr or worse = 0, flat = 15/40, +5%/yr or better = full marks.
    { points: 40, fraction: growth === null ? null : piecewise(growth, [[-3, 0], [0, 15 / 40], [5, 1]]) },
  ])
}

// ── §02 How is the local market? ────────────────────────────────────────────

export type MarketInput = {
  supplyDemandLabel: "Seller's" | "Balanced" | "Buyer's" | null
  daysOnMarket: number | null
  /** Area sales in the last 12 months vs the 12 before, in %. */
  salesTrendChangePercent: number | null
}

const NEGOTIATING_POSITION: Record<"Seller's" | "Balanced" | "Buyer's", number> = {
  "Buyer's": 1,
  Balanced: 50 / 80,
  "Seller's": 20 / 80,
}

export function scoreMarket(input: MarketInput): SectionScore {
  const { supplyDemandLabel, daysOnMarket, salesTrendChangePercent } = input
  return scoreSection(SECTION_MAX.market, [
    { points: 80, fraction: supplyDemandLabel ? NEGOTIATING_POSITION[supplyDemandLabel] : null },
    // A home that's been sitting is a warning sign: 30 days or fewer = full marks, 180+ = 0.
    { points: 60, fraction: daysOnMarket === null ? null : piecewise(daysOnMarket, [[30, 1], [180, 0]]) },
    // Sales falling 40%+ = 0, flat = 40/60, rising 10%+ = full marks.
    {
      points: 60,
      fraction: salesTrendChangePercent === null ? null : piecewise(salesTrendChangePercent, [[-40, 0], [0, 40 / 60], [10, 1]]),
    },
  ])
}

// ── §03 What to check before you offer ──────────────────────────────────────
// Thresholds mirror §03's own table (src/components/risks-restrictions.tsx).

const NOISE_FLAG_DB = 55
const AIR_QUALITY_OBJECTIVES = { no2: 40, pm25: 20, pm10: 40 }

const clearIf = (isClear: boolean) => (isClear ? 1 : 0)

export function scoreRisks(data: RisksRestrictionsData | null): SectionScore {
  if (!data) return scoreSection(SECTION_MAX.risks, [{ points: 1, fraction: null }])
  const pc = data.planningConstraints
  const noise = data.environmentData.noiseLevels
  const air = data.environmentData.airQuality
  const broadband = data.broadbandCoverage
  const crimeCount = data.crimeSummary?.totalCount ?? null

  const broadbandFraction = (() => {
    if (!broadband) return null
    if ((broadband.belowUso ?? 0) > 0) return 0
    if ((broadband.gigabitAvailability ?? 0) > 0 || (broadband.superfastAvailability ?? 0) > 0) return 1
    return null
  })()

  return scoreSection(SECTION_MAX.risks, [
    { points: 50, fraction: clearIf(pc.floodRiskZones.length === 0) },
    // "Nothing found" counts as clear: it's the absence of a known restriction.
    { points: 20, fraction: clearIf(pc.conservationAreas.length === 0) },
    { points: 15, fraction: clearIf(pc.article4Directions.length === 0) },
    {
      points: 15,
      fraction: clearIf(pc.listedBuildingsNearby.length + pc.treePreservationNearby.length + pc.greenBelt.length === 0),
    },
    // Reports within ~1 mile in a month: under 25 = full marks, 100+ = 0 (as §03 flags it).
    { points: 30, fraction: crimeCount === null ? null : piecewise(crimeCount, [[25, 1], [100, 0]]) },
    {
      points: 30,
      fraction: clearIf(![noise.roadNoiseDb, noise.railNoiseDb, noise.airportNoiseDb].some((db) => db !== null && db >= NOISE_FLAG_DB)),
    },
    {
      points: 20,
      fraction: air
        ? clearIf(air.no2 < AIR_QUALITY_OBJECTIVES.no2 && air.pm25 < AIR_QUALITY_OBJECTIVES.pm25 && air.pm10 < AIR_QUALITY_OBJECTIVES.pm10)
        : null,
    },
    { points: 20, fraction: broadbandFraction },
  ])
}

// ── §04 What daily life looks like here ─────────────────────────────────────

const WALKING_KMH = 5 // same as §04's walking times (src/components/report/daily-life.tsx)

export function walkingMinutes(distanceKm: number): number {
  return Math.max(1, Math.round((distanceKm / WALKING_KMH) * 60))
}

function nearestWalk(...groups: { distance: number }[][]): number | null {
  const distances = groups.flat().map((p) => p.distance)
  return distances.length > 0 ? walkingMinutes(Math.min(...distances)) : null
}

export function scoreDailyLife(places: NearbyPlacesResult | null): SectionScore {
  // An empty category is treated as missing data, not "none nearby": the place
  // lookups can come back empty when a source is down.
  const walk = (minutes: number | null) => (minutes === null ? null : piecewise(minutes, [[5, 1], [30, 0]]))
  return scoreSection(SECTION_MAX.dailyLife, [
    { points: 50, fraction: walk(places ? nearestWalk(places.schools) : null) },
    { points: 50, fraction: walk(places ? nearestWalk(places.stations) : null) },
    { points: 40, fraction: walk(places ? nearestWalk(places.gpSurgeries, places.dentists) : null) },
    { points: 40, fraction: walk(places ? nearestWalk(places.parks) : null) },
    { points: 20, fraction: walk(places ? nearestWalk(places.nurseries) : null) },
  ])
}

// ── §05 Does it tick your boxes? ────────────────────────────────────────────

export type PropertyTypeKey = "detached" | "semi-detached" | "terraced" | "flat" | "bungalow"

/** Order matters: "Semi-Detached" and "Detached Bungalow" both contain "detached". */
export function normalizePropertyType(type: string | null | undefined): PropertyTypeKey | null {
  if (!type) return null
  const t = type.toLowerCase()
  if (t.includes("bungalow")) return "bungalow"
  if (t.includes("semi")) return "semi-detached"
  if (t.includes("terrace") || t.includes("town house") || t.includes("townhouse")) return "terraced"
  if (t.includes("detached")) return "detached"
  if (t.includes("flat") || t.includes("apartment") || t.includes("maisonette") || t.includes("studio")) return "flat"
  return null
}

const CLOSE_TYPES: [PropertyTypeKey, PropertyTypeKey][] = [
  ["detached", "semi-detached"],
  ["semi-detached", "terraced"],
  ["detached", "bungalow"],
]

export function propertyTypeMatch(wanted: string | null, actual: string | null): number | null {
  const w = normalizePropertyType(wanted)
  const a = normalizePropertyType(actual)
  if (!w || !a) return null
  if (w === a) return 1
  return CLOSE_TYPES.some(([x, y]) => (x === w && y === a) || (x === a && y === w)) ? 0.6 : 0
}

/** Meets or beats what's wanted = full, one short = 40%, further short = 0. */
export function atLeastMatch(wanted: number | null, actual: number | null, oneShort = 1): number | null {
  if (wanted === null || actual === null) return null
  if (actual >= wanted) return 1
  return wanted - actual <= oneShort ? 0.4 : 0
}

/** "3", "6+", "4+" → 3, 6, 4. */
export function parseMinimum(value: string | null | undefined): number | null {
  if (!value) return null
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : null
}

export type MustHavesInput = {
  wanted: { bedrooms: string | null; bathrooms: string | null; propertyType: string | null; size: string | null }
  /** Importance sliders (0–100). 0 or missing = not wanted, so not scored. */
  importance: { bedrooms: number | null; bathrooms: number | null; propertyType: number | null; size: number | null; garden: number | null; parking: number | null; garage: number | null }
  home: { bedrooms: number | null; bathrooms: number | null; propertyType: string | null; areaSqm: number | null; garden: boolean | null; parking: boolean | null; garage: boolean | null }
}

/** The preferences page's starting value for every importance slider. */
export const DEFAULT_IMPORTANCE = 50
/** Flat score when the buyer hasn't filled in their preferences. */
export const UNSET_MUST_HAVES_SCORE = 100

export function scoreMustHaves({ wanted, importance, home }: MustHavesInput): SectionScore {
  // Nothing chosen and every slider untouched: it's "your" must-haves, so don't
  // score this home against preferences the buyer never gave — use a flat 100.
  const notFilledIn =
    !wanted.bedrooms &&
    !wanted.bathrooms &&
    !wanted.propertyType &&
    !wanted.size &&
    Object.values(importance).every((v) => v === null || v === DEFAULT_IMPORTANCE)
  if (notFilledIn) return { score: UNSET_MUST_HAVES_SCORE, max: SECTION_MAX.mustHaves, itemsUsed: 0, itemsTotal: 0 }

  const has = (value: boolean | null) => (value === null ? null : clearIf(value))
  // [importance, did the buyer set this preference?, match fraction or null if the listing lacks the data]
  const candidates: [number | null, boolean, number | null][] = [
    [importance.bedrooms, !!wanted.bedrooms, atLeastMatch(parseMinimum(wanted.bedrooms), home.bedrooms)],
    [importance.bathrooms, !!wanted.bathrooms, atLeastMatch(parseMinimum(wanted.bathrooms), home.bathrooms)],
    [importance.propertyType, !!wanted.propertyType, propertyTypeMatch(wanted.propertyType, home.propertyType)],
    // Size ranges ("71-90", "171+"): at or above the bottom of the range counts as meeting it; up to 10 m² under = one short.
    [importance.size, !!wanted.size, atLeastMatch(parseMinimum(wanted.size), home.areaSqm, 10)],
    [importance.garden, true, has(home.garden)],
    [importance.parking, true, has(home.parking)],
    [importance.garage, true, has(home.garage)],
  ]
  // Only preferences the buyer actually set (and gave some importance) count. If the
  // listing lacks the data for one, it's left out and the section rescales.
  const items: Item[] = candidates
    .filter(([weight, isSet]) => isSet && weight !== null && weight > 0)
    .map(([weight, , fraction]) => ({ points: weight as number, fraction }))
  return scoreSection(SECTION_MAX.mustHaves, items)
}

// ── Total ───────────────────────────────────────────────────────────────────

export function homeLensScore(sections: Record<SectionKey, SectionScore>): HomeLensScoreResult {
  const scored = Object.values(sections).filter((s) => s.score !== null)
  if (scored.length === 0) return { total: null, max: TOTAL_MAX, sections }
  const earned = scored.reduce((sum, s) => sum + (s.score as number), 0)
  const possible = scored.reduce((sum, s) => sum + s.max, 0)
  // All five scored: the sections add up exactly. Otherwise rescale to /999 from those that did.
  const total = possible === TOTAL_MAX ? earned : Math.round((earned / possible) * TOTAL_MAX)
  return { total, max: TOTAL_MAX, sections }
}

const SECTION_LABELS: Record<SectionKey, string> = {
  price: "Price",
  market: "Market",
  risks: "Risks",
  dailyLife: "Daily life",
  mustHaves: "Your must-haves",
}

/** Rows for the score breakdown, in report order (§01–§05). */
export function scoreSectionRows(result: HomeLensScoreResult): { label: string; value: number | null; max: number }[] {
  return (Object.keys(SECTION_LABELS) as SectionKey[]).map((key) => ({
    label: SECTION_LABELS[key],
    value: result.sections[key].score,
    max: result.sections[key].max,
  }))
}
