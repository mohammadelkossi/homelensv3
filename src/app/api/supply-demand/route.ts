import { NextRequest, NextResponse } from "next/server"
import { getSupplyDemandReport } from "@/lib/supply-demand"
import { mapPropertyTypeToCode } from "@/lib/property-type"
import { getPricePaidDataEffectiveToday } from "@/lib/price-paid-data-clock"

export const maxDuration = 60

// Kept out of the report-generation critical path, same reason as /api/district-comparison:
// a live for-sale search can take tens of seconds, so this is fetched client-side after the
// report renders rather than blocking generation.
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

  const report = await getSupplyDemandReport({
    outcode,
    propertyTypeCode,
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lon) ? lon : null,
    subjectRightmoveUrl: request.nextUrl.searchParams.get("rightmoveUrl"),
    effectiveToday: await getPricePaidDataEffectiveToday(),
  })
  return NextResponse.json(report)
}
