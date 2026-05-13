import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ApifyClient } from 'apify-client';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { FREE_PROPERTY_LIMIT, freeAnalysesLimitReachedMessage } from '@/lib/report-generation';

// ─── Helpers (unchanged) ────────────────────────────────────────────────────

function checkFeature(features: string[] | undefined, keywords: string[]): string {
  if (!features || features.length === 0) return 'No';
  const lowerFeatures = features.map(f => f.toLowerCase());
  return keywords.some(keyword =>
    lowerFeatures.some(feature => feature.includes(keyword.toLowerCase()))
  ) ? 'Yes' : 'No';
}

function mapPropertyTypeToCode(propertyType: string | null | undefined): 'D' | 'S' | 'T' | 'F' | 'O' | null {
  if (!propertyType) return null;
  const normalized = propertyType.trim().toLowerCase();
  if (!normalized || normalized === 'n/a') return null;
  if (normalized.includes('semi')) return 'S';
  if (normalized.includes('terrace')) return 'T';
  if (normalized.includes('flat') || normalized.includes('apartment') || normalized.includes('maisonette')) return 'F';
  if (normalized.includes('detached') || normalized.includes('bungalow') || normalized.includes('cottage')) return 'D';
  if (normalized.includes('townhouse')) return 'T';
  return 'O';
}

// ─── FIX 1: Run floorplan + description extraction in parallel ───────────────
// Previously: sequential fallback (floorplan → description). Now both run at
// once and we take the first non-null result. Also downgraded description call
// from gpt-4 → gpt-4o-mini (10x cheaper, fast enough for simple text search).

