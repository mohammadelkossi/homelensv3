import { createClient } from "@supabase/supabase-js"
import { ApifyClient } from "apify-client"
import type { PropertyTypeCode } from "@/lib/property-type"
import { getDistrictSalesTrend } from "@/lib/district-comparison"
import { calculateDistanceKm } from "@/lib/nearby-amenities"

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const MAX_LISTINGS_TO_COUNT = 500
const APIFY_POLL_INTERVAL_MS = 1000
const APIFY_MAX_POLL_ATTEMPTS = 45

/** Rightmove's `propertyTypes` search filter value for each Land Registry type code. `O` has no single Rightmove equivalent, so it searches every type. */
const RIGHTMOVE_PROPERTY_TYPE: Record<PropertyTypeCode, string | null> = {
  D: "detached",
  S: "semi-detached",
  T: "terraced",
  F: "flat",
  O: null,
}

export type SupplyDemandStats = {
  forSaleCount: number
  salesPerYear: number
  monthsOfSupply: number
  label: "Seller's" | "Balanced" | "Buyer's"
}

const SQFT_TO_SQM = 0.092903

export type ForSaleListing = {
  id: string
  url: string
  address: string
  price: number
  bedrooms: number | null
  bathrooms: number | null
  propertyType: string | null
  latitude: number | null
  longitude: number | null
  imageUrl: string | null
  areaSqm: number | null
}

function supplyLabel(monthsOfSupply: number): SupplyDemandStats["label"] {
  if (monthsOfSupply < 4) return "Seller's"
  if (monthsOfSupply <= 6) return "Balanced"
  return "Buyer's"
}

/** Pure months-of-supply calc: for-sale stock ÷ sales per month. Null for a non-positive sales rate (can't divide by it) or negative input. */
export function computeMonthsOfSupply(forSaleCount: number, salesPerYear: number): SupplyDemandStats | null {
  if (forSaleCount < 0 || salesPerYear <= 0) return null
  const monthsOfSupply = forSaleCount / (salesPerYear / 12)
  if (!Number.isFinite(monthsOfSupply)) return null
  return { forSaleCount, salesPerYear, monthsOfSupply, label: supplyLabel(monthsOfSupply) }
}

type RightmoveTypeaheadMatch = { id: string; type: string; displayName: string }

/** Resolves an outcode (e.g. "LS18") to Rightmove's internal `OUTCODE^<id>` location identifier via their public typeahead endpoint. */
async function resolveOutcodeLocationIdentifier(outcode: string): Promise<string | null> {
  try {
    const response = await fetch(`https://los.rightmove.co.uk/typeahead?query=${encodeURIComponent(outcode)}&limit=5`)
    if (!response.ok) return null
    const json = await response.json()
    const matches: RightmoveTypeaheadMatch[] = json?.matches ?? []
    const match = matches.find((m) => m.type === "OUTCODE" && m.displayName?.toUpperCase() === outcode.toUpperCase())
    return match ? `OUTCODE^${match.id}` : null
  } catch (error) {
    console.error("Error resolving Rightmove outcode identifier:", error)
    return null
  }
}

function buildSearchUrl(locationIdentifier: string, rightmoveType: string | null): string {
  const params = new URLSearchParams({ searchType: "SALE", locationIdentifier, includeSSTC: "false" })
  if (rightmoveType) params.set("propertyTypes", rightmoveType)
  return `https://www.rightmove.co.uk/property-for-sale/find.html?${params.toString()}`
}

/** Extracts the numeric Rightmove property id from a listing URL (e.g. ".../properties/93251334#/..." -> "93251334"), to match a search result against the subject property and exclude it from "nearby for sale" results. */
export function extractRightmoveId(url: string | null | undefined): string | null {
  if (!url) return null
  return url.match(/\/properties\/(\d+)/)?.[1] ?? null
}

