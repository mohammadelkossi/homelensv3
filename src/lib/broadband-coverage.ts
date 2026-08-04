// Exact-postcode lookup against the broadband_coverage table (imported from
// Ofcom Connected Nations data — see scripts/import-ofcom-broadband.mjs).
// Unlike the proximity-based lookups elsewhere in the app, broadband
// availability is reported per postcode unit, so this is a direct match, not
// a nearest-N search.

import { createClient } from "@supabase/supabase-js";

export type BroadbandCoverage = {
  postcode: string;
  gigabitAvailability: number | null;
  ultrafastAvailability: number | null;
  superfastAvailability: number | null;
  belowUso: number | null;
  decentBroadbandFwa: number | null;
};

function normalizePostcode(postcode: string): string {
  return postcode.replace(/\s+/g, "").toUpperCase();
}

export async function fetchBroadbandCoverage(postcode: string | null | undefined): Promise<BroadbandCoverage | null> {
  if (!postcode) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
      .from("broadband_coverage")
      .select("postcode, gigabit_availability, ultrafast_availability, superfast_availability, below_uso, decent_broadband_fwa")
      .eq("postcode", normalizePostcode(postcode))
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch broadband coverage:", error);
      return null;
    }
    if (!data) return null;

    return {
      postcode: data.postcode,
      gigabitAvailability: data.gigabit_availability,
      ultrafastAvailability: data.ultrafast_availability,
      superfastAvailability: data.superfast_availability,
      belowUso: data.below_uso,
      decentBroadbandFwa: data.decent_broadband_fwa,
    };
  } catch (error) {
    console.error("Error fetching broadband coverage from Supabase:", error);
    return null;
  }
}

export const REPORT_BROADBAND_COVERAGE_STORAGE_KEY = "homelens_report_broadband_coverage";

export function readStoredBroadbandCoverage(): BroadbandCoverage | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(REPORT_BROADBAND_COVERAGE_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BroadbandCoverage;
  } catch {
    sessionStorage.removeItem(REPORT_BROADBAND_COVERAGE_STORAGE_KEY);
    return null;
  }
}

export function storeBroadbandCoverage(coverage: BroadbandCoverage): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(REPORT_BROADBAND_COVERAGE_STORAGE_KEY, JSON.stringify(coverage));
}
