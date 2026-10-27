import { describe, expect, it } from "vitest"
import { getAdjacentOutcodes } from "./outcode-adjacency"

describe("getAdjacentOutcodes", () => {
  it("returns 2 below and 2 above, ascending", () => {
    expect(getAdjacentOutcodes("SK8")).toEqual(["SK6", "SK7", "SK9", "SK10"])
  })

  it("is case-insensitive and trims whitespace", () => {
    expect(getAdjacentOutcodes(" sk8 ")).toEqual(["SK6", "SK7", "SK9", "SK10"])
  })

  it("drops a would-be non-positive outcode number rather than e.g. SK0 or SK-1", () => {
    expect(getAdjacentOutcodes("SK1")).toEqual(["SK2", "SK3"])
  })

  it("handles a two-letter prefix at the low boundary", () => {
    expect(getAdjacentOutcodes("SK2")).toEqual(["SK1", "SK3", "SK4"])
  })

  it("works for a single-letter outcode prefix", () => {
    expect(getAdjacentOutcodes("W8")).toEqual(["W6", "W7", "W9", "W10"])
  })

  it("respects a custom radius", () => {
    expect(getAdjacentOutcodes("SK8", 1)).toEqual(["SK7", "SK9"])
  })

  it("returns an empty array for an outcode with no trailing number", () => {
    expect(getAdjacentOutcodes("EC1A")).toEqual([])
  })

  it("returns an empty array for an empty or malformed string", () => {
    expect(getAdjacentOutcodes("")).toEqual([])
    expect(getAdjacentOutcodes("12SK")).toEqual([])
  })
})
