export type NearbyPlace = { name: string; distance: number };

export type NearbyPlacesResult = {
  schools: NearbyPlace[];
  stations: NearbyPlace[];
  parks: NearbyPlace[];
  supermarkets: NearbyPlace[];
  placesOfWorship: NearbyPlace[];
  gyms: NearbyPlace[];
  hospitals: NearbyPlace[];
};

type AmenityCategory =
  | "school"
  | "station"
  | "park"
  | "supermarket"
  | "church"
  | "mosque"
  | "synagogue"
  | "hindu_temple"
  | "gym"
  | "hospital";

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export type ApifyNearestPlace = {
  name?: string;
  distance?: number;
  unit?: string;
};

export type ApifyAmenityFallback = {
  nearestStations?: ApifyNearestPlace[];
  nearestSchools?: ApifyNearestPlace[];
};

const OVERPASS_AMENITY_RADIUS_M = 5000;
const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];
const OVERPASS_TIMEOUT_MS = 12_000;

export const REPORT_NEARBY_PLACES_STORAGE_KEY = "homelens_report_nearby_places";

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getOverpassElementCoords(element: OverpassElement): { lat: number; lon: number } | null {
  if (element.lat != null && element.lon != null) return { lat: element.lat, lon: element.lon };
  if (element.center) return { lat: element.center.lat, lon: element.center.lon };
  return null;
}

function categorizeOverpassAmenity(tags: Record<string, string>): AmenityCategory | null {
  const amenity = tags.amenity;
  const shop = tags.shop;
  const leisure = tags.leisure;
  const railway = tags.railway;
  const religion = (tags.religion || "").toLowerCase();
  const landuse = tags.landuse;
  const publicTransport = tags.public_transport;

  if (amenity === "hospital") return "hospital";
  if (amenity === "school" || amenity === "college" || tags.building === "school") return "school";
  if (leisure === "fitness_centre" || leisure === "sports_centre" || amenity === "gym") return "gym";
  if (leisure === "park" || leisure === "garden" || landuse === "recreation_ground") return "park";
  if (shop === "supermarket") return "supermarket";
  if (
    railway === "station" ||
    railway === "halt" ||
    amenity === "bus_station" ||
    publicTransport === "station"
  ) {
    return "station";
  }
  if (amenity === "place_of_worship") {
    if (religion === "muslim") return "mosque";
    if (religion === "jewish") return "synagogue";
    if (religion === "hindu") return "hindu_temple";
    return "church";
  }
  if (tags.building === "church") return "church";
  return null;
}

/** Split into two lighter queries to avoid Overpass 504/timeouts. */
function buildOverpassQueries(latitude: number, longitude: number, radiusMeters: number): string[] {
  const around = `(around:${radiusMeters},${latitude},${longitude})`;
  return [
    `[out:json][timeout:15];(nwr["amenity"~"school|college|bus_station"]${around};nwr["building"="school"]${around};nwr["railway"~"station|halt"]${around};nwr["public_transport"="station"]${around};nwr["shop"="supermarket"]${around};);out center tags;`,
    `[out:json][timeout:15];(nwr["leisure"~"park|garden|fitness_centre|sports_centre"]${around};nwr["landuse"="recreation_ground"]${around};nwr["amenity"~"place_of_worship|gym|hospital"]${around};nwr["building"="church"]${around};);out center tags;`,
  ];
}

async function fetchOverpassQuery(query: string): Promise<OverpassElement[]> {
  const body = `data=${encodeURIComponent(query)}`;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "HomeLens/1.0 (property report amenities)",
        },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(OVERPASS_TIMEOUT_MS),
      });
      if (!response.ok) {
        console.error("Overpass API error:", endpoint, response.status);
        continue;
      }
      const data = await response.json();
      if (Array.isArray(data.elements)) return data.elements;
    } catch (error) {
      console.error("Overpass fetch failed:", endpoint, error);
    }
  }

  return [];
}

