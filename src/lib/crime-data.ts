// Live lookup against data.police.uk's free, no-key street-level crime API.
// The API searches a fixed ~1 mile radius around the given point (not
// configurable) and data lags roughly 2 months behind real time, so we ask
// the API itself what the latest available month is rather than guessing.

const POLICE_API_BASE_URL = "https://data.police.uk/api";

export type CrimeCategoryCount = { category: string; count: number };

export type CrimeSummary = {
  month: string;
  totalCount: number;
  topCategories: CrimeCategoryCount[];
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

export async function fetchCrimeSummary(latitude: number, longitude: number): Promise<CrimeSummary | null> {
  if (!latitude || !longitude) return null;

  const lastUpdated = await fetchJson<{ date: string }>(`${POLICE_API_BASE_URL}/crime-last-updated`);
  const month = lastUpdated?.date?.slice(0, 7);
  if (!month) return null;

  const crimes = await fetchJson<Array<{ category: string }>>(
    `${POLICE_API_BASE_URL}/crimes-street/all-crime?lat=${latitude}&lng=${longitude}&date=${month}`
  );
  if (!crimes) return null;

  const counts = new Map<string, number>();
  for (const crime of crimes) {
    counts.set(crime.category, (counts.get(crime.category) ?? 0) + 1);
  }

  const topCategories = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => ({ category: formatCategoryLabel(category), count }));

  return { month, totalCount: crimes.length, topCategories };
}

export const REPORT_CRIME_SUMMARY_STORAGE_KEY = "homelens_report_crime_summary";

export function readStoredCrimeSummary(): CrimeSummary | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(REPORT_CRIME_SUMMARY_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CrimeSummary;
  } catch {
    sessionStorage.removeItem(REPORT_CRIME_SUMMARY_STORAGE_KEY);
    return null;
  }
}

export function storeCrimeSummary(summary: CrimeSummary): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(REPORT_CRIME_SUMMARY_STORAGE_KEY, JSON.stringify(summary));
}
