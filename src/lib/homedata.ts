const HOMEDATA_BASE = "https://api.homedata.co.uk/api"
const REQUEST_TIMEOUT_MS = 12_000

function getHomedataApiKey(): string {
  const key = process.env.HOMEDATA_API_KEY
  if (!key) throw new Error("HOMEDATA_API_KEY is not configured")
  return key
}

async function homedataFetch<T>(
  path: string,
  searchParams?: Record<string, string>,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<T> {
  const url = new URL(`${HOMEDATA_BASE}${path}`)
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      if (v) url.searchParams.set(k, v)
    }
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Api-Key ${getHomedataApiKey()}` },
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Homedata ${path} failed (${response.status}): ${body.slice(0, 200)}`)
  }

  return response.json() as Promise<T>
}

export type HomedataAddressSuggestion = {
  uprn: number
  address: string
  postcode: string
  town?: string
  address_line_1?: string
  building_number?: string
  building_name?: string
  sub_building?: string
}

type AddressFindResponse = {
  suggestions?: HomedataAddressSuggestion[]
  results?: HomedataAddressSuggestion[]
  data?: HomedataAddressSuggestion[]
}

export async function searchAddresses(query: string): Promise<HomedataAddressSuggestion[]> {
  const data = await homedataFetch<AddressFindResponse>("/address/find/", { q: query })
  return data.suggestions ?? data.results ?? data.data ?? []
}

/** UK postcode pattern (outward + inward). */
export function extractUkPostcode(text: string | null | undefined): string | null {
  if (!text) return null
  const match = text.match(/\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i)
  if (!match) return null
  const raw = match[1].toUpperCase().replace(/\s+/g, "")
  if (raw.length < 5) return null
  return `${raw.slice(0, -3)} ${raw.slice(-3)}`
}

export function normalizeUkPostcode(postcode: string | null | undefined): string | null {
  if (!postcode?.trim()) return null
  const extracted = extractUkPostcode(postcode) ?? extractUkPostcode(postcode.replace(/\s+/g, ""))
  return extracted
}

export type HomedataProperty = {
  uprn?: number
  full_address?: string
  address?: string
  address_line_1?: string
  postcode?: string
  property_type?: string
  bedrooms?: number | null
  predicted_bedrooms?: number | null
  council_tax_band?: string | null
  current_energy_efficiency?: number | null
  current_energy_rating?: string | null
  energy_consumption_kwh?: number | null
  epc_floor_area?: number | null
  predicted_floor_area?: number | null
  internal_area_sqm?: number | null
  last_sold_price?: number | null
  building_number?: string
  building_name?: string
  sub_building?: string
}

type PropertyResponse = HomedataProperty | { data: HomedataProperty }

export async function getPropertyRecord(uprn: string): Promise<HomedataProperty> {
  const data = await homedataFetch<PropertyResponse>(`/properties/${uprn}`)
  if ("data" in data && data.data) return data.data
  return data as HomedataProperty
}

export async function getAddressRetrieve(
  uprn: string,
  level: "address" | "property" = "property"
): Promise<HomedataProperty> {
  return homedataFetch<HomedataProperty>(`/address/retrieve/${uprn}/`, { level })
}

/** Merges retrieve + properties endpoints for the richest available record. */
export async function getPropertyDetails(
  uprn: string,
  hint?: { postcode?: string | null; address?: string | null }
): Promise<HomedataProperty> {
  const [retrieveProperty, retrieveAddress, record] = await Promise.all([
    getAddressRetrieve(uprn, "property").catch(() => null),
    getAddressRetrieve(uprn, "address").catch(() => null),
    getPropertyRecord(uprn).catch(() => null),
  ])

  const retrieve = { ...(retrieveAddress ?? {}), ...(retrieveProperty ?? {}) }

  const postcode =
    normalizeUkPostcode(hint?.postcode) ??
    normalizeUkPostcode(retrieve.postcode) ??
    normalizeUkPostcode(record?.postcode) ??
    extractUkPostcode(retrieve.full_address ?? retrieve.address) ??
    extractUkPostcode(record?.full_address ?? record?.address) ??
    extractUkPostcode(hint?.address) ??
    undefined

  return {
    ...(record ?? {}),
    ...retrieve,
    postcode,
    uprn: retrieve.uprn ?? record?.uprn,
    full_address:
      retrieve.full_address ??
      record?.full_address ??
      retrieve.address ??
      record?.address ??
      hint?.address ??
      undefined,
    bedrooms: retrieve.bedrooms ?? record?.bedrooms ?? retrieve.predicted_bedrooms ?? null,
    epc_floor_area:
      record?.epc_floor_area ??
      retrieve.epc_floor_area ??
      retrieve.predicted_floor_area ??
      null,
    current_energy_efficiency:
      record?.current_energy_efficiency ?? retrieve.current_energy_efficiency ?? null,
    council_tax_band: record?.council_tax_band ?? retrieve.council_tax_band ?? null,
    building_number: retrieve.building_number ?? record?.building_number,
    building_name: retrieve.building_name ?? record?.building_name,
    sub_building: retrieve.sub_building ?? record?.sub_building,
  }
}

export type HomedataEpc = {
  current_energy_efficiency?: number | null
  potential_energy_efficiency?: number | null
  energy_consumption_kwh?: number | null
  epc_floor_area?: number | null
  last_epc_date?: string | null
  construction_age_band?: string | null
}

export async function getEpc(uprn: string): Promise<HomedataEpc | null> {
  try {
    return await homedataFetch<HomedataEpc>(`/epc-checker/${uprn}/`, undefined, 8_000)
  } catch {
    return null
  }
}

export type HomedataCouncilTax = {
  council_tax_band?: string
  full_address?: string
  address?: string
  local_authority?: string
}

export async function getCouncilTaxBand(params: {
  postcode: string
  building_number?: string
  building_name?: string
}): Promise<HomedataCouncilTax | null> {
  try {
    return await homedataFetch<HomedataCouncilTax>(
      "/council_tax_band/",
      {
        postcode: params.postcode,
        ...(params.building_number ? { building_number: params.building_number } : {}),
        ...(params.building_name ? { building_name: params.building_name } : {}),
      },
      8_000
    )
  } catch {
    return null
  }
}

export type HomedataPostcodeProfile = {
  council_tax?: {
    dominant_band?: string
    annual_charge_pence?: number
    local_authority?: string
  }
}

export async function getPostcodeProfile(postcode: string): Promise<HomedataPostcodeProfile | null> {
  try {
    return await homedataFetch<HomedataPostcodeProfile>("/postcode-profile", { postcode }, 8_000)
  } catch {
    return null
  }
}
