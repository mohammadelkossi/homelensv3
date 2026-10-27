import { NextRequest, NextResponse } from "next/server"
import { getDistrictComparison, getDistrictSalesTrend, getNearestRecentSales } from "@/lib/district-comparison"
import { mapPropertyTypeToCode } from "@/lib/property-type"
import { getPricePaidDataEffectiveToday } from "@/lib/price-paid-data-clock"

export const maxDuration = 30

// Kept out of the report-generation critical path for the same reason as
// /api/risks-restrictions: this depends on postcodes.io plus 5 extra Supabase
// queries, so it's fetched client-side after the report renders instead of
// blocking generation.
export async function GET(request: NextRequest) {
  const outcode = request.nextUrl.searchParams.get("outcode")
  const propertyType = request.nextUrl.searchParams.get("propertyType")
  const lat = parseFloat(request.nextUrl.searchParams.get("lat") ?? "")
  const lon = parseFloat(request.nextUrl.searchParams.get("lon") ?? "")

  if (!outcode) {
    return NextResponse.json({ error: "outcode is required" }, { status: 400 })
  }

  const propertyTypeCode = mapPropertyTypeToCode(propertyType)
  if (!propertyTypeCode) {
    return NextResponse.json({ error: "a recognised propertyType is required" }, { status: 400 })
  }

  const effectiveToday = await getPricePaidDataEffectiveToday()

  const [districts, salesTrend, nearestSales] = await Promise.all([
    getDistrictComparison(outcode, propertyTypeCode),
    getDistrictSalesTrend(outcode, propertyTypeCode, effectiveToday),
    Number.isFinite(lat) && Number.isFinite(lon)
      ? getNearestRecentSales(outcode, propertyTypeCode, lat, lon, effectiveToday)
      : Promise.resolve([]),
  ])
  return NextResponse.json({ districts, salesTrend, nearestSales })
}
