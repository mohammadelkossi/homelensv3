import { createClient } from "@supabase/supabase-js"
import { calculateDistanceKm } from "@/lib/nearby-amenities"
import type { PropertyTypeCode } from "@/lib/property-type"
import { getAdjacentOutcodes } from "@/lib/outcode-adjacency"
import { resolveFloorAreasForSales, type LandRegistrySale } from "@/lib/epc-register"

export type YearlyPrice = { year: number; avgPrice: number; saleCount: number }
export type DistrictYearlyData = { outcode: string; yearly: YearlyPrice[] }

/** Average sold price per year for one district + property type, over the last ~5 years (whatever `get_average_price_by_year` returns — no sale-count filtering). */
export async function getAveragePriceByYearForDistrict(
  outcode: string,
  propertyTypeCode: PropertyTypeCode
): Promise<YearlyPrice[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return []

  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { data, error } = await supabase.rpc("get_average_price_by_year", {
      p_outcode: outcode,
      p_property_type: propertyTypeCode,
    })
    if (error || !data) {
      console.error("get_average_price_by_year RPC error:", error)
      return []
    }
    return (data as { year: number; avg_price: number | string; sale_count: number | string }[])
      .map((row) => ({ year: row.year, avgPrice: Number(row.avg_price), saleCount: Number(row.sale_count) }))
      .sort((a, b) => a.year - b.year)
  } catch (error) {
    console.error("Error fetching average price by year:", error)
    return []
  }
}

export type DistrictSalesTrend = {
  currentCount: number
  previousCount: number
  changePercent: number | null
}

const LAG_MONTHS = 3
const WINDOW_MONTHS = 12

/**
 * Sales in the last 12 months vs. the previous 12, for one district + property type
 * (or every type, when `propertyTypeCode` is null — used to widen the sample when a
 * single type has too few sales to be meaningful, e.g. for the supply & demand calc).
 * Land Registry lags ~2-3 months behind real time, so both windows end 3 months ago
 * rather than today — a window ending "today" would always undercount the most
 * recent months and look like a fake slowdown.
 */
export async function getDistrictSalesTrend(
  outcode: string,
  propertyTypeCode: PropertyTypeCode | null,
  effectiveToday: Date
): Promise<DistrictSalesTrend | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null

  const currentEnd = new Date(effectiveToday)
  currentEnd.setMonth(currentEnd.getMonth() - LAG_MONTHS)
  const currentStart = new Date(currentEnd)
  currentStart.setMonth(currentStart.getMonth() - WINDOW_MONTHS)
  const previousEnd = new Date(currentStart)
  const previousStart = new Date(previousEnd)
  previousStart.setMonth(previousStart.getMonth() - WINDOW_MONTHS)

  const toDateString = (d: Date) => d.toISOString().split("T")[0]

  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { data, error } = await supabase.rpc("get_district_sales_trend", {
      p_outcode: outcode,
      p_property_type: propertyTypeCode,
      p_current_start: toDateString(currentStart),
      p_current_end: toDateString(currentEnd),
      p_previous_start: toDateString(previousStart),
      p_previous_end: toDateString(previousEnd),
    })
    if (error || !data?.[0]) {
      console.error("get_district_sales_trend RPC error:", error)
      return null
    }
    const currentCount = Number(data[0].current_count)
    const previousCount = Number(data[0].previous_count)
    return {
      currentCount,
      previousCount,
      changePercent: previousCount > 0 ? ((currentCount - previousCount) / previousCount) * 100 : null,
    }
  } catch (error) {
    console.error("Error fetching district sales trend:", error)
    return null
  }
}

export type NearbySale = {
  address: string
  postcode: string
  price: number
  dateOfTransfer: string
  distanceKm: number | null
  areaSqm: number | null
}

const RECENT_SALES_YEARS_BACK = 2
const NEARBY_SALES_COUNT = 5
const GEOCODE_BATCH_SIZE = 100

function formatSaleAddress(sale: { paon: string | null; saon: string | null; street: string | null }): string {
  return [sale.saon, sale.paon, sale.street].filter(Boolean).join(" ").trim() || "Address unavailable"
}

