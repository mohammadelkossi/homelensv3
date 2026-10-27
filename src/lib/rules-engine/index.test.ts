import { describe, expect, it } from "vitest"
import { buildKeyPoints } from "./index"
import type { RuleContext } from "./types"

const baseCtx: RuleContext = {
  askingPrice: null,
  propertyType: "Detached",
  outcode: "LS18",
  districtAveragePrice: null,
  districtAverageYear: 2025,
  daysOnMarket: null,
  listedDateLabel: null,
  salesCountPast12Months: null,
  lastSalePrice: null,
  lastSaleYear: null,
  epcRating: null,
  constructionAgeBand: null,
  hasConservationArea: false,
  hasArticle4: false,
  hasFloodRisk: false,
  maxNoiseDb: null,
  bedrooms: "4",
  priceReduced: false,
}

describe("buildKeyPoints", () => {
  it("always returns exactly 3 items per tab, even with minimal data", () => {
    const result = buildKeyPoints(baseCtx)
    expect(result.know).toHaveLength(3)
    expect(result.consider).toHaveLength(3)
    expect(result.ask).toHaveLength(3)
  })

  it("flags asking price well above the district average", () => {
    const ctx: RuleContext = { ...baseCtx, askingPrice: 735000, districtAveragePrice: 589000 }
    const result = buildKeyPoints(ctx)
    expect(result.know[0].title).toContain("25%")
    expect(result.know[0].title).toContain("above")
  })

  it("flags asking price well below the district average", () => {
    const ctx: RuleContext = { ...baseCtx, askingPrice: 400000, districtAveragePrice: 589000 }
    const result = buildKeyPoints(ctx)
    expect(result.know.some((item) => item.title.includes("below"))).toBe(true)
  })

  it("does not flag price difference within 10%", () => {
    const ctx: RuleContext = { ...baseCtx, askingPrice: 600000, districtAveragePrice: 589000 }
    const result = buildKeyPoints(ctx)
    expect(result.know.some((item) => item.id === "know-price-vs-average")).toBe(false)
  })

  it("surfaces conservation area + Article 4 together", () => {
    const ctx: RuleContext = { ...baseCtx, hasConservationArea: true, hasArticle4: true }
    const result = buildKeyPoints(ctx)
    expect(result.know.some((item) => item.title === "Conservation area + Article 4")).toBe(true)
    expect(result.ask.some((item) => item.id === "ask-planning-history")).toBe(true)
  })

  it("prioritises higher-priority rules over fallbacks when more than 3 apply", () => {
    const ctx: RuleContext = {
      ...baseCtx,
      askingPrice: 735000,
      districtAveragePrice: 589000,
      daysOnMarket: 90,
      listedDateLabel: "15 July 2026",
      hasConservationArea: true,
      hasFloodRisk: true,
      salesCountPast12Months: 0,
    }
    const result = buildKeyPoints(ctx)
    expect(result.know).toHaveLength(3)
    expect(result.know.every((item) => !item.id.startsWith("know-fallback"))).toBe(true)
  })

  it("always includes the freehold/leasehold question in Ask the agent", () => {
    const result = buildKeyPoints(baseCtx)
    expect(result.ask.some((item) => item.id === "ask-fallback-tenure")).toBe(true)
  })

  it("flags a poor EPC rating and old construction age band in Consider", () => {
    const ctx: RuleContext = { ...baseCtx, epcRating: "D", constructionAgeBand: "1920-1929" }
    const result = buildKeyPoints(ctx)
    expect(result.consider.some((item) => item.id === "consider-epc-poor")).toBe(true)
    expect(result.consider.some((item) => item.id === "consider-old-build")).toBe(true)
  })

  it("does not flag old-build survey advice for a modern construction band", () => {
    const ctx: RuleContext = { ...baseCtx, constructionAgeBand: "2012 onwards" }
    const result = buildKeyPoints(ctx)
    expect(result.consider.some((item) => item.id === "consider-old-build")).toBe(false)
  })

  it("flags a large seller's gain", () => {
    const ctx: RuleContext = { ...baseCtx, askingPrice: 735000, lastSalePrice: 500000, lastSaleYear: 2010 }
    const result = buildKeyPoints(ctx)
    expect(result.know.some((item) => item.id === "know-sellers-gain")).toBe(true)
  })

  it("selection is deterministic for the same input", () => {
    const ctx: RuleContext = { ...baseCtx, askingPrice: 735000, districtAveragePrice: 589000, daysOnMarket: 90 }
    const a = buildKeyPoints(ctx)
    const b = buildKeyPoints(ctx)
    expect(a).toEqual(b)
  })
})
