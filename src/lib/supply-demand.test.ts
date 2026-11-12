import { describe, expect, it } from "vitest"
import { computeMonthsOfSupply, extractRightmoveId, parseSearchPage } from "./supply-demand"

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

describe("parseSearchPage", () => {
  const page = (searchResults: unknown) =>
    `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { searchResults } } })}</script></html>`

  it("reads the result count and listings from Rightmove's own results page", () => {
    const parsed = parseSearchPage(
      page({
        resultCount: "1,085",
        properties: [
          {
            id: 95354427,
            bedrooms: 3,
            bathrooms: 1,
            displayAddress: "St. Giles Road, Derby",
            propertySubType: "Terraced",
            location: { latitude: 52.9031, longitude: -1.48253 },
            price: { amount: 100000 },
            propertyUrl: "/properties/95354427#/?channel=RES_BUY",
            propertyImages: { mainImageSrc: "https://media.rightmove.co.uk/a.jpeg" },
            displaySize: "1,076 sq. ft.",
          },
          // No price: not a usable listing.
          { id: 1, propertyUrl: "/properties/1", price: {} },
        ],
      })
    )
    expect(parsed?.resultCount).toBe(1085)
    expect(parsed?.listings).toHaveLength(1)
    expect(parsed?.listings[0]).toMatchObject({
      id: "95354427",
      url: "https://www.rightmove.co.uk/properties/95354427",
      price: 100000,
      bedrooms: 3,
      propertyType: "Terraced",
      latitude: 52.9031,
    })
    expect(parsed?.listings[0].areaSqm).toBeCloseTo(99.96, 1)
  })

  it("returns null for a page that isn't a results page, so the caller falls back", () => {
    expect(parseSearchPage("<html>Access denied</html>")).toBeNull()
    expect(parseSearchPage(page({ properties: [] }))).toBeNull()
  })
})