async function extractAreaFromFloorplan(floorplanUrl: string, openaiClient: OpenAI): Promise<string | null> {
  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are analyzing a property floorplan image. Extract the EXACT total area/square footage of the property.
IMPORTANT: Only return a value if you can see it EXPLICITLY stated or clearly labeled on the floorplan. Do NOT estimate, calculate, or approximate. Only use values that are directly visible and labeled.
Look for:
- Total area explicitly stated on the floorplan (sqm, m², square metres)
- Dimensions clearly labeled that allow you to calculate the EXACT total area (if all dimensions are visible and unambiguous)
- Any area value that is clearly and explicitly shown
Respond with ONLY the exact numerical value in square metres. If you find square feet, convert to square metres (1 sq ft = 0.092903 sqm). 
If the exact area cannot be determined with certainty from the image, respond with "NOT_FOUND".
Format your response as a single number only (e.g., "120" or "NOT_FOUND"). Do NOT provide estimates or approximate values.`
            },
            {
              type: 'image_url',
              image_url: { url: floorplanUrl },
            },
          ],
        },
      ],
      max_tokens: 50,
    });
    const result = response.choices[0]?.message?.content?.trim();
    if (result && result !== 'NOT_FOUND' && !isNaN(parseFloat(result))) return result;
    return null;
  } catch (error) {
    console.error('Error extracting area from floorplan:', error);
    return null;
  }
}

async function extractAreaFromDescription(description: string, openaiClient: OpenAI): Promise<string | null> {
  try {
    const response = await openaiClient.chat.completions.create({
      // FIX: was 'gpt-4' — gpt-4o-mini is faster and cheap enough for this simple task
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `You are analyzing a property description. Extract the EXACT total area/square footage of the property.
IMPORTANT: Only return a value if it is EXPLICITLY stated in the text. Do NOT estimate, infer, or approximate. Only use values that are directly written in the description.
Look for explicit mentions of:
- Square metres (sqm, sq m, square meters, m²) followed by a number
- Square feet (sq ft, sq. ft., square feet) followed by a number
- Area values that are clearly and explicitly stated
Respond with ONLY the exact numerical value in square metres. If you find square feet, convert to square metres (1 sq ft = 0.092903 sqm).
If multiple area values are mentioned, return the largest one only if it is clearly stated as the total area.
If the exact area cannot be determined with certainty from the text, respond with "NOT_FOUND".
Format your response as a single number only (e.g., "120" or "NOT_FOUND"). Do NOT provide estimates or approximate values.
Property description:
${description}`,
        },
      ],
      max_tokens: 50,
    });
    const result = response.choices[0]?.message?.content?.trim();
    if (result && result !== 'NOT_FOUND' && !isNaN(parseFloat(result))) return result;
    return null;
  } catch (error) {
    console.error('Error extracting area from description:', error);
    return null;
  }
}

// FIX: Run floorplan + description in parallel instead of sequential fallback
async function getArea(
  apifyData: any,
  floorplans: any[] | undefined,
  description: string | undefined,
  openaiClient: OpenAI
): Promise<string> {
  if (apifyData.sizeSqFeetMin) {
    return (apifyData.sizeSqFeetMin * 0.092903).toFixed(2);
  }
  if (apifyData.sizeSqFeetMax) {
    return (apifyData.sizeSqFeetMax * 0.092903).toFixed(2);
  }

  // Run both extractions simultaneously — take first non-null result
  const [floorplanArea, descriptionArea] = await Promise.all([
    floorplans?.[0]?.url
      ? extractAreaFromFloorplan(floorplans[0].url, openaiClient)
      : Promise.resolve(null),
    description
      ? extractAreaFromDescription(description, openaiClient)
      : Promise.resolve(null),
  ]);

  return floorplanArea ?? descriptionArea ?? 'N/A';
}

// ─── Geo / distance helpers (unchanged) ─────────────────────────────────────

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

async function getPostcodeFromCoordinates(latitude: number, longitude: number): Promise<{ fullPostcode: string | null; outcode: string | null }> {
  if (!latitude || !longitude || !process.env.GOOGLE_MAPS_API_KEY) {
    return { fullPostcode: null, outcode: null };
  }
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );
    if (!response.ok) return { fullPostcode: null, outcode: null };
    const data = await response.json();
    if (data.status === 'OK' && data.results?.length > 0) {
      for (const result of data.results) {
        for (const component of result.address_components ?? []) {
          if (
            component.types?.includes('postal_code') &&
            !component.types?.includes('postal_code_prefix')
          ) {
            const fullPostcode = component.long_name || component.short_name;
            const outcode = fullPostcode?.trim().split(' ')[0] ?? null;
            return { fullPostcode: fullPostcode ?? null, outcode };
          }
        }
      }
    }
    return { fullPostcode: null, outcode: null };
  } catch (error) {
    console.error('Error fetching postcode from coordinates:', error);
    return { fullPostcode: null, outcode: null };
  }
}

async function getNearbyPlaces(
  latitude: number,
  longitude: number,
  type: string,
  maxResults: number = 3
): Promise<Array<{ name: string; distance: number; address: string; rating?: number }>> {
  if (!latitude || !longitude || !process.env.GOOGLE_MAPS_API_KEY) return [];
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=5000&type=${type}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );
    if (!response.ok) return [];
    const data = await response.json();
    if (data.status !== 'OK' || !data.results?.length) return [];
    return data.results
      .map((place: any) => ({
        name: place.name || 'Unknown',
        distance: place.geometry?.location
          ? calculateDistance(latitude, longitude, place.geometry.location.lat, place.geometry.location.lng)
          : 0,
        address: place.vicinity || place.formatted_address || 'Address not available',
        rating: place.rating || undefined,
      }))
      .sort((a: any, b: any) => a.distance - b.distance)
      .slice(0, maxResults);
  } catch (error) {
    console.error(`Error fetching nearby ${type} places:`, error);
    return [];
  }
}

async function getAllNearbyPlaces(latitude: number, longitude: number) {
  const [schools, stations, parks, supermarkets, churches, mosques, synagogues, hinduTemples, gyms, hospitals] =
    await Promise.all([
      getNearbyPlaces(latitude, longitude, 'school', 3),
      getNearbyPlaces(latitude, longitude, 'transit_station', 3),
      getNearbyPlaces(latitude, longitude, 'park', 3),
      getNearbyPlaces(latitude, longitude, 'supermarket', 3),
      getNearbyPlaces(latitude, longitude, 'church', 3),
      getNearbyPlaces(latitude, longitude, 'mosque', 3),
      getNearbyPlaces(latitude, longitude, 'synagogue', 3),
      getNearbyPlaces(latitude, longitude, 'hindu_temple', 3),
      getNearbyPlaces(latitude, longitude, 'gym', 3),
      getNearbyPlaces(latitude, longitude, 'hospital', 3),
    ]);
  const placesOfWorship = [...churches, ...mosques, ...synagogues, ...hinduTemples]
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);
  return { schools, stations, parks, supermarkets, placesOfWorship, gyms, hospitals };
}

// ─── Address / price helpers (unchanged) ────────────────────────────────────

function normalizeAddress(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ').trim();
}

type PriceHistoryEntry = { price: string; year: string };

const LAND_REGISTRY_SPARQL_ENDPOINT = 'https://landregistry.data.gov.uk/landregistry/query';

function parseSoldPrice(value: string): number | null {
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseSaleYear(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const direct = Number(trimmed);
  if (Number.isFinite(direct) && direct >= 1900 && direct <= 2100) return direct;
  const yearMatch = trimmed.match(/\b(19|20)\d{2}\b/);
  if (!yearMatch) return null;
  const extracted = Number(yearMatch[0]);
  return Number.isFinite(extracted) && extracted >= 1900 && extracted <= 2100 ? extracted : null;
}

function normalizePriceHistory(rawHistory: unknown): PriceHistoryEntry[] {
  if (!Array.isArray(rawHistory)) return [];
  return rawHistory
    .map((entry: any) => ({
      price: entry?.soldPrice || entry?.price || entry?.sold_price || '',
      year: entry?.year || entry?.date || entry?.soldDate || entry?.sold_date || '',
    }))
    .filter(e => parseSoldPrice(e.price) !== null && parseSaleYear(e.year) !== null)
    .map(e => ({ price: String(parseSoldPrice(e.price)), year: String(parseSaleYear(e.year)) }))
    .sort((a, b) => parseInt(a.year) - parseInt(b.year));
}

function extractStreetSearchFragment(listingAddress: string): string | null {
  const s = listingAddress.trim();
  if (!s || s === 'N/A') return null;
  const first = s.split(',')[0]?.trim() ?? s;
  const withoutFlat = first.replace(/^(Flat|Unit|Apartment|Suite)\s+[^,]+,?\s*/i, '').trim();
  const withoutLeading = withoutFlat.replace(/^\d+[A-Za-z]?\s+/, '').trim();
  return withoutLeading.length < 4 ? null : withoutLeading.toLowerCase();
}

type SparqlLiteral = { type: string; value: string; datatype?: string };
type SparqlBinding = Record<string, SparqlLiteral>;

function sparqlBindingString(binding: SparqlBinding, key: string): string | null {
  return binding[key]?.value ?? null;
}

function composeLandRegistryAddress(binding: SparqlBinding): string {
  const paon = sparqlBindingString(binding, 'paon');
  const saon = sparqlBindingString(binding, 'saon');
  const street = sparqlBindingString(binding, 'street');
  const town = sparqlBindingString(binding, 'town');
  const postcode = sparqlBindingString(binding, 'postcode');
  const line1 = [paon, saon].filter(Boolean).join(' ').trim();
  return [line1 || null, street, town, postcode].filter((p): p is string => !!p?.trim()).join(', ');
}

function escapeSparqlString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// FIX: Reduced timeout from 45s → 8s. The full address is a nice-to-have;
// it's not worth blocking the response for up to 3 minutes.
async function runLandRegistrySparql(query: string): Promise<SparqlBinding[]> {
  const url = new URL(LAND_REGISTRY_SPARQL_ENDPOINT);
  url.searchParams.set('query', query);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12000); // was 45000
  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/sparql-results+json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error('Land Registry SPARQL HTTP error:', res.status);
      return [];
    }
    const json = (await res.json()) as { results?: { bindings?: SparqlBinding[] } };
    return json.results?.bindings ?? [];
  } catch (e) {
    console.error('Land Registry SPARQL request failed:', e);
    return [];
  } finally {
    clearTimeout(t);
  }
}

async function getFullAddressFromLandRegistrySparql(
  fullPostcode: string | null,
  outcode: string | null,
  priceHistory: PriceHistoryEntry[],
  listingAddress: string
): Promise<string | null> {
  if (!priceHistory.length || (!fullPostcode && !outcode)) return null;

  const normalized = priceHistory
    .map(e => ({ price: parseSoldPrice(e.price), year: parseSaleYear(e.year) }))
    .filter((e): e is { price: number; year: number } => e.price !== null && e.year !== null);
  if (!normalized.length) return null;

  const streetFragment = extractStreetSearchFragment(listingAddress);
  const pcExact = fullPostcode?.trim().toUpperCase() ?? null;
  const outPrefix = !pcExact && outcode ? `${outcode.trim().toUpperCase()} ` : null;

  const buildQuery = () => {
    let postcodeBlock: string;
    if (pcExact) {
      postcodeBlock = `?addr common:postcode "${escapeSparqlString(pcExact)}" .`;
    } else if (outPrefix) {
      postcodeBlock = `?addr common:postcode ?lr_postcode .\n  FILTER(STRSTARTS(?lr_postcode, "${escapeSparqlString(outPrefix)}"))`;
    } else {
      return null;
    }
    return (price: number, year: number, streetFilter: string) => {
      const yStart = `${year}-01-01`;
      const yEnd = `${year}-12-31`;
      return `PREFIX lrppi: <http://landregistry.data.gov.uk/def/ppi/>
PREFIX common: <http://landregistry.data.gov.uk/def/common/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
SELECT ?paon ?saon ?street ?town ?postcode ?price ?date
WHERE {
  ?record a lrppi:TransactionRecord ;
          lrppi:pricePaid ?price ;
          lrppi:transactionDate ?date ;
          lrppi:propertyAddress ?addr .
  ?addr common:street ?street .
${postcodeBlock}
${streetFilter}
  FILTER(?price = ${price})
  FILTER(?date >= "${yStart}"^^xsd:date && ?date <= "${yEnd}"^^xsd:date)
  OPTIONAL { ?addr common:paon ?paon }
  OPTIONAL { ?addr common:saon ?saon }
  OPTIONAL { ?addr common:town ?town }
  OPTIONAL { ?addr common:postcode ?postcode }
}
LIMIT 5`;
    };
  };

  const mk = buildQuery();
  if (!mk) return null;

  for (const { price, year } of normalized) {
    const streetFilter = streetFragment
      ? `FILTER(CONTAINS(LCASE(?street), "${escapeSparqlString(streetFragment)}"))`
      : '';
    const tryQueries = streetFragment ? [mk(price, year, streetFilter), mk(price, year, '')] : [mk(price, year, '')];
    for (const query of tryQueries) {
      const bindings = await runLandRegistrySparql(query);
      if (bindings.length === 1) return composeLandRegistryAddress(bindings[0]);
      if (bindings.length > 1) break;
    }
  }
  return null;
}

async function fetchEpcRowsForPostcode(postcode: string): Promise<any[]> {
  if (!postcode || !process.env.EPC_API_EMAIL || !process.env.EPC_API_KEY) return [];
  try {
    const response = await fetch(
      `https://epc.opendatacommunities.org/api/v1/domestic/search?postcode=${encodeURIComponent(postcode)}`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Basic ${Buffer.from(`${process.env.EPC_API_EMAIL}:${process.env.EPC_API_KEY}`).toString('base64')}`,
        },
      }
    );
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data.rows) ? data.rows : [];
  } catch (error) {
    console.error('Error fetching EPC data:', error);
    return [];
  }
}

