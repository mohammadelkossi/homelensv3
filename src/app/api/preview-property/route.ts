import { NextRequest, NextResponse } from "next/server"
import { fetchRightmoveListing, isRightmovePropertyUrl } from "@/lib/rightmove-listing"

export const maxDuration = 15

// The free preview report: no login, no Apify, no AI. Returns just enough of the
// listing for the results page to run Risks & restrictions live and fill the
// blurred header; everything else on the page is locked sample content.
export async function POST(request: NextRequest) {
  let url: unknown
  try {
    ;({ url } = await request.json())
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
  if (typeof url !== "string" || !isRightmovePropertyUrl(url.trim())) {
    return NextResponse.json({ error: "Please enter a valid Rightmove link" }, { status: 400 })
  }

  const listing = await fetchRightmoveListing(url.trim())
  if (!listing || listing.latitude === null || listing.longitude === null) {
    return NextResponse.json({ error: "We couldn't read that listing. Please check the link and try again." }, { status: 502 })
  }

  // Same keys as /api/scrape-property, so the results page reads both the same way.
  return NextResponse.json({
    rightmoveUrl: url.trim(),
    propertyAddress: listing.displayAddress ?? "N/A",
    price: listing.price ?? "N/A",
    propertyType: listing.propertyType ?? "N/A",
    bedrooms: listing.bedrooms?.toString() ?? "N/A",
    bathrooms: listing.bathrooms?.toString() ?? "N/A",
    area: listing.floorAreaSqm?.toString() ?? "N/A",
    latitude: listing.latitude,
    longitude: listing.longitude,
    houseFullPostcode: listing.fullPostcode,
    houseOutcode: listing.outcode,
    tenure: listing.tenure,
    preview: 1,
  })
}
