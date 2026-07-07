import { NextRequest, NextResponse } from "next/server";
import { getAllNearbyPlaces } from "@/lib/nearby-amenities";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const lat = parseFloat(request.nextUrl.searchParams.get("lat") ?? "");
  const lon = parseFloat(request.nextUrl.searchParams.get("lon") ?? "");

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  const nearbyPlaces = await getAllNearbyPlaces(lat, lon);
  return NextResponse.json(nearbyPlaces);
}