// FIX: EPC fetches now run in parallel per unique postcode instead of
// sequentially inside a for-loop. On 500 sales across ~50 unique postcodes
// this can save 20–60 seconds.
async function getAveragePricePerSqmForPropertyTypeAndOutcode(
  outcode: string | null,
  propertyTypeCode: 'D' | 'S' | 'T' | 'F' | 'O' | null
): Promise<{ simpleAverage: number | null; weightedAverage: number | null; matchedSaleCount: number } | null> {
  if (!outcode || !propertyTypeCode || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const dateString = twelveMonthsAgo.toISOString().split('T')[0];
    const prefix = outcode.toUpperCase();

    const { data: sales, error } = await supabase
      .from('price_paid_data')
      .select('paon, saon, street, postcode, price, date_of_transfer')
      .eq('property_type', propertyTypeCode)
      .gte('date_of_transfer', dateString)
      .gte('postcode', `${prefix} `)
      .lt('postcode', `${prefix}~`)
      .limit(500);

    if (error || !sales?.length) {
      return { simpleAverage: null, weightedAverage: null, matchedSaleCount: 0 };
    }

    // FIX: Collect all unique postcodes, fetch EPC data for all of them in
    // parallel, then build the cache map — replaces the sequential for-loop fetch.
    const uniquePostcodes = [...new Set(sales.map(s => s.postcode?.toUpperCase?.()).filter(Boolean))] as string[];
    const epcResults = await Promise.all(uniquePostcodes.map(pc => fetchEpcRowsForPostcode(pc)));
    const epcCache = new Map<string, any[]>(uniquePostcodes.map((pc, i) => [pc, epcResults[i]]));

    let sum = 0, count = 0, weightedNumerator = 0, weightedDenominator = 0;

    for (const sale of sales) {
      const salePostcode = sale.postcode?.toUpperCase?.() ?? null;
      if (!salePostcode) continue;
      const epcRows = epcCache.get(salePostcode);
      if (!epcRows?.length) continue;

      const targetAddress = normalizeAddress(`${sale.paon ?? ''} ${sale.saon ?? ''} ${sale.street ?? ''}`);
      if (!targetAddress) continue;

      const matchingRow = epcRows.find(row => {
        const candidates = [
          normalizeAddress(row.address1),
          normalizeAddress(row.address),
          normalizeAddress(row['address-line-1']),
        ].filter(Boolean) as string[];
        return candidates.some(c => c === targetAddress);
      });
      if (!matchingRow) continue;

      const floorArea = matchingRow['total-floor-area'] ? Number(matchingRow['total-floor-area']) : null;
      if (!floorArea || isNaN(floorArea) || floorArea <= 0) continue;

      const price = Number(sale.price);
      if (!Number.isFinite(price) || price <= 0) continue;

      const pricePerSqm = price / floorArea;
      sum += pricePerSqm;
      count += 1;
      weightedNumerator += price;
      weightedDenominator += floorArea;
    }

    if (count === 0) return { simpleAverage: null, weightedAverage: null, matchedSaleCount: 0 };

    return {
      simpleAverage: sum / count,
      weightedAverage: weightedDenominator > 0 ? weightedNumerator / weightedDenominator : null,
      matchedSaleCount: count,
    };
  } catch (error) {
    console.error('Error calculating price per sqm stats:', error);
    return null;
  }
}

