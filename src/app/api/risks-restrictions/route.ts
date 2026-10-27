import { NextRequest, NextResponse } from "next/server";
import { fetchPlanningConstraints } from "@/lib/planning-constraints";
import { fetchCrimeSummary } from "@/lib/crime-data";
import { fetchBroadbandCoverage } from "@/lib/broadband-coverage";
import { fetchEnvironmentData } from "@/lib/environment-data";

export const maxDuration = 30;

// Kept out of the report-generation critical path (see scrape-property/route.ts)
// because these depend on several external government APIs (planning.data.gov.uk,
// police.uk, DEFRA's noise WMS) that are slower and less reliable than the
// property-scraping pipeline — DEFRA's noise service in particular has been
// observed rate-limiting (403) under moderate request volume. Bundling them
// into the same blocking Promise.all as report generation meant one flaky
// dependency could stall or time out the whole report. The results page
// fetches this endpoint client-side after the report renders instead.
export async function GET(request: NextRequest) {
  const lat = parseFloat(request.nextUrl.searchParams.get("lat") ?? "");
  const lon = parseFloat(request.nextUrl.searchParams.get("lon") ?? "");
  const postcode = request.nextUrl.searchParams.get("postcode");

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  const [planningConstraints, crimeSummary, broadbandCoverage, environmentData] = await Promise.all([
    fetchPlanningConstraints(lat, lon),
    fetchCrimeSummary(lat, lon),
    fetchBroadbandCoverage(postcode),
    fetchEnvironmentData(lat, lon),
  ]);

  return NextResponse.json({ planningConstraints, crimeSummary, broadbandCoverage, environmentData });
}
