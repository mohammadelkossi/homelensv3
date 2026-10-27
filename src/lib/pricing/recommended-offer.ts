// Rules-based "recommended offer" range (explicitly illustrative, not a valuation).
// Builds up a discount-from-asking-price percentage from a small set of signals,
// each contributing points; points map to a discount range (not a single number)
// so the output reads as "£X – £Y", matching how an actual negotiation range works.

const ROUND_TO = 5_000
const RANGE_SPREAD_POINTS = 4
const MAX_DISCOUNT_POINTS = 16
/** The offer is never more than this % below the asking price (the range's low end included). */
export const MAX_PERCENT_BELOW_ASKING = 10
/** On the market longer than this many days: the top of the range is capped below asking. */
export const STALE_LISTING_DAYS = 50
/** For a stale listing, the range's top is at least this % below the asking price. */
export const STALE_LISTING_MIN_PERCENT_BELOW = 5

/** However strong the home, the range's top is at least this far below the asking price. */
export const MIN_POUNDS_BELOW_ASKING_HIGH = 10_000
/** ...and the range's bottom at least this far below it. */
export const MIN_POUNDS_BELOW_ASKING_LOW = 20_000

export type OfferLimits = {
  /** The highest the range's top may be. */
  maxHigh: number
  /** The highest the range's bottom may be. */
  maxLow: number
  /** The lowest the range's bottom may be: 10% below asking, or lower if that's needed to sit £20k below. */
  floor: number
}

/**
 * Every hard limit on a recommended offer, rounded to `step` so rounding can't break them:
 * top at least £10k below asking (and at most 95% of it once listed over 50 days), bottom
 * at least £20k below asking, and never more than 10% below asking unless the £20k rule
 * needs it (homes under £200k).
 */
export function offerLimits(askingPrice: number, daysOnMarket: number | null, step: number): OfferLimits {
  const down = (n: number) => Math.floor(n / step) * step
  const stale = staleListingCap(askingPrice, daysOnMarket, step)
  const maxHigh = Math.min(down(askingPrice - MIN_POUNDS_BELOW_ASKING_HIGH), stale ?? Infinity)
  const maxLow = Math.min(down(askingPrice - MIN_POUNDS_BELOW_ASKING_LOW), maxHigh - step)
  const tenPercentFloor = Math.ceil((askingPrice * (1 - MAX_PERCENT_BELOW_ASKING / 100)) / step) * step
  return { maxHigh, maxLow, floor: Math.min(tenPercentFloor, maxLow) }
}

/** The most the range's top may be, or null when there's no cap (the listing isn't stale). */
export function staleListingCap(askingPrice: number, daysOnMarket: number | null, step: number): number | null {
  if (daysOnMarket === null || daysOnMarket <= STALE_LISTING_DAYS) return null
  // Rounded down, so rounding can never lift the top over the cap.
  return Math.floor((askingPrice * (1 - STALE_LISTING_MIN_PERCENT_BELOW / 100)) / step) * step
}

const DAYS_ON_MARKET_MODERATE = 60
const DAYS_ON_MARKET_LONG = 120
const PREMIUM_THRESHOLD_PERCENT = 10
const SELLERS_GAIN_THRESHOLD_PERCENT = 30

export type RecommendedOfferInput = {
  askingPrice: number
  daysOnMarket: number | null
  /** (askingPrice - districtAveragePrice) / districtAveragePrice * 100 */
  premiumOverDistrictPercent: number | null
  /** (askingPrice - lastSalePrice) / lastSalePrice * 100 */
  sellersGainPercent: number | null
  recentSalesCount: number | null
}

export type RecommendedOfferResult = {
  low: number
  high: number
  percentBelowLow: number
  percentBelowHigh: number
  openingOffer: number
  reasons: string[]
}

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step
}

