import { describe, expect, it } from "vitest"
import { ownedPercent, parseTenureObservations } from "./census-tenure"

// Shape mirrors a real Nomis NM_2072_1 (TS054 - Tenure) response for one LSOA.
function obs(categoryCode: number, value: number) {
  return { c2021_tenure_9: { value: categoryCode }, obs_value: { value } }
}

describe("parseTenureObservations", () => {
  it("parses a full real-shaped response into the breakdown", () => {
    const observations = [
      obs(0, 656), // Total: All households
      obs(1001, 423), // Owned (subtotal, ignored in favour of the two detailed categories)
      obs(1, 173), // Owned: Owns outright
      obs(2, 250), // Owned: Owns with a mortgage or loan
      obs(1002, 1), // Shared ownership (subtotal)
      obs(3, 1), // Shared ownership: Shared ownership
      obs(1003, 91), // Social rented (subtotal)
      obs(4, 79), // Social rented: Rents from council or Local Authority
      obs(5, 12), // Social rented: Other social rented
      obs(1004, 139), // Private rented (subtotal)
      obs(6, 124), // Private rented: Private landlord or letting agency
      obs(7, 15), // Private rented: Other private rented
      obs(8, 2), // Lives rent free
    ]

    expect(parseTenureObservations(observations)).toEqual({
      totalHouseholds: 656,
      ownedOutright: 173,
      ownedWithMortgage: 250,
      sharedOwnership: 1,
      socialRentedCouncil: 79,
      socialRentedOther: 12,
      privateRented: 139, // 124 + 15
      livesRentFree: 2,
    })
  })

  it("defaults a missing category to 0 rather than throwing", () => {
    const result = parseTenureObservations([obs(0, 100), obs(1, 60)])
    expect(result).toEqual({
      totalHouseholds: 100,
      ownedOutright: 60,
      ownedWithMortgage: 0,
      sharedOwnership: 0,
      socialRentedCouncil: 0,
      socialRentedOther: 0,
      privateRented: 0,
      livesRentFree: 0,
    })
  })

  it("returns null when the total households category is missing", () => {
    expect(parseTenureObservations([obs(1, 60)])).toBeNull()
  })

  it("returns null when the total households category is zero", () => {
    expect(parseTenureObservations([obs(0, 0)])).toBeNull()
  })

  it("returns null for an empty observation list", () => {
    expect(parseTenureObservations([])).toBeNull()
  })
})

describe("ownedPercent", () => {
  it("combines owned outright and owned with a mortgage, as a percentage of all households", () => {
    const data = parseTenureObservations([
      obs(0, 656),
      obs(1, 173),
      obs(2, 250),
    ])!
    expect(ownedPercent(data)).toBeCloseTo((173 + 250) / 656 * 100)
  })

  it("matches the real England 2021 figure (~61%)", () => {
    const data = parseTenureObservations([
      obs(0, 23436085),
      obs(1, 7624693),
      obs(2, 6744372),
    ])!
    expect(Math.round(ownedPercent(data))).toBe(61)
  })
})