// Search-mode results give this as a formatted string (e.g. "2,106 sq. ft."), unlike the
// full-detail scrape elsewhere in the codebase where it's already a plain number.
function parseSqFeet(value: unknown): number | null {
  if (typeof value === "number") return value
  if (typeof value !== "string") return null
  // Match the leading number only — naively stripping non-digits would also keep the
  // periods in "sq. ft.", turning e.g. "2,106 sq. ft." into an unparseable "2106..".
  const match = value.trim().match(/^[\d,]+(\.\d+)?/)
  if (!match) return null
  const parsed = Number(match[0].replace(/,/g, ""))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function parseListing(item: Record<string, unknown>): ForSaleListing | null {
  const id = typeof item.id === "string" ? item.id : typeof item.id === "number" ? String(item.id) : null
  const url = typeof item.url === "string" ? item.url : null
  const price = typeof item.price === "number" ? item.price : null
  if (!id || !url || price === null) return null

  const coordinates = item.coordinates as { latitude?: unknown; longitude?: unknown } | undefined
  const images = item.images as unknown[] | undefined
  const sizeSqFeet = parseSqFeet(item.sizeSqFeetMin) ?? parseSqFeet(item.sizeSqFeetMax)

  return {
    id,
    url,
    address: typeof item.displayAddress === "string" ? item.displayAddress : "Address unavailable",
    price,
    bedrooms: typeof item.bedrooms === "number" ? item.bedrooms : null,
    bathrooms: typeof item.bathrooms === "number" ? item.bathrooms : null,
    propertyType: typeof item.propertyType === "string" ? item.propertyType : null,
    latitude: typeof coordinates?.latitude === "number" ? coordinates.latitude : null,
    longitude: typeof coordinates?.longitude === "number" ? coordinates.longitude : null,
    imageUrl: Array.isArray(images) && typeof images[0] === "string" ? (images[0] as string) : null,
    areaSqm: sizeSqFeet !== null ? sizeSqFeet * SQFT_TO_SQM : null,
  }
}

const RIGHTMOVE_RESULTS_PER_PAGE = 24
const DIRECT_FETCH_TIMEOUT_MS = 8000
const DIRECT_FETCH_CONCURRENCY = 4
/** Accept the direct read only if it found at least this share of the listings Rightmove says exist. */
const DIRECT_MIN_COVERAGE = 0.9

type RightmoveSearchPage = { resultCount: number; listings: ForSaleListing[] }

/** A search result as Rightmove's own results page embeds it (a different shape from the Apify actor's output). */
export function parseSearchPageListing(item: Record<string, unknown>): ForSaleListing | null {
  const id = typeof item.id === "number" || typeof item.id === "string" ? String(item.id) : null
  const price = (item.price as { amount?: unknown } | undefined)?.amount
  const path = typeof item.propertyUrl === "string" ? item.propertyUrl : null
  if (!id || typeof price !== "number" || !path) return null

  const location = item.location as { latitude?: unknown; longitude?: unknown } | undefined
  const imageUrl = (item.propertyImages as { mainImageSrc?: unknown } | undefined)?.mainImageSrc
  const sizeSqFeet = parseSqFeet(item.displaySize)
  return {
    id,
    url: `https://www.rightmove.co.uk/properties/${id}`,
    address: typeof item.displayAddress === "string" ? item.displayAddress : "Address unavailable",
    price,
    bedrooms: typeof item.bedrooms === "number" ? item.bedrooms : null,
    bathrooms: typeof item.bathrooms === "number" ? item.bathrooms : null,
    propertyType: typeof item.propertySubType === "string" ? item.propertySubType : null,
    latitude: typeof location?.latitude === "number" ? location.latitude : null,
    longitude: typeof location?.longitude === "number" ? location.longitude : null,
    imageUrl: typeof imageUrl === "string" ? imageUrl : null,
    areaSqm: sizeSqFeet !== null ? sizeSqFeet * SQFT_TO_SQM : null,
  }
}

/** Reads the result count and listings out of a Rightmove search results page's embedded `__NEXT_DATA__`. Null if the page isn't in the expected shape. */
export function parseSearchPage(html: string): RightmoveSearchPage | null {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!match) return null
  try {
    const results = JSON.parse(match[1])?.props?.pageProps?.searchResults
    // A missing count must not read as "nothing for sale": Number("") is 0.
    const rawCount = String(results?.resultCount ?? "").replace(/,/g, "").trim()
    const resultCount = rawCount === "" ? NaN : Number(rawCount)
    if (!Number.isFinite(resultCount) || !Array.isArray(results?.properties)) return null
    const listings = (results.properties as Record<string, unknown>[])
      .map(parseSearchPageListing)
      .filter((l): l is ForSaleListing => l !== null)
    return { resultCount, listings }
  } catch {
    return null
  }
}

