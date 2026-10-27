import { describe, expect, it } from "vitest"
import { constructionAgeBandStartYear, constructionAgeBandToRange, epcBandColor } from "./epc"

describe("epcBandColor", () => {
  it("returns the official colour for a known band", () => {
    expect(epcBandColor("D")).toBe("#FFD500")
    expect(epcBandColor("a")).toBe("#008054")
  })

  it("returns null for an unknown or missing band", () => {
    expect(epcBandColor("Z")).toBeNull()
    expect(epcBandColor(null)).toBeNull()
    expect(epcBandColor(undefined)).toBeNull()
  })
})

describe("constructionAgeBandToRange", () => {
  it("maps every standard RdSAP code to its year range", () => {
    expect(constructionAgeBandToRange("A")).toBe("Before 1900")
    expect(constructionAgeBandToRange("B")).toBe("1900–1929")
    expect(constructionAgeBandToRange("C")).toBe("1930–1949")
    expect(constructionAgeBandToRange("D")).toBe("1950–1966")
    expect(constructionAgeBandToRange("E")).toBe("1967–1975")
    expect(constructionAgeBandToRange("F")).toBe("1976–1982")
    expect(constructionAgeBandToRange("G")).toBe("1983–1990")
    expect(constructionAgeBandToRange("H")).toBe("1991–1995")
    expect(constructionAgeBandToRange("I")).toBe("1996–2002")
    expect(constructionAgeBandToRange("J")).toBe("2003–2006")
    expect(constructionAgeBandToRange("K")).toBe("2007–2011")
    expect(constructionAgeBandToRange("L")).toBe("2012 onwards")
  })

  it("is case-insensitive on the code", () => {
    expect(constructionAgeBandToRange("d")).toBe("1950–1966")
  })

  it("passes through a value that isn't a known single-letter code", () => {
    expect(constructionAgeBandToRange("1930-1949")).toBe("1930-1949")
  })

  it("returns null for empty input", () => {
    expect(constructionAgeBandToRange(null)).toBeNull()
    expect(constructionAgeBandToRange(undefined)).toBeNull()
    expect(constructionAgeBandToRange("")).toBeNull()
  })
})

describe("constructionAgeBandStartYear", () => {
  it("extracts the first 4-digit year from a range string", () => {
    expect(constructionAgeBandStartYear("1930–1949")).toBe(1930)
    expect(constructionAgeBandStartYear("2012 onwards")).toBe(2012)
  })

  it("extracts the year even when embedded in prose", () => {
    expect(constructionAgeBandStartYear("Before 1900")).toBe(1900)
  })

  it("returns null when there's no digit at all", () => {
    expect(constructionAgeBandStartYear("Unknown")).toBeNull()
  })

  it("returns null for empty input", () => {
    expect(constructionAgeBandStartYear(null)).toBeNull()
    expect(constructionAgeBandStartYear(undefined)).toBeNull()
  })
})
