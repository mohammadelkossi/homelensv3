import { NextRequest, NextResponse } from "next/server"
import { ENGLAND_GEOGRAPHY_CODE, getCensusTenureForGeography, resolveLsoaForPostcode } from "@/lib/census-tenure"

// Kept out of the report-generation critical path, same reason as the other §02-§04 "nearby"
// data: fetched client-side after the report renders so a slow/failed lookup never blocks
// generation. In practice this one is fast (three quick, free, unauthenticated API calls).
export async function GET(request: NextRequest) {
  const postcode = request.nextUrl.searchParams.get("postcode")
  if (!postcode) {
    return NextResponse.json({ error: "postcode is required" }, { status: 400 })
  }

  const lsoa = await resolveLsoaForPostcode(postcode)
  if (!lsoa) {
    return NextResponse.json({ tenure: null, englandTenure: null })
  }

  const [tenure, englandTenure] = await Promise.all([
    getCensusTenureForGeography(lsoa),
    getCensusTenureForGeography(ENGLAND_GEOGRAPHY_CODE),
  ])
  return NextResponse.json({ tenure, englandTenure })
}