async function fetchSearchPage(searchUrl: string, index: number): Promise<RightmoveSearchPage | null> {
  try {
    const response = await fetch(`${searchUrl}&index=${index}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        "Accept-Language": "en-GB,en;q=0.9",
      },
      signal: AbortSignal.timeout(DIRECT_FETCH_TIMEOUT_MS),
      cache: "no-store",
    })
    if (!response.ok) return null
    return parseSearchPage(await response.text())
  } catch {
    return null
  }
}

/**
 * Current for-sale listings read straight from Rightmove's own search results pages,
 * which costs nothing. The Apify search below bills per listing returned, and was 95%
 * of the Apify bill (Nov 2026 audit). Null if Rightmove blocks the request or too many
 * pages fail, in which case the caller falls back to Apify.
 */
async function fetchForSaleListingsDirect(searchUrl: string): Promise<ForSaleListing[] | null> {
  const first = await fetchSearchPage(searchUrl, 0)
  if (!first) return null

  const expected = Math.min(first.resultCount, MAX_LISTINGS_TO_COUNT)
  const listings = [...first.listings]
  const indexes: number[] = []
  for (let index = RIGHTMOVE_RESULTS_PER_PAGE; index < expected; index += RIGHTMOVE_RESULTS_PER_PAGE) indexes.push(index)
  for (let i = 0; i < indexes.length; i += DIRECT_FETCH_CONCURRENCY) {
    const pages = await Promise.all(indexes.slice(i, i + DIRECT_FETCH_CONCURRENCY).map((index) => fetchSearchPage(searchUrl, index)))
    for (const page of pages) if (page) listings.push(...page.listings)
  }

  const unique = uniqueById(listings).slice(0, MAX_LISTINGS_TO_COUNT)
  if (unique.length < expected * DIRECT_MIN_COVERAGE) {
    console.warn(`Direct Rightmove search found ${unique.length} of ${expected} listings; falling back to Apify`)
    return null
  }
  return unique
}

/** Current for-sale listings for a district + property type, via a live Apify Rightmove search (not cached here — see `getForSaleListings`). */
async function fetchForSaleListingsFromApify(searchUrl: string): Promise<ForSaleListing[] | null> {
  if (!process.env.APIFY_API_TOKEN) return null

  try {
    const apifyClient = new ApifyClient({ token: process.env.APIFY_API_TOKEN })
    const run = await apifyClient.actor("dhrumil~rightmove-scraper").start({
      listUrls: [{ url: searchUrl }],
      fullPropertyDetails: false,
      includePriceHistory: false,
      includeNearestSchools: false,
      monitoringMode: false,
      maxProperties: MAX_LISTINGS_TO_COUNT,
    })

    let runFinished = false
    let attempts = 0
    while (!runFinished && attempts < APIFY_MAX_POLL_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, APIFY_POLL_INTERVAL_MS))
      const runInfo = await apifyClient.run(run.id).get()
      if (!runInfo) return null
      if (runInfo.status === "SUCCEEDED") {
        runFinished = true
      } else if (["FAILED", "ABORTED", "TIMED-OUT"].includes(runInfo.status)) {
        return null
      }
      attempts++
    }
    if (!runFinished) return null

    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems()
    if (!items) return null
    return items.map((item) => parseListing(item as Record<string, unknown>)).filter((l): l is ForSaleListing => l !== null)
  } catch (error) {
    console.error("Error fetching for-sale listings from Apify:", error)
    return null
  }
}

/**
 * Backfills floor area for a handful of specific listings via a full-detail Apify scrape.
 * Rightmove's search results (used by `fetchForSaleListingsFromApify` above) never include
 * floor area at all, regardless of whether the listing itself has it — only a per-property
 * full-detail scrape does. Deliberately only called for the few listings actually rendered
 * (not the full up-to-500 set used for the supply/demand count), to keep this cheap.
 */
export async function fetchFloorAreasForListings(urls: string[]): Promise<Map<string, number | null>> {
  const result = new Map<string, number | null>()
  if (urls.length === 0 || !process.env.APIFY_API_TOKEN) return result

  try {
    const apifyClient = new ApifyClient({ token: process.env.APIFY_API_TOKEN })
    const run = await apifyClient.actor("dhrumil~rightmove-scraper").start({
      propertyUrls: urls.map((url) => ({ url })),
      fullPropertyDetails: true,
      includePriceHistory: false,
      includeNearestSchools: false,
      monitoringMode: false,
      maxProperties: urls.length,
    })

    let runFinished = false
    let attempts = 0
    while (!runFinished && attempts < APIFY_MAX_POLL_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, APIFY_POLL_INTERVAL_MS))
      const runInfo = await apifyClient.run(run.id).get()
      if (!runInfo) return result
      if (runInfo.status === "SUCCEEDED") {
        runFinished = true
      } else if (["FAILED", "ABORTED", "TIMED-OUT"].includes(runInfo.status)) {
        return result
      }
      attempts++
    }
    if (!runFinished) return result

    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems()
    for (const item of items ?? []) {
      const rec = item as Record<string, unknown>
      const id = typeof rec.id === "string" ? rec.id : typeof rec.id === "number" ? String(rec.id) : null
      if (!id) continue
      const sizeSqFeet = parseSqFeet(rec.sizeSqFeetMin) ?? parseSqFeet(rec.sizeSqFeetMax)
      result.set(id, sizeSqFeet !== null ? sizeSqFeet * SQFT_TO_SQM : null)
    }
    return result
  } catch (error) {
    console.error("Error backfilling floor areas from Apify:", error)
    return result
  }
}

/** `property_type` cache key: 'ALL' for the widened fallback (which also drops the Rightmove type filter), otherwise the Land Registry code. */
function cacheKeyFor(propertyTypeCode: PropertyTypeCode, widened: boolean): string {
  return widened ? "ALL" : propertyTypeCode
}

async function getCachedListings(outcode: string, cacheKey: string): Promise<ForSaleListing[] | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { data } = await supabase
    .from("district_supply_cache")
    .select("listings, fetched_at")
    .eq("outcode", outcode)
    .eq("property_type", cacheKey)
    .maybeSingle()
  if (!data || !data.listings) return null // no row, or an older cache entry from before listings were stored
  const age = Date.now() - new Date(data.fetched_at as string).getTime()
  if (age > CACHE_TTL_MS) return null
  return data.listings as ForSaleListing[]
}

async function storeListings(outcode: string, cacheKey: string, listings: ForSaleListing[]): Promise<void> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { error } = await supabase
    .from("district_supply_cache")
    .upsert({ outcode, property_type: cacheKey, for_sale_count: listings.length, listings, fetched_at: new Date().toISOString() })
  if (error) console.error("Error caching for-sale listings:", error)
}

/** Current for-sale listings for a district + property type, cached 24h per (outcode, type). Null if nothing cached and both live searches fail. */
export async function getForSaleListings(
  outcode: string,
  propertyTypeCode: PropertyTypeCode,
  widened: boolean
): Promise<ForSaleListing[] | null> {
  const cacheKey = cacheKeyFor(propertyTypeCode, widened)
  const cached = await getCachedListings(outcode, cacheKey)
  if (cached !== null) return uniqueById(cached)

  const rightmoveType = widened ? null : RIGHTMOVE_PROPERTY_TYPE[propertyTypeCode]
  const locationIdentifier = await resolveOutcodeLocationIdentifier(outcode)
  if (!locationIdentifier) return null
  const searchUrl = buildSearchUrl(locationIdentifier, rightmoveType)
  // Free direct read first; the paid Apify search only if Rightmove won't answer.
  const fresh = (await fetchForSaleListingsDirect(searchUrl)) ?? (await fetchForSaleListingsFromApify(searchUrl))
  if (fresh === null) return null

  const unique = uniqueById(fresh)
  await storeListings(outcode, cacheKey, unique)
  return unique
}

// Rightmove repeats featured listings on every results page, so a multi-page search
// returns the same property several times — which would inflate the for-sale count.
// Also applied to cached rows written before this dedupe existed.
function uniqueById(listings: ForSaleListing[]): ForSaleListing[] {
  return [...new Map(listings.map((l) => [l.id, l])).values()]
}

const MIN_SALES_SAMPLE = 10
const NEAREST_FOR_SALE_COUNT = 5

export type SupplyDemandReport = {
  supplyDemand: (SupplyDemandStats & { widened: boolean }) | null
  nearestForSale: (ForSaleListing & { distanceKm: number })[]
}

/**
 * §02's supply & demand card plus the nearest homes currently for sale. Shared by
 * /api/supply-demand (the website) and the Claude/ChatGPT connector.
 */
export async function getSupplyDemandReport(input: {
  outcode: string
  propertyTypeCode: PropertyTypeCode
  latitude: number | null
  longitude: number | null
  /** The report's own listing, left out of "nearest for sale". */
  subjectRightmoveUrl: string | null
  effectiveToday: Date
}): Promise<SupplyDemandReport> {
  const { outcode, propertyTypeCode, latitude, longitude, effectiveToday } = input
  const empty: SupplyDemandReport = { supplyDemand: null, nearestForSale: [] }
  const subjectId = extractRightmoveId(input.subjectRightmoveUrl)

  const typeTrend = await getDistrictSalesTrend(outcode, propertyTypeCode, effectiveToday)
  if (!typeTrend) return empty

  let salesPerYear = typeTrend.currentCount
  let widened = false
  if (salesPerYear < MIN_SALES_SAMPLE) {
    const allTypesTrend = await getDistrictSalesTrend(outcode, null, effectiveToday)
    if (allTypesTrend && allTypesTrend.currentCount > salesPerYear) {
      salesPerYear = allTypesTrend.currentCount
      widened = true
    }
  }

  const listings = await getForSaleListings(outcode, propertyTypeCode, widened)
  // Both searches failed and nothing was cached: hide the card rather than guess.
  if (listings === null) return empty

  const stats = computeMonthsOfSupply(listings.length, salesPerYear)

  let nearestForSale: SupplyDemandReport["nearestForSale"] = []
  if (latitude !== null && longitude !== null && Number.isFinite(latitude) && Number.isFinite(longitude)) {
    nearestForSale = listings
      .filter((l) => l.id !== subjectId && l.latitude !== null && l.longitude !== null)
      .map((l) => ({ ...l, distanceKm: calculateDistanceKm(latitude, longitude, l.latitude as number, l.longitude as number) }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, NEAREST_FOR_SALE_COUNT)
  }

  // Only the nearest few that still lack a floor area go to the paid full-detail scrape.
  const missingArea = nearestForSale.filter((l) => l.areaSqm === null)
  if (missingArea.length > 0) {
    const floorAreas = await fetchFloorAreasForListings(missingArea.map((l) => l.url))
    nearestForSale = nearestForSale.map((l) =>
      l.areaSqm === null && floorAreas.has(l.id) ? { ...l, areaSqm: floorAreas.get(l.id) ?? null } : l
    )
  }

  return { supplyDemand: stats ? { ...stats, widened } : null, nearestForSale }
}