export async function fetchOverpassAmenities(
  latitude: number,
  longitude: number,
  radiusMeters: number = OVERPASS_AMENITY_RADIUS_M
): Promise<OverpassElement[]> {
  const queries = buildOverpassQueries(latitude, longitude, radiusMeters);
  const batches = await Promise.all(queries.map((query) => fetchOverpassQuery(query)));
  const seen = new Set<string>();
  const elements: OverpassElement[] = [];

  for (const batch of batches) {
    for (const element of batch) {
      const key = `${element.type}/${element.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      elements.push(element);
    }
  }

  return elements;
}

function apifyDistanceToKm(distance: number, unit?: string): number {
  if (!Number.isFinite(distance)) return Number.POSITIVE_INFINITY;
  return unit === "miles" ? distance * 1.60934 : distance;
}

function placesFromApify(places: ApifyNearestPlace[] | undefined): NearbyPlace[] {
  if (!Array.isArray(places)) return [];
  return places
    .filter((place) => place.name && Number.isFinite(place.distance))
    .map((place) => ({
      name: place.name!,
      distance: apifyDistanceToKm(place.distance!, place.unit),
    }));
}

export function emptyNearbyPlaces(): NearbyPlacesResult {
  return {
    schools: [],
    stations: [],
    parks: [],
    supermarkets: [],
    placesOfWorship: [],
    gyms: [],
    hospitals: [],
  };
}

function takeNearestPlaces(places: NearbyPlace[], maxResults: number): NearbyPlace[] {
  return [...places].sort((a, b) => a.distance - b.distance).slice(0, maxResults);
}

function mergePlacesByName(...groups: NearbyPlace[][]): NearbyPlace[] {
  const merged = new Map<string, NearbyPlace>();
  for (const group of groups) {
    for (const place of group) {
      const key = place.name.trim().toLowerCase();
      const existing = merged.get(key);
      if (!existing || place.distance < existing.distance) {
        merged.set(key, place);
      }
    }
  }
  return [...merged.values()];
}

export function nearbyPlacesFromApify(apifyFallback?: ApifyAmenityFallback): NearbyPlacesResult {
  const empty = emptyNearbyPlaces();
  return {
    ...empty,
    schools: takeNearestPlaces(placesFromApify(apifyFallback?.nearestSchools), 3),
    stations: takeNearestPlaces(placesFromApify(apifyFallback?.nearestStations), 3),
  };
}

export async function getAllNearbyPlaces(
  latitude: number,
  longitude: number,
  apifyFallback?: ApifyAmenityFallback
): Promise<NearbyPlacesResult> {
  const apifyPlaces = nearbyPlacesFromApify(apifyFallback);

  if (!latitude || !longitude) {
    return apifyPlaces;
  }

  try {
    const elements = await fetchOverpassAmenities(latitude, longitude);
    const buckets: Record<AmenityCategory, NearbyPlace[]> = {
      school: [],
      station: [],
      park: [],
      supermarket: [],
      church: [],
      mosque: [],
      synagogue: [],
      hindu_temple: [],
      gym: [],
      hospital: [],
    };
    const seen = new Set<string>();

    for (const element of elements) {
      const tags = element.tags;
      if (!tags?.name) continue;

      const category = categorizeOverpassAmenity(tags);
      if (!category) continue;

      const coords = getOverpassElementCoords(element);
      if (!coords) continue;

      const dedupeKey = `${category}:${element.type}/${element.id}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      buckets[category].push({
        name: tags.name,
        distance: calculateDistanceKm(latitude, longitude, coords.lat, coords.lon),
      });
    }

    const placesOfWorship = takeNearestPlaces(
      [...buckets.church, ...buckets.mosque, ...buckets.synagogue, ...buckets.hindu_temple],
      3
    );

    const apifySchools = placesFromApify(apifyFallback?.nearestSchools);
    const apifyStations = placesFromApify(apifyFallback?.nearestStations);

    return {
      schools: takeNearestPlaces(mergePlacesByName(buckets.school, apifySchools), 3),
      stations: takeNearestPlaces(mergePlacesByName(buckets.station, apifyStations), 3),
      parks: takeNearestPlaces(buckets.park, 3),
      supermarkets: takeNearestPlaces(buckets.supermarket, 3),
      placesOfWorship,
      gyms: takeNearestPlaces(buckets.gym, 3),
      hospitals: takeNearestPlaces(buckets.hospital, 3),
    };
  } catch (error) {
    console.error("Error fetching nearby places from Overpass:", error);
    return apifyPlaces;
  }
}

export function mergeNearbyPlaces(
  base: NearbyPlacesResult,
  enrichment: NearbyPlacesResult
): NearbyPlacesResult {
  return {
    schools: takeNearestPlaces(mergePlacesByName(base.schools, enrichment.schools), 3),
    stations: takeNearestPlaces(mergePlacesByName(base.stations, enrichment.stations), 3),
    parks: takeNearestPlaces(mergePlacesByName(base.parks, enrichment.parks), 3),
    supermarkets: takeNearestPlaces(mergePlacesByName(base.supermarkets, enrichment.supermarkets), 3),
    placesOfWorship: takeNearestPlaces(
      mergePlacesByName(base.placesOfWorship, enrichment.placesOfWorship),
      3
    ),
    gyms: takeNearestPlaces(mergePlacesByName(base.gyms, enrichment.gyms), 3),
    hospitals: takeNearestPlaces(mergePlacesByName(base.hospitals, enrichment.hospitals), 3),
  };
}

export function hasNearbyPlacesContent(places: NearbyPlacesResult | null | undefined): boolean {
  if (!places) return false;
  return Object.values(places).some((group) => group.length > 0);
}

export function nearbyPlacesToAmenityList(places: NearbyPlacesResult): Array<{
  category: string;
  name: string;
  distance: number;
}> {
  const amenities: Array<{ category: string; name: string; distance: number }> = [];
  const mapping: Array<[keyof NearbyPlacesResult, string]> = [
    ["schools", "School"],
    ["stations", "Station"],
    ["parks", "Park"],
    ["supermarkets", "Supermarket"],
    ["placesOfWorship", "Place of Worship"],
    ["gyms", "Gym"],
    ["hospitals", "Hospital"],
  ];

  for (const [key, category] of mapping) {
    for (const place of places[key]) {
      amenities.push({ category, name: place.name, distance: place.distance });
    }
  }

  return amenities;
}

export function readStoredNearbyPlaces(): NearbyPlacesResult | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(REPORT_NEARBY_PLACES_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as NearbyPlacesResult;
  } catch {
    sessionStorage.removeItem(REPORT_NEARBY_PLACES_STORAGE_KEY);
    return null;
  }
}

export function storeNearbyPlaces(places: NearbyPlacesResult): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(REPORT_NEARBY_PLACES_STORAGE_KEY, JSON.stringify(places));
}

export function clearStoredNearbyPlaces(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(REPORT_NEARBY_PLACES_STORAGE_KEY);
}
