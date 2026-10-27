import { describe, expect, it } from "vitest"
import { impliedValue, validateOffer, type OfferEvidence } from "./offer"

const evidence: OfferEvidence = {
  askingPrice: 349_000,
  floorAreaSqm: 94.1,
  comparablePricesPerSqm: [3568, 3233, 3193, 4157, 3302],
  areaPricePerSqm: 3831,
}
const offer = (low: number, high: number, opening: number) => ({ low, high, opening, reasons: ["167 days on the market"] })

describe("impliedValue", () => {
  it("uses the median comparable £/m² × floor area", () => {
    expect(impliedValue(evidence)).toBeCloseTo(3302 * 94.1)
  })
  it("falls back to the area £/m² with fewer than two comparables", () => {
    expect(impliedValue({ ...evidence, comparablePricesPerSqm: [3500] })).toBeCloseTo(3831 * 94.1)
  })
})

describe("validateOffer", () => {
  it("pulls the top and opening down to 95% of asking for a listing over 50 days", () => {
    const stale = { ...evidence, daysOnMarket: 60 }
    expect(validateOffer(offer(320_000, 345_000, 340_000), stale)).toEqual({
      low: 320_000,
      high: 331_000,
      opening: 331_000,
      reasons: ["167 days on the market"],
    })
  })
  it("falls back when capping a stale listing's top leaves no range", () => {
    expect(validateOffer(offer(332_000, 345_000, 335_000), { ...evidence, daysOnMarket: 60 })).toBeNull()
  })
  it("leaves the top alone at 50 days or fewer", () => {
    expect(validateOffer(offer(320_000, 345_000, 340_000), { ...evidence, daysOnMarket: 50 })?.high).toBe(345_000)
  })
  it("accepts a sensible range and rounds it to £1,000", () => {
    expect(validateOffer(offer(318_400, 332_600, 320_200), evidence)).toMatchObject({ low: 318_000, high: 333_000, opening: 320_000 })
  })
  it("rejects a range above the asking price or more than 10% below it", () => {
    expect(validateOffer(offer(330_000, 355_000, 340_000), evidence)).toBeNull()
    expect(validateOffer(offer(300_000, 330_000, 305_000), evidence)).toBeNull() // £300k is 14% below £349k
  })
  it("keeps £1,000 rounding from nudging the low end past the 10% floor", () => {
    // 90% of £349,000 = £314,100: £314,200 would round down to £314,000, so it rounds up instead.
    expect(validateOffer(offer(314_200, 330_000, 314_200), evidence)).toMatchObject({ low: 315_000, opening: 315_000 })
  })
  it("rejects an opening offer outside the range, or a back-to-front range", () => {
    expect(validateOffer(offer(320_000, 335_000, 340_000), evidence)).toBeNull()
    expect(validateOffer(offer(335_000, 320_000, 325_000), evidence)).toBeNull()
  })
  it("rejects a range far from what local £/m² implies", () => {
    // Implied ≈ £311k from comparables; a home asking £600k can't be offered £545k+ on that evidence.
    expect(validateOffer(offer(545_000, 590_000, 550_000), { ...evidence, askingPrice: 600_000 })).toBeNull()
  })
})
