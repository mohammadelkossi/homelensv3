import { describe, expect, it } from "vitest"
import {
  annualizedGrowthRate,
  districtValueGrowth,
  homeValueGrowth,
  recommendedOfferRange,
  sellersGain,
} from "./recommended-offer"

describe("recommendedOfferRange", () => {
  it("widens the discount when multiple negative signals stack up", () => {
    const result = recommendedOfferRange({
      askingPrice: 735_000,
      daysOnMarket: 90,
      premiumOverDistrictPercent: 25,
      sellersGainPercent: 47,
      recentSalesCount: 0,
    })
    expect(result.low).toBeLessThan(result.high)
    expect(result.high).toBeLessThan(735_000)
    expect(result.percentBelowLow).toBeGreaterThan(result.percentBelowHigh)
    expect(result.reasons).toContain("90 days on the market")
    expect(result.reasons).toContain("Asking 25% above the area average")
    expect(result.reasons).toContain("No recent sales in the postcode")
  })

  it("stays close to asking price when no negative signals apply", () => {
    const result = recommendedOfferRange({
      askingPrice: 500_000,
      daysOnMarket: 10,
      premiumOverDistrictPercent: 0,
      sellersGainPercent: 5,
      recentSalesCount: 12,
    })
    expect(result.reasons).toHaveLength(0)
    expect(result.high).toBe(500_000)
    expect(result.low).toBeLessThan(result.high)
  })

  it("never recommends above the asking price", () => {
    const result = recommendedOfferRange({
      askingPrice: 300_000,
      daysOnMarket: null,
      premiumOverDistrictPercent: null,
      sellersGainPercent: null,
      recentSalesCount: null,
    })
    expect(result.high).toBeLessThanOrEqual(300_000)
    expect(result.low).toBeLessThanOrEqual(result.high)
  })

  it("does not apply a premium discount when asking below the district average", () => {
    const result = recommendedOfferRange({
      askingPrice: 400_000,
      daysOnMarket: null,
      premiumOverDistrictPercent: -15,
      sellersGainPercent: null,
      recentSalesCount: null,
    })
    expect(result.reasons.some((r) => r.includes("above the area average"))).toBe(false)
  })

  it("rounds to the nearest £5,000", () => {
    const result = recommendedOfferRange({
      askingPrice: 622_345,
      daysOnMarket: 70,
      premiumOverDistrictPercent: null,
      sellersGainPercent: null,
      recentSalesCount: null,
    })
    expect(result.low % 5000).toBe(0)
    expect(result.high % 5000).toBe(0)
  })

  it("is deterministic for the same input", () => {
    const input = {
      askingPrice: 650_000,
      daysOnMarket: 45,
      premiumOverDistrictPercent: 12,
      sellersGainPercent: 20,
      recentSalesCount: 3,
    }
    expect(recommendedOfferRange(input)).toEqual(recommendedOfferRange(input))
  })
})

describe("sellersGain", () => {
  it("computes amount and percent gain", () => {
    const result = sellersGain(735_000, 500_000)
    expect(result).not.toBeNull()
    expect(result!.amount).toBe(235_000)
    expect(result!.percent).toBeCloseTo(47, 0)
  })

  it("returns null without a last sale price", () => {
    expect(sellersGain(735_000, null)).toBeNull()
  })

  it("returns null for a zero or negative last sale price", () => {
    expect(sellersGain(735_000, 0)).toBeNull()
  })

  it("handles a loss (negative gain)", () => {
    const result = sellersGain(400_000, 500_000)
    expect(result!.amount).toBe(-100_000)
    expect(result!.percent).toBeCloseTo(-20, 0)
  })
})

describe("annualizedGrowthRate", () => {
  it("matches a known CAGR", () => {
    // £345k -> £500k over 5 years ≈ 7.67%/yr
    expect(annualizedGrowthRate(345_000, 500_000, 5)).toBeCloseTo(7.67, 1)
  })

  it("returns null for zero years", () => {
    expect(annualizedGrowthRate(345_000, 500_000, 0)).toBeNull()
  })

  it("returns null for a non-positive starting price", () => {
    expect(annualizedGrowthRate(0, 500_000, 5)).toBeNull()
  })
})

describe("homeValueGrowth", () => {
  it("returns the latest and previous growth periods", () => {
    const result = homeValueGrowth([
      { price: 345_000, year: 2005 },
      { price: 500_000, year: 2010 },
      { price: 735_000, year: 2026 },
    ])
    expect(result).not.toBeNull()
    expect(result!.latest.fromYear).toBe(2010)
    expect(result!.latest.toYear).toBe(2026)
    expect(result!.previous?.fromYear).toBe(2005)
    expect(result!.previous?.toYear).toBe(2010)
  })

  it("returns null previous period with only one pair of sales", () => {
    const result = homeValueGrowth([
      { price: 500_000, year: 2010 },
      { price: 735_000, year: 2026 },
    ])
    expect(result!.previous).toBeNull()
  })

  it("returns null with fewer than 2 sales", () => {
    expect(homeValueGrowth([{ price: 500_000, year: 2010 }])).toBeNull()
  })

  it("sorts unordered input by year before pairing", () => {
    const result = homeValueGrowth([
      { price: 735_000, year: 2026 },
      { price: 345_000, year: 2005 },
      { price: 500_000, year: 2010 },
    ])
    expect(result!.latest.fromYear).toBe(2010)
    expect(result!.latest.toYear).toBe(2026)
  })
})

describe("districtValueGrowth", () => {
  it("computes a multi-year rate and last-year change", () => {
    const result = districtValueGrowth({ "2022": 505_000, "2023": 520_000, "2024": 555_000, "2025": 589_000 })
    expect(result).not.toBeNull()
    expect(result!.spanYears).toBe(3)
    expect(result!.lastYearPercent).toBeCloseTo(6.13, 1)
  })

  it("returns null with fewer than 2 years of data", () => {
    expect(districtValueGrowth({ "2025": 589_000 })).toBeNull()
  })

  it("returns null for lastYearPercent when there's a gap before the latest year", () => {
    const result = districtValueGrowth({ "2022": 500_000, "2023": 520_000, "2025": 589_000 })
    expect(result).not.toBeNull()
    expect(result!.lastYearPercent).toBeNull()
  })
})

describe("recommendedOfferRange 10% cap", () => {
  it("never puts the low end more than 10% below the asking price, even with every signal firing", () => {
    for (const askingPrice of [336_000, 349_000, 735_000, 1_250_000]) {
      const result = recommendedOfferRange({
        askingPrice,
        daysOnMarket: 400,
        premiumOverDistrictPercent: 60,
        sellersGainPercent: 200,
        recentSalesCount: 0,
      })
      expect(result.low).toBeGreaterThanOrEqual(askingPrice * 0.9)
      expect(result.percentBelowLow).toBeLessThanOrEqual(10)
      expect(result.low).toBeLessThan(result.high)
    }
  })
})
