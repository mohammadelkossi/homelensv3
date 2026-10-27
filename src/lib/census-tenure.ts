// 2021 Census (England & Wales) household tenure, via Nomis's public API — no auth, no
// cost, and the underlying data is a fixed 2021 snapshot so it's safe to cache indefinitely.
// Nomis dataset NM_2072_1 = ONS table TS054 "Tenure", queryable down to LSOA/OA level using
// plain ONS geography codes (unlike the newer api.beta.ons.gov.uk endpoint, whose area filter
// doesn't work reliably as of writing).

const NOMIS_DATASET_ID = "NM_2072_1"
const VALUE_MEASURE = 20100 // Nomis "Value" measure code (vs. percentage/confidence-interval variants)

export type CensusTenureBreakdown = {
  totalHouseholds: number
  ownedOutright: number
  ownedWithMortgage: number
  sharedOwnership: number
  socialRentedCouncil: number
  socialRentedOther: number
  privateRented: number
  livesRentFree: number
}

/** Nomis's `c2021_tenure_9` category codes for TS054 — see the dataset's own category list. */
const TENURE_CATEGORY = {
  TOTAL: 0,
  OWNED_OUTRIGHT: 1,
  OWNED_WITH_MORTGAGE: 2,
  SHARED_OWNERSHIP: 3,
  SOCIAL_RENTED_COUNCIL: 4,
  SOCIAL_RENTED_OTHER: 5,
  PRIVATE_RENTED: 6, // "Private landlord or letting agency" + "Other private rented" (7) combined below
  PRIVATE_RENTED_OTHER: 7,
  LIVES_RENT_FREE: 8,
} as const

type NomisObservation = { c2021_tenure_9: { value: number }; obs_value: { value: number } }

/** Pure parser so the category-code mapping is unit-testable without a network call. */
export function parseTenureObservations(observations: NomisObservation[]): CensusTenureBreakdown | null {
  const valueFor = (categoryCode: number): number | null => {
    const match = observations.find((o) => o.c2021_tenure_9?.value === categoryCode)
    return match ? match.obs_value.value : null
  }

  const totalHouseholds = valueFor(TENURE_CATEGORY.TOTAL)
  if (totalHouseholds === null || totalHouseholds <= 0) return null

  return {
    totalHouseholds,
    ownedOutright: valueFor(TENURE_CATEGORY.OWNED_OUTRIGHT) ?? 0,
    ownedWithMortgage: valueFor(TENURE_CATEGORY.OWNED_WITH_MORTGAGE) ?? 0,
    sharedOwnership: valueFor(TENURE_CATEGORY.SHARED_OWNERSHIP) ?? 0,
    socialRentedCouncil: valueFor(TENURE_CATEGORY.SOCIAL_RENTED_COUNCIL) ?? 0,
    socialRentedOther: valueFor(TENURE_CATEGORY.SOCIAL_RENTED_OTHER) ?? 0,
    privateRented: (valueFor(TENURE_CATEGORY.PRIVATE_RENTED) ?? 0) + (valueFor(TENURE_CATEGORY.PRIVATE_RENTED_OTHER) ?? 0),
    livesRentFree: valueFor(TENURE_CATEGORY.LIVES_RENT_FREE) ?? 0,
  }
}

/** Resolves a full postcode to its 2021 LSOA code via postcodes.io (already used elsewhere in this app for geocoding). */
export async function resolveLsoaForPostcode(postcode: string): Promise<string | null> {
  if (!postcode?.trim()) return null
  try {
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode.trim())}`)
    if (!response.ok) return null
    const json = await response.json()
    return json?.result?.codes?.lsoa21 ?? json?.result?.codes?.lsoa ?? null
  } catch (error) {
    console.error("Error resolving LSOA for postcode:", error)
    return null
  }
}

/** England's own ONS country geography code — used as the "vs England" benchmark. */
export const ENGLAND_GEOGRAPHY_CODE = "E92000001"

/** Census 2021 household tenure breakdown for one geography (an LSOA, or `ENGLAND_GEOGRAPHY_CODE` for the national benchmark), via Nomis. Null if the lookup fails. */
export async function getCensusTenureForGeography(geographyCode: string): Promise<CensusTenureBreakdown | null> {
  try {
    const response = await fetch(
      `https://www.nomisweb.co.uk/api/v01/dataset/${NOMIS_DATASET_ID}.data.json?geography=${encodeURIComponent(geographyCode)}&measures=${VALUE_MEASURE}`
    )
    if (!response.ok) return null
    const json = await response.json()
    const observations: NomisObservation[] | undefined = json?.obs
    if (!observations?.length) return null
    return parseTenureObservations(observations)
  } catch (error) {
    console.error("Error fetching census tenure from Nomis:", error)
    return null
  }
}

/** Share of households that are owner-occupied (owned outright + owned with a mortgage/loan), as a 0-100 percentage. */
export function ownedPercent(data: CensusTenureBreakdown): number {
  return ((data.ownedOutright + data.ownedWithMortgage) / data.totalHouseholds) * 100
}