export function recommendedOfferRange(input: RecommendedOfferInput): RecommendedOfferResult {
  let points = 0
  const reasons: string[] = []

  if (input.daysOnMarket !== null && input.daysOnMarket > DAYS_ON_MARKET_MODERATE) {
    points += input.daysOnMarket > DAYS_ON_MARKET_LONG ? 3 : 2
    reasons.push(`${input.daysOnMarket} days on the market`)
  }

  if (input.premiumOverDistrictPercent !== null && input.premiumOverDistrictPercent > PREMIUM_THRESHOLD_PERCENT) {
    points += Math.min(Math.round(input.premiumOverDistrictPercent / 5), 4)
    reasons.push(`Asking ${Math.round(input.premiumOverDistrictPercent)}% above the area average`)
  }

  if (input.sellersGainPercent !== null && input.sellersGainPercent > SELLERS_GAIN_THRESHOLD_PERCENT) {
    points += 2
    reasons.push(`Seller has a gain of +${Math.round(input.sellersGainPercent)}%`)
  }

  if (input.recentSalesCount === 0) {
    points += 1
    reasons.push("No recent sales in the postcode")
  }

  points = Math.max(0, Math.min(points, MAX_DISCOUNT_POINTS))

  const limits = offerLimits(input.askingPrice, input.daysOnMarket, ROUND_TO)
  // A stale listing's top is at least STALE_LISTING_MIN_PERCENT_BELOW under asking; the low
  // end keeps its usual spread below that. Never more than MAX_PERCENT_BELOW_ASKING below.
  const stale = staleListingCap(input.askingPrice, input.daysOnMarket, ROUND_TO) !== null
  const highDiscountPercent = Math.max(
    Math.min(points, MAX_PERCENT_BELOW_ASKING - RANGE_SPREAD_POINTS),
    stale ? STALE_LISTING_MIN_PERCENT_BELOW : 0
  )
  const lowDiscountPercent = Math.min(Math.max(points, highDiscountPercent) + RANGE_SPREAD_POINTS, MAX_PERCENT_BELOW_ASKING)

  const high = Math.min(roundToNearest(input.askingPrice * (1 - highDiscountPercent / 100), ROUND_TO), limits.maxHigh)
  const low = Math.min(
    Math.max(roundToNearest(input.askingPrice * (1 - lowDiscountPercent / 100), ROUND_TO), Math.min(limits.floor, high)),
    limits.maxLow
  )

  return {
    low,
    high,
    percentBelowLow: Math.round(((input.askingPrice - low) / input.askingPrice) * 100),
    percentBelowHigh: Math.round(((input.askingPrice - high) / input.askingPrice) * 100),
    openingOffer: low,
    reasons,
  }
}

export type SellersGain = { amount: number; percent: number }

export function sellersGain(askingPrice: number | null, lastSalePrice: number | null): SellersGain | null {
  if (askingPrice === null || lastSalePrice === null || lastSalePrice <= 0) return null
  const amount = askingPrice - lastSalePrice
  return { amount, percent: (amount / lastSalePrice) * 100 }
}

/** Compound annual growth rate between two prices `years` apart. Null if years <= 0 or startPrice <= 0. */
export function annualizedGrowthRate(startPrice: number, endPrice: number, years: number): number | null {
  if (startPrice <= 0 || years <= 0) return null
  return (Math.pow(endPrice / startPrice, 1 / years) - 1) * 100
}

export type PricePoint = { price: number; year: number }

export type HomeValueGrowth = {
  latest: { ratePercent: number; fromYear: number; toYear: number }
  previous: { ratePercent: number; fromYear: number; toYear: number } | null
}

/** Annualised growth between each consecutive pair of sales (+ asking as the final point). Sorted ascending by year. */
export function homeValueGrowth(sales: PricePoint[]): HomeValueGrowth | null {
  const sorted = [...sales].sort((a, b) => a.year - b.year)
  if (sorted.length < 2) return null

  const pairs: { ratePercent: number; fromYear: number; toYear: number }[] = []
  for (let i = 1; i < sorted.length; i++) {
    const rate = annualizedGrowthRate(sorted[i - 1].price, sorted[i].price, sorted[i].year - sorted[i - 1].year)
    if (rate !== null) {
      pairs.push({ ratePercent: rate, fromYear: sorted[i - 1].year, toYear: sorted[i].year })
    }
  }
  if (pairs.length === 0) return null

  return {
    latest: pairs[pairs.length - 1],
    previous: pairs.length > 1 ? pairs[pairs.length - 2] : null,
  }
}

export type DistrictValueGrowth = {
  /** Annualised rate over the earliest-to-latest span within the lookback window. */
  multiYearRatePercent: number
  spanYears: number
  /** Simple year-over-year change, latest vs. the year before it. */
  lastYearPercent: number | null
}

/** Annualised district growth over the last `lookbackYears` full years of yearly averages. */
export function districtValueGrowth(
  averagePriceByYear: Record<string, number>,
  lookbackYears = 3
): DistrictValueGrowth | null {
  const years = Object.keys(averagePriceByYear)
    .map(Number)
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => a - b)
  if (years.length < 2) return null

  const latestYear = years[years.length - 1]
  const earliestInWindow = years.filter((y) => y > latestYear - lookbackYears - 1)
  const startYear = earliestInWindow[0]
  const spanYears = latestYear - startYear
  if (spanYears <= 0) return null

  const multiYearRatePercent = annualizedGrowthRate(
    averagePriceByYear[String(startYear)],
    averagePriceByYear[String(latestYear)],
    spanYears
  )
  if (multiYearRatePercent === null) return null

  const previousYear = years[years.length - 2]
  const lastYearPercent =
    previousYear === latestYear - 1
      ? ((averagePriceByYear[String(latestYear)] - averagePriceByYear[String(previousYear)]) /
          averagePriceByYear[String(previousYear)]) *
        100
      : null

  return { multiYearRatePercent, spanYears, lastYearPercent }
}
