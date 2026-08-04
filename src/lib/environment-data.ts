// Air quality: nearest-cell lookup against the air_quality_grid table
// (DEFRA UK-AIR 1km modelled background pollution — see
// scripts/import-defra-air-quality.mjs).
//
// Noise: live per-point queries against DEFRA's strategic noise mapping WMS
// services (road/rail/airport, "Round 4", England only). These are raster
// layers with no simpler point-query API, but WMS GetFeatureInfo lets us
// request a tiny 1x1 "image" centred on the property and read back the pixel
// value — no bulk import needed for a 10m-resolution national dataset that
// would otherwise be impractically large.

import { createClient } from "@supabase/supabase-js";
import { calculateDistanceKm } from "@/lib/nearby-amenities";

export type AirQuality = {
  no2: number;
  pm25: number;
  pm10: number;
};

export type NoiseLevels = {
  roadNoiseDb: number | null;
  railNoiseDb: number | null;
  airportNoiseDb: number | null;
};

const AIR_QUALITY_SEARCH_RADIUS_KM = 3;

export async function fetchAirQuality(latitude: number, longitude: number): Promise<AirQuality | null> {
  if (!latitude || !longitude) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const latDelta = AIR_QUALITY_SEARCH_RADIUS_KM / 111;
  const lonDelta = AIR_QUALITY_SEARCH_RADIUS_KM / (111 * Math.cos((latitude * Math.PI) / 180) || 1);

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
      .from("air_quality_grid")
      .select("latitude, longitude, no2, pm25, pm10")
      .gte("latitude", latitude - latDelta)
      .lte("latitude", latitude + latDelta)
      .gte("longitude", longitude - lonDelta)
      .lte("longitude", longitude + lonDelta)
      .limit(50);

    if (error || !data || data.length === 0) return null;

    let nearest = data[0];
    let nearestDistance = calculateDistanceKm(latitude, longitude, nearest.latitude, nearest.longitude);
    for (const cell of data.slice(1)) {
      const distance = calculateDistanceKm(latitude, longitude, cell.latitude, cell.longitude);
      if (distance < nearestDistance) {
        nearest = cell;
        nearestDistance = distance;
      }
    }

    return { no2: nearest.no2, pm25: nearest.pm25, pm10: nearest.pm10 };
  } catch (error) {
    console.error("Error fetching air quality from Supabase:", error);
    return null;
  }
}

const NOISE_WMS_SOURCES = {
  road: {
    url: "https://environment.data.gov.uk/spatialdata/road-noise-all-metrics-england-round-4/wms",
    layer: "Road_Noise_Lden_England_Round_4_All",
  },
  rail: {
    url: "https://environment.data.gov.uk/spatialdata/noise-data/wms",
    layer: "Rail_Noise_Lden_England_Round_4_All",
  },
  airport: {
    url: "https://environment.data.gov.uk/spatialdata/airport-noise-all-metrics-england-round-4/wms",
    layer: "Airport_Noise_ALL_Lden",
  },
} as const;

// Small bbox around the point; WMS 1.3.0 with EPSG:4326 uses lat,lon axis order.
const NOISE_QUERY_BUFFER_DEGREES = 0.0005;

async function queryNoiseWms(source: { url: string; layer: string }, latitude: number, longitude: number): Promise<number | null> {
  const d = NOISE_QUERY_BUFFER_DEGREES;
  const bbox = `${latitude - d},${longitude - d},${latitude + d},${longitude + d}`;
  const params = new URLSearchParams({
    service: "WMS",
    version: "1.3.0",
    request: "GetFeatureInfo",
    layers: source.layer,
    query_layers: source.layer,
    crs: "EPSG:4326",
    bbox,
    width: "101",
    height: "101",
    i: "50",
    j: "50",
    info_format: "application/json",
    feature_count: "1",
  });

  try {
    const response = await fetch(`${source.url}?${params.toString()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;

    const data = await response.json();
    const value = data?.features?.[0]?.properties?.GRAY_INDEX;
    // 0 means below the dataset's mapping threshold; rasters also use a huge
    // sentinel (~3.4e38, float32 max) to mark "no data" cells, so reject
    // anything outside a plausible dB range too.
    if (typeof value !== "number" || value <= 0 || value > 150) return null;
    return value;
  } catch (error) {
    console.error("Noise WMS query failed:", source.layer, error);
    return null;
  }
}

export async function fetchNoiseLevels(latitude: number, longitude: number): Promise<NoiseLevels> {
  if (!latitude || !longitude) {
    return { roadNoiseDb: null, railNoiseDb: null, airportNoiseDb: null };
  }

  const [roadNoiseDb, railNoiseDb, airportNoiseDb] = await Promise.all([
    queryNoiseWms(NOISE_WMS_SOURCES.road, latitude, longitude),
    queryNoiseWms(NOISE_WMS_SOURCES.rail, latitude, longitude),
    queryNoiseWms(NOISE_WMS_SOURCES.airport, latitude, longitude),
  ]);

  return { roadNoiseDb, railNoiseDb, airportNoiseDb };
}

export type EnvironmentData = {
  airQuality: AirQuality | null;
  noiseLevels: NoiseLevels;
};

export async function fetchEnvironmentData(latitude: number, longitude: number): Promise<EnvironmentData> {
  const [airQuality, noiseLevels] = await Promise.all([
    fetchAirQuality(latitude, longitude),
    fetchNoiseLevels(latitude, longitude),
  ]);
  return { airQuality, noiseLevels };
}

export const REPORT_ENVIRONMENT_DATA_STORAGE_KEY = "homelens_report_environment_data";

export function readStoredEnvironmentData(): EnvironmentData | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(REPORT_ENVIRONMENT_DATA_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EnvironmentData;
  } catch {
    sessionStorage.removeItem(REPORT_ENVIRONMENT_DATA_STORAGE_KEY);
    return null;
  }
}

export function storeEnvironmentData(data: EnvironmentData): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(REPORT_ENVIRONMENT_DATA_STORAGE_KEY, JSON.stringify(data));
}