function saleKey(sale: LandRegistrySale): string {
  return [sale.postcode, sale.paon, sale.saon, sale.street].map((p) => (p ?? "").trim().toLowerCase()).join("|")
}

async function bulkGeocodePostcodes(postcodes: string[]): Promise<Map<string, { latitude: number; longitude: number }>> {
  const map = new Map<string, { latitude: number; longitude: number }>()
  const unique = [...new Set(postcodes)]

  for (let i = 0; i < unique.length; i += GEOCODE_BATCH_SIZE) {
    const batch = unique.slice(i, i + GEOCODE_BATCH_SIZE)
    try {
      const response = await fetch("https://api.postcodes.io/postcodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postcodes: batch }),
      })
      if (!response.ok) continue
      const json = await response.json()
      for (const entry of json?.result ?? []) {
        if (entry.result) {
          map.set(entry.query.toUpperCase(), { latitude: entry.result.latitude, longitude: entry.result.longitude })
        }
      }
    } catch (error) {
      console.error("Bulk postcode geocode failed:", error)
    }
  }

  return map
}

/**
 * The 5 same-type sales in the district nearest to the subject property, from
 * the last 2 years, ranked by real distance (not just "same district") via a
 * postcodes.io bulk geocode of each candidate sale's postcode.
 */
export async function getNearestRecentSales(
  outcode: string,
  propertyTypeCode: PropertyTypeCode,
  subjectLat: number,
  subjectLon: number,
  effectiveToday: Date
): Promise<NearbySale[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return []

  const since = new Date(effectiveToday)
  since.setFullYear(since.getFullYear() - RECENT_SALES_YEARS_BACK)

  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { data, error } = await supabase.rpc("get_recent_sales_for_outcode", {
      p_outcode: outcode,
      p_property_type: propertyTypeCode,
      p_since: since.toISOString().split("T")[0],
    })
    if (error || !data?.length) {
      if (error) console.error("get_recent_sales_for_outcode RPC error:", error)
      return []
    }

    type Row = { paon: string | null; saon: string | null; street: string | null; postcode: string; price: number; date_of_transfer: string }
    const rows = data as Row[]
    const geocoded = await bulkGeocodePostcodes(rows.map((r) => r.postcode))

    const nearest = rows
      .map((row) => {
        const coords = geocoded.get(row.postcode.toUpperCase())
        const distanceKm = coords ? calculateDistanceKm(subjectLat, subjectLon, coords.latitude, coords.longitude) : null
        return { row, distanceKm }
      })
      .filter((s): s is { row: Row; distanceKm: number } => s.distanceKm !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, NEARBY_SALES_COUNT)

    // Land Registry has no floor area field at all, but each sale here already has
    // an exact paon/saon/street from the Land Registry record itself (unlike the
    // subject property, which starts from a free-text Rightmove address), so it
    // can be matched against the EPC register with no ambiguity to resolve.
    const floorAreaBySale = await resolveFloorAreasForSales(
      nearest.map((n) => n.row),
      saleKey
    )

    return nearest.map(({ row, distanceKm }) => ({
      address: formatSaleAddress(row),
      postcode: row.postcode,
      price: row.price,
      dateOfTransfer: row.date_of_transfer,
      distanceKm,
      areaSqm: floorAreaBySale.get(saleKey(row)) ?? null,
    }))
  } catch (error) {
    console.error("Error fetching nearest recent sales:", error)
    return []
  }
}

/** This district + its 2 numerically-adjacent outcodes on each side (e.g. SK8 -> SK6, SK7, SK9, SK10), each with an average-price-by-year series. */
export async function getDistrictComparison(
  outcode: string,
  propertyTypeCode: PropertyTypeCode
): Promise<DistrictYearlyData[]> {
  const neighbours = getAdjacentOutcodes(outcode)
  const allOutcodes = [outcode, ...neighbours]

  const yearly = await Promise.all(
    allOutcodes.map((oc) => getAveragePriceByYearForDistrict(oc, propertyTypeCode))
  )

  return allOutcodes.map((oc, i) => ({ outcode: oc, yearly: yearly[i] }))
}
