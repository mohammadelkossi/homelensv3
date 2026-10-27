import { describe, expect, it } from "vitest"
import { isGrounded, numbersInFindings, numbersInText } from "./verify"

describe("numbersInText", () => {
  it("normalises money, thousands and percentages", () => {
    expect(numbersInText("Asking £349,000, area average £366k, 5% below")).toEqual([349000, 366000, 5])
    expect(numbersInText("94.1 m² and 167 days")).toEqual([94.1, 167])
  })
})

describe("isGrounded", () => {
  const known = numbersInFindings({
    askingPrice: 349000,
    areaAveragePrice: 365594,
    askingVsAreaPercent: -4.5,
    daysOnMarket: 167,
    firstListed: "12 May 2026",
    crime: ["Violent Crime (69)"],
  })

  it("accepts figures from the findings, including rounded forms", () => {
    expect(isGrounded("Asking £349,000 is below the £366k average", known)).toBe(true)
    expect(isGrounded("About 5% below the area, on the market 167 days", known)).toBe(true)
    expect(isGrounded("Listed since 12 May 2026", known)).toBe(true)
    expect(isGrounded("69 violent crimes reported", known)).toBe(true)
  })
  it("allows small counts that needn't appear verbatim", () => {
    expect(isGrounded("Ask these 3 questions", known)).toBe(true)
  })
  it("rejects invented numbers", () => {
    expect(isGrounded("Sold for £280,000 in 2019", known)).toBe(false)
    expect(isGrounded("12% below the area average", known)).toBe(false)
  })
})
