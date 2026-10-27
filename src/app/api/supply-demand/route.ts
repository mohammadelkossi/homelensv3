import { NextRequest, NextResponse } from "next/server"
import { getDistrictSalesTrend } from "@/lib/district-comparison"
import { calculateDistanceKm } from "@/lib/nearby-amenities"
import {
  computeMonthsOfSupply,
  extractRightmoveId,
  fetchFloorAreasForListings,
  getForSaleListings,
  type ForSaleListing,
} from "@/lib/supply-demand"
import { mapPropertyTypeToCode } from "@/lib/property-type"
import { getPricePaidDataEffectiveToday } from "@/lib/price-paid-data-clock"

export const maxDuration = 60

const MIN_SALES_SAMPLE = 10
const NEAREST_FOR_SALE_COUNT = 5

// Kept out of the report-generation critical path, same reason as /api/district-comparison:
// a live Apify search can take tens of seconds, so this is fetched client-side after the
// report renders rather than blocking generation.
export async function GET(request: NextRequest) {
  const outcode = request.nextUrl.searchParams.get("outcode")
  const propertyType = request.nextUrl.searchParams.get("propertyType")
  const lat = parseFloat(request.nextUrl.searchParams.get("lat") ?? "")
  const lon = parseFloat(request.nextUrl.searchParams.get("lon") ?? "")
  const subjectId = extractRightmoveId(request.nextUrl.searchParams.get("rightmoveUrl"))

  if (!outcode) {
    return NextResponse.json({ error: "outcode is required" }, { status: 400 })
  }

  const propertyTypeCode = mapPropertyTypeToCode(propertyType)
  if (!propertyTypeCode) {
    return NextResponse.json({ error: "a recognised propertyType is required" }, { status: 400 })
  }

  const effectiveToday = await getPricePaidDataEffectiveToday()

  const typeTrend = await getDistrictSalesTrend(outcode, propertyTypeCode, effectiveToday)
  if (!typeTrend) {
    return NextResponse.json({ supplyDemand: null, nearestForSale: [] })
  }

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
  if (listings === null) {
    // Apify search failed and nothing was cached — brief says hide the card rather than guess.
    return NextResponse.json({ supplyDemand: null, nearestForSale: [] })
  }

  const stats = computeMonthsOfSupply(listings.length, salesPerYear)

  let nearestForSale: (ForSaleListing & { distanceKm: number })[] = []
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    nearestForSale = listings
      .filter((l) => l.id !== subjectId && l.latitude !== null && l.longitude !== null)
      .map((l) => ({ ...l, distanceKm: calculateDistanceKm(lat, lon, l.latitude as number, l.longitude as number) }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, NEAREST_FOR_SALE_COUNT)
  }

  if (nearestForSale.length > 0) {
    const floorAreas = await fetchFloorAreasForListings(nearestForSale.map((l) => l.url))
    nearestForSale = nearestForSale.map((l) =>
      l.areaSqm === null && floorAreas.has(l.id) ? { ...l, areaSqm: floorAreas.get(l.id) ?? null } : l
    )
  }

  return NextResponse.json({ supplyDemand: stats ? { ...stats, widened } : null, nearestForSale })
}
