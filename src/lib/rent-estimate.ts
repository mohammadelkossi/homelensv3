/** Estimated monthly rent = (price × adjustedYield) / 12 */

/** Single UK-wide base gross yield (no regional adjustment). */
export const UK_BASE_YIELD = 0.055

const TYPE_MULTIPLIER: Record<string, number> = {
  flat: 1.12,
  terraced: 1.02,
  "semi-detached": 0.97,
  detached: 0.85,
}

const BEDROOM_MULTIPLIER: Record<number, number> = {
  1: 1.15,
  2: 1.05,
  3: 1.0,
  4: 0.9,
  5: 0.82,
}

export type RentEstimate = {
  estimate: number
  low: number
  high: number
  adjustedYield: number
}

export function normalizePropertyTypeForRent(propertyType?: string | null): string | undefined {
  if (!propertyType) return undefined
  const normalized = propertyType.trim().toLowerCase()
  if (!normalized || normalized === "n/a") return undefined
  if (
    normalized.includes("flat") ||
    normalized.includes("apartment") ||
    normalized.includes("maisonette")
  ) {
    return "flat"
  }
  if (normalized.includes("semi")) return "semi-detached"
  if (normalized.includes("terrace") || normalized.includes("townhouse")) return "terraced"
  if (
    normalized.includes("detached") ||
    normalized.includes("bungalow") ||
    normalized.includes("cottage")
  ) {
    return "detached"
  }
  return undefined
}

function roundTo25(value: number): number {
  return Math.round(value / 25) * 25
}

export function estimateMonthlyRent(
  price: number,
  propertyType?: string,
  bedrooms?: number
): RentEstimate {
  const typeKey = propertyType ? propertyType.toLowerCase() : undefined
  const typeAdj = typeKey ? TYPE_MULTIPLIER[typeKey] ?? 1.0 : 1.0
  const bedAdj =
    bedrooms && bedrooms > 0
      ? BEDROOM_MULTIPLIER[Math.min(bedrooms, 5)] ?? 1.0
      : 1.0

  const adjustedYield = UK_BASE_YIELD * typeAdj * bedAdj
  const monthly = (price * adjustedYield) / 12

  return {
    estimate: roundTo25(monthly),
    low: roundTo25(monthly * 0.85),
    high: roundTo25(monthly * 1.15),
    adjustedYield,
  }
}

export function parseListingPrice(price: unknown): number | null {
  if (typeof price === "number" && Number.isFinite(price) && price > 0) return price
  if (typeof price !== "string") return null
  const cleaned = price.replace(/[£,\s]/g, "")
  const value = Number(cleaned)
  return Number.isFinite(value) && value > 0 ? value : null
}
