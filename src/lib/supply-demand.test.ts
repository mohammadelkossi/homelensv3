import { describe, expect, it } from "vitest"
import { computeMonthsOfSupply, extractRightmoveId } from "./supply-demand"

describe("computeMonthsOfSupply", () => {
  it("labels under 4 months as a Seller's market", () => {
    const result = computeMonthsOfSupply(6, 24) // 2/month -> 3 months of supply
    expect(result?.monthsOfSupply).toBeCloseTo(3)
    expect(result?.label).toBe("Seller's")
  })

  it("labels 4 to 6 months as Balanced, inclusive of both ends", () => {
    expect(computeMonthsOfSupply(4, 12)?.label).toBe("Balanced") // 1/month -> exactly 4
    expect(computeMonthsOfSupply(6, 12)?.label).toBe("Balanced") // 1/month -> exactly 6
    expect(computeMonthsOfSupply(5, 12)?.label).toBe("Balanced")
  })

  it("labels over 6 months as a Buyer's market", () => {
    const result = computeMonthsOfSupply(20, 24) // 2/month -> 10 months of supply
    expect(result?.monthsOfSupply).toBeCloseTo(10)
    expect(result?.label).toBe("Buyer's")
  })

  it("returns the inputs alongside the computed months of supply", () => {
    const result = computeMonthsOfSupply(6, 24)
    expect(result).toEqual({ forSaleCount: 6, salesPerYear: 24, monthsOfSupply: 3, label: "Seller's" })
  })

  it("returns null when there are no sales to divide by", () => {
    expect(computeMonthsOfSupply(6, 0)).toBeNull()
  })

  it("returns null for a negative sales rate", () => {
    expect(computeMonthsOfSupply(6, -1)).toBeNull()
  })

  it("returns null for a negative for-sale count", () => {
    expect(computeMonthsOfSupply(-1, 12)).toBeNull()
  })

  it("handles zero for-sale stock as 0 months of supply (Seller's market)", () => {
    const result = computeMonthsOfSupply(0, 12)
    expect(result?.monthsOfSupply).toBe(0)
    expect(result?.label).toBe("Seller's")
  })
})

describe("extractRightmoveId", () => {
  it("pulls the numeric id out of a full listing URL", () => {
    expect(extractRightmoveId("https://www.rightmove.co.uk/properties/93251334#/?channel=RES_BUY")).toBe("93251334")
  })

  it("works without a trailing fragment", () => {
    expect(extractRightmoveId("https://www.rightmove.co.uk/properties/93251334")).toBe("93251334")
  })

  it("returns null for a URL with no /properties/<id> segment", () => {
    expect(extractRightmoveId("https://www.rightmove.co.uk/property-for-sale/find.html?locationIdentifier=OUTCODE%5E1534")).toBeNull()
  })

  it("returns null for null or undefined input", () => {
    expect(extractRightmoveId(null)).toBeNull()
    expect(extractRightmoveId(undefined)).toBeNull()
  })
})
