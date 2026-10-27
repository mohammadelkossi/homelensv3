import { NextRequest, NextResponse } from "next/server"
import { getAveragePricePerSqmForPropertyTypeAndOutcode } from "@/lib/price-per-sqm"
import { mapPropertyTypeToCode } from "@/lib/property-type"
import { getPricePaidDataEffectiveToday } from "@/lib/price-paid-data-clock"

// Deliberately out of the report-generation critical path — this is the single
// most expensive thing /api/scrape-property used to block on (up to 500 sales
// each needing a floor area resolved via EPC/Homedata, concurrency-capped).
// Fetched client-side after the report renders instead, same reason as
// /api/district-comparison, /api/supply-demand and /api/risks-restrictions.
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const outcode = request.nextUrl.searchParams.get("outcode")
  const propertyType = request.nextUrl.searchParams.get("propertyType")

  const propertyTypeCode = mapPropertyTypeToCode(propertyType)
  if (!outcode || !propertyTypeCode) {
    return NextResponse.json({ error: "outcode and a recognised propertyType are required" }, { status: 400 })
  }

  const effectiveToday = await getPricePaidDataEffectiveToday()
  const stats = await getAveragePricePerSqmForPropertyTypeAndOutcode(outcode, propertyTypeCode, effectiveToday)

  return NextResponse.json({
    averagePricePerSqm: stats?.weightedAverage ?? null,
    averagePricePerSqmSimple: stats?.simpleAverage ?? null,
    averagePricePerSqmMatchedSaleCount: stats?.matchedSaleCount ?? 0,
  })
}