async function getSalesCountPast12Months(fullPostcode: string | null): Promise<number | null> {
  if (!fullPostcode || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const { count, error } = await supabase
      .from('price_paid_data')
      .select('*', { count: 'exact', head: true })
      .eq('postcode', fullPostcode)
      .gte('date_of_transfer', twelveMonthsAgo.toISOString().split('T')[0]);
    if (error) { console.error('Error querying Supabase:', error); return null; }
    return count ?? null;
  } catch (error) {
    console.error('Error getting sales count from Supabase:', error);
    return null;
  }
}

async function getAveragePricesByYear(
  outcode: string | null,
  propertyTypeCode: 'D' | 'S' | 'T' | 'F' | 'O' | null
): Promise<{ yearlyAverages: Record<number, number>; overallAverage: number | null } | null> {
  if (!outcode || !propertyTypeCode || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const { data, error } = await supabase.rpc('get_average_price_by_year', {
      p_outcode: outcode.toUpperCase(),
      p_property_type: propertyTypeCode,
    });
    if (error || !data?.length) return { yearlyAverages: {}, overallAverage: null };

    const yearlyAverages: Record<number, number> = {};
    let totalWeightedSum = 0, totalCount = 0;

    for (const row of data as Array<{ year: number | string; avg_price: number | null; sale_count: number | null }>) {
      const yearNumber = Number(row.year);
      const averagePrice = row.avg_price !== null ? Number(row.avg_price) : null;
      const saleCount = row.sale_count !== null ? Number(row.sale_count) : 0;
      if (!Number.isFinite(yearNumber) || averagePrice === null || isNaN(averagePrice) || saleCount <= 0) continue;
      yearlyAverages[yearNumber] = averagePrice;
      totalWeightedSum += averagePrice * saleCount;
      totalCount += saleCount;
    }
    return { yearlyAverages, overallAverage: totalCount > 0 ? totalWeightedSum / totalCount : null };
  } catch (error) {
    console.error('Error getting average prices from Supabase:', error);
    return null;
  }
}

