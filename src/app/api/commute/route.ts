import { NextRequest, NextResponse } from "next/server"
import { geocodePostcode, getDrivingCommute } from "@/lib/commute"

// Kept server-side so the OpenRouteService key never reaches the client, same
// reason as the other §03/§04 data routes.
export async function GET(request: NextRequest) {
  const postcode = request.nextUrl.searchParams.get("postcode")
  const toLat = parseFloat(request.nextUrl.searchParams.get("toLat") ?? "")
  const toLon = parseFloat(request.nextUrl.searchParams.get("toLon") ?? "")

  if (!postcode || !Number.isFinite(toLat) || !Number.isFinite(toLon)) {
    return NextResponse.json({ error: "postcode, toLat and toLon are required" }, { status: 400 })
  }

  const origin = await geocodePostcode(postcode)
  if (!origin) {
    return NextResponse.json({ error: "Could not find that postcode" }, { status: 404 })
  }

  const commute = await getDrivingCommute(origin.latitude, origin.longitude, toLat, toLon)
  if (!commute) {
    return NextResponse.json({ error: "Could not calculate a route for that postcode" }, { status: 502 })
  }

  return NextResponse.json(commute)
}
