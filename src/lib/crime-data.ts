// Live lookup against data.police.uk's free, no-key street-level crime API.
// The API searches a fixed ~1 mile radius around the given point (not
// configurable) and data lags roughly 2 months behind real time, so we ask
// the API itself what the latest available month is rather than guessing.

import { createClient } from "@supabase/supabase-js";

const POLICE_API_BASE_URL = "https://data.police.uk/api";

export type CrimeCategoryCount = { category: string; count: number };

export type CrimeBaseline = {
  forceId: string;
  forceName: string;
  medianCount: number;
  sampleSize: number;
};

export type CrimeSummary = {
  month: string;
  totalCount: number;
  topCategories: CrimeCategoryCount[];
  // Null when the force couldn't be resolved, or no baseline has been computed
  // for it yet (see scripts/refresh-crime-baseline.mjs) — not the same as "this
  // property has zero nearby crime".
  baseline: CrimeBaseline | null;
};

function formatCategoryLabel(category: string): string {
  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      console.error("Police API error:", url, response.status);
      return null;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error("Police API fetch failed:", url, error);
    return null;
  }
}

// Resolves coordinates to the policing neighbourhood (and its parent force) that
// covers them — the same identifier scripts/refresh-crime-baseline.mjs samples by.
async function getForceIdForLocation(latitude: number, longitude: number): Promise<string | null> {
  const result = await fetchJson<{ force: string; neighbourhood: string }>(
    `${POLICE_API_BASE_URL}/locate-neighbourhood?q=${latitude},${longitude}`
  );
  return result?.force ?? null;
}

async function fetchCrimeBaseline(forceId: string): Promise<CrimeBaseline | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("crime_force_baseline")
      .select("force_id, force_name, median_crime_count, sample_size")
      .eq("force_id", forceId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      forceId: data.force_id as string,
      forceName: data.force_name as string,
      medianCount: Number(data.median_crime_count),
      sampleSize: Number(data.sample_size),
    };
  } catch (error) {
    console.error("Error fetching crime baseline:", error);
    return null;
  }
}

export async function fetchCrimeSummary(latitude: number, longitude: number): Promise<CrimeSummary | null> {
  if (!latitude || !longitude) return null;

  const lastUpdated = await fetchJson<{ date: string }>(`${POLICE_API_BASE_URL}/crime-last-updated`);
  const month = lastUpdated?.date?.slice(0, 7);
  if (!month) return null;

  const [crimes, forceId] = await Promise.all([
    fetchJson<Array<{ category: string }>>(
      `${POLICE_API_BASE_URL}/crimes-street/all-crime?lat=${latitude}&lng=${longitude}&date=${month}`
    ),
    getForceIdForLocation(latitude, longitude),
  ]);
  if (!crimes) return null;

  const baseline = forceId ? await fetchCrimeBaseline(forceId) : null;

  const counts = new Map<string, number>();
  for (const crime of crimes) {
    counts.set(crime.category, (counts.get(crime.category) ?? 0) + 1);
  }

  const topCategories = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => ({ category: formatCategoryLabel(category), count }));

  return { month, totalCount: crimes.length, topCategories, baseline };
}

export const REPORT_CRIME_SUMMARY_STORAGE_KEY = "homelens_report_crime_summary";

// `key` scopes the cache to one property (see useRisksRestrictions) — without it, the first
// report generated in a tab would cache its crime data forever and every later report in
// that tab (almost always a different property) would silently reuse it instead of fetching.
export function readStoredCrimeSummary(key: string): CrimeSummary | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(`${REPORT_CRIME_SUMMARY_STORAGE_KEY}:${key}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CrimeSummary;
  } catch {
    sessionStorage.removeItem(`${REPORT_CRIME_SUMMARY_STORAGE_KEY}:${key}`);
    return null;
  }
}

export function storeCrimeSummary(key: string, summary: CrimeSummary): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(`${REPORT_CRIME_SUMMARY_STORAGE_KEY}:${key}`, JSON.stringify(summary));
}