async function getPostcodeCoordinates(postcode: string): Promise<{ latitude: number | null; longitude: number | null }> {
  if (!postcode?.trim()) return { latitude: null, longitude: null };
  try {
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode.trim())}`);
    if (!response.ok) return { latitude: null, longitude: null };
    const data = await response.json();
    if (data.status === 200 && data.result) {
      return { latitude: data.result.latitude || null, longitude: data.result.longitude || null };
    }
    return { latitude: null, longitude: null };
  } catch (error) {
    console.error('Error fetching postcode coordinates:', error);
    return { latitude: null, longitude: null };
  }
}

// ─── Main route ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const missingApiKeys = [
      !process.env.APIFY_API_TOKEN && 'APIFY_API_TOKEN',
      !process.env.OPENAI_API_KEY && 'OPENAI_API_KEY',
    ].filter(Boolean) as string[];

    if (missingApiKeys.length > 0) {
      console.error('Server configuration: missing env vars:', missingApiKeys.join(', '));
      return NextResponse.json({ error: 'Server configuration error: Missing API keys' }, { status: 500 });
    }

    const body = await request.json();
    const { url, postcode } = body;
    if (!url) return NextResponse.json({ error: 'URL is required' }, { status: 400 });

    // Auth
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Limit check
    const missingSupabase = [
      !process.env.NEXT_PUBLIC_SUPABASE_URL && 'NEXT_PUBLIC_SUPABASE_URL',
      !process.env.SUPABASE_SERVICE_ROLE_KEY && 'SUPABASE_SERVICE_ROLE_KEY',
    ].filter(Boolean) as string[];
    if (missingSupabase.length > 0) {
      return NextResponse.json({ error: `Server configuration error: missing ${missingSupabase.join(', ')}` }, { status: 500 });
    }

    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('plan, property_reports_used, stripe_subscription_id, stripe_status')
      .eq('id', user.id)
      .maybeSingle();

    const isPro =
      profile?.plan === 'pro' ||
      (!!profile?.stripe_subscription_id && ['active', 'trialing'].includes(profile?.stripe_status ?? ''));
    const used = profile?.property_reports_used ?? 0;

    if (!isPro && used >= FREE_PROPERTY_LIMIT) {
      return NextResponse.json(
        { error: 'limit_reached', message: freeAnalysesLimitReachedMessage() },
        { status: 403 }
      );
    }

    // Apify scrape (unavoidable wait — this is network-bound)
    const apifyClient = new ApifyClient({ token: process.env.APIFY_API_TOKEN });
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    console.log('Starting Apify actor run for URL:', url);
    const run = await apifyClient.actor('dhrumil~rightmove-scraper').start({
      propertyUrls: [{ url }],
      fullPropertyDetails: true,
      includePriceHistory: true,
      monitoringMode: false,
      maxProperties: 1,
    });

    let runFinished = false;
    let attempts = 0;
    const maxAttempts = 60;
    while (!runFinished && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const runInfo = await apifyClient.run(run.id).get();
      if (!runInfo) return NextResponse.json({ error: 'Failed to get run info' }, { status: 500 });
      if (runInfo.status === 'SUCCEEDED') {
        runFinished = true;
      } else if (['FAILED', 'ABORTED'].includes(runInfo.status)) {
        return NextResponse.json({ error: `Apify run ${runInfo.status.toLowerCase()}` }, { status: 500 });
      }
      attempts++;
    }
    if (!runFinished) return NextResponse.json({ error: 'Apify run timed out' }, { status: 500 });

    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    if (!items?.length) return NextResponse.json({ error: 'No property data found' }, { status: 404 });

    const propertyData = items[0] as any;
    const priceHistory = normalizePriceHistory(propertyData.priceHistory);
    const propertyTypeCode = mapPropertyTypeToCode(propertyData.propertyType || null);
    const propertyLat = propertyData.coordinates?.latitude;
    const propertyLon = propertyData.coordinates?.longitude;

    // ─── FIX: All post-Apify enrichment runs in parallel ─────────────────────
    // Previously every call was sequential. Now we run two batches:
    //   Batch 1 — things that don't depend on each other at all
    //   Batch 2 — things that need the postcode from batch 1

    const [housePostcode, nearbyPlaces, postcodeCoords, area] = await Promise.all([
      propertyLat && propertyLon
        ? getPostcodeFromCoordinates(propertyLat, propertyLon)
        : Promise.resolve({ fullPostcode: null, outcode: null }),
      propertyLat && propertyLon
        ? getAllNearbyPlaces(propertyLat, propertyLon)
        : Promise.resolve({ schools: [], stations: [], parks: [], supermarkets: [], placesOfWorship: [], gyms: [], hospitals: [] }),
      getPostcodeCoordinates(postcode || ''),
      getArea(propertyData, propertyData.floorplans, propertyData.description, openai),
    ]);

    // Batch 2 — needs housePostcode from batch 1
    const [salesCountPast12Months, averagePriceData, pricePerSqmStats, matchedFullAddress] = await Promise.all([
      getSalesCountPast12Months(housePostcode.fullPostcode),
      getAveragePricesByYear(housePostcode.outcode, propertyTypeCode),
      getAveragePricePerSqmForPropertyTypeAndOutcode(housePostcode.outcode, propertyTypeCode),
      getFullAddressFromLandRegistrySparql(
        housePostcode.fullPostcode,
        housePostcode.outcode,
        priceHistory,
        propertyData.displayAddress || ''
      ),
    ]);

    // ─────────────────────────────────────────────────────────────────────────

    const distance =
      propertyLat && propertyLon && postcodeCoords.latitude !== null && postcodeCoords.longitude !== null
        ? calculateDistance(propertyLat, propertyLon, postcodeCoords.latitude, postcodeCoords.longitude)
        : null;

    const result = {
      propertyAddress: propertyData.displayAddress || 'N/A',
      fullAddress: matchedFullAddress || propertyData.displayAddress || 'N/A',
      price: propertyData.price || 'N/A',
      propertyType: propertyData.propertyType || 'N/A',
      bathrooms: propertyData.bathrooms?.toString() || 'N/A',
      bedrooms: propertyData.bedrooms?.toString() || 'N/A',
      area,
      timeOnMarket: propertyData.firstVisibleDate
        ? new Date(propertyData.firstVisibleDate as string).toLocaleDateString()
        : 'N/A',
      garden: checkFeature(propertyData.features, ['garden', 'patio', 'outdoor space', 'yard']),
      parking: checkFeature(propertyData.features, ['parking', 'driveway', 'off-street parking']),
      garage: checkFeature(propertyData.features, ['garage']),
      priceHistory: priceHistory.length > 0 ? priceHistory : null,
      latitude: propertyData.coordinates?.latitude?.toString() || 'N/A',
      longitude: propertyData.coordinates?.longitude?.toString() || 'N/A',
      preferredLatitude: postcodeCoords.latitude?.toString() || null,
      preferredLongitude: postcodeCoords.longitude?.toString() || null,
      preferredPostcode: postcode || null,
      distance: distance !== null ? distance.toFixed(2) : null,
      houseFullPostcode: housePostcode.fullPostcode,
      houseOutcode: housePostcode.outcode,
      nearbyPlaces,
      salesCountPast12Months,
      averagePriceByYear: averagePriceData?.yearlyAverages ?? null,
      averagePriceFiveYear: averagePriceData?.overallAverage ?? null,
      averagePricePerSqm: pricePerSqmStats?.weightedAverage ?? null,
      averagePricePerSqmSimple: pricePerSqmStats?.simpleAverage ?? null,
      averagePricePerSqmMatchedSaleCount: pricePerSqmStats?.matchedSaleCount ?? 0,
    };

    // Increment usage counter
    if (!isPro) {
      const newCount = used + 1;
      if (profile) {
        await supabaseAdmin.from('profiles').update({ property_reports_used: newCount }).eq('id', user.id);
      } else {
        await supabaseAdmin.from('profiles').insert({ id: user.id, plan: 'free', property_reports_used: 1 });
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error scraping property:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scrape property', details: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}
