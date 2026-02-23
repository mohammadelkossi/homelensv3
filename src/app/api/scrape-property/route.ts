import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ApifyClient } from 'apify-client';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

// Helper function to check features array for keywords
function checkFeature(features: string[] | undefined, keywords: string[]): string {
  if (!features || features.length === 0) return 'No';
  const lowerFeatures = features.map(f => f.toLowerCase());
  return keywords.some(keyword => 
    lowerFeatures.some(feature => feature.includes(keyword.toLowerCase()))
  ) ? 'Yes' : 'No';
}

// Helper function to map property type string to Supabase property type code
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

// Helper function to extract area from floorplan using GPT-4 Vision
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
              image_url: {
                url: floorplanUrl,
              },
            },
          ],
        },
      ],
      max_tokens: 50,
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (result && result !== 'NOT_FOUND' && !isNaN(parseFloat(result))) {
      return result;
    }
    return null;
  } catch (error) {
    console.error('Error extracting area from floorplan:', error);
    return null;
  }
}

// Helper function to extract area from description using GPT
async function extractAreaFromDescription(description: string, openaiClient: OpenAI): Promise<string | null> {
  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4',
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
    if (result && result !== 'NOT_FOUND' && !isNaN(parseFloat(result))) {
      return result;
    }
    return null;
  } catch (error) {
    console.error('Error extracting area from description:', error);
    return null;
  }
}

// Helper function to get area with fallback logic
async function getArea(
  apifyData: any,
  floorplans: any[] | undefined,
  description: string | undefined,
  openaiClient: OpenAI
): Promise<string> {
  // First, check if Apify returned area in square feet and convert to square metres
  if (apifyData.sizeSqFeetMin) {
    const sqFeet = apifyData.sizeSqFeetMin;
    const sqMetres = (sqFeet * 0.092903).toFixed(2);
    return sqMetres;
  }
  if (apifyData.sizeSqFeetMax) {
    const sqFeet = apifyData.sizeSqFeetMax;
    const sqMetres = (sqFeet * 0.092903).toFixed(2);
    return sqMetres;
  }

  // Second, try floorplan
  if (floorplans && floorplans.length > 0 && floorplans[0].url) {
    const area = await extractAreaFromFloorplan(floorplans[0].url, openaiClient);
    if (area) {
      return area;
    }
  }

  // Third, try description
  if (description) {
    const area = await extractAreaFromDescription(description, openaiClient);
    if (area) {
      return area;
    }
  }

  return 'N/A';
}

// Helper function to calculate distance using Haversine formula
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  
  return distance;
}

// Helper function to convert degrees to radians
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Helper function to get postcode from coordinates using Google Maps Geocoding API
async function getPostcodeFromCoordinates(latitude: number, longitude: number): Promise<{ fullPostcode: string | null; outcode: string | null }> {
  if (!latitude || !longitude || !process.env.GOOGLE_MAPS_API_KEY) {
    return { fullPostcode: null, outcode: null };
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );

    if (!response.ok) {
      return { fullPostcode: null, outcode: null };
    }

    const data = await response.json();

    // Check if status is OK and results exist
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      // Look through results for postal_code (not postal_code_prefix)
      for (const result of data.results) {
        if (result.address_components) {
          for (const component of result.address_components) {
            // Find full postcode (not just prefix)
            if (component.types && component.types.includes('postal_code') && !component.types.includes('postal_code_prefix')) {
              const fullPostcode = component.long_name || component.short_name;
              
              // Extract outcode (first part before space, e.g., "OL2 8JR" -> "OL2")
              let outcode: string | null = null;
              if (fullPostcode) {
                const parts = fullPostcode.trim().split(' ');
                outcode = parts[0] || null;
              }

              return {
                fullPostcode: fullPostcode || null,
                outcode: outcode
              };
            }
          }
        }
      }
    }

    return { fullPostcode: null, outcode: null };
  } catch (error) {
    // On any error, return null and continue
    console.error('Error fetching postcode from coordinates:', error);
    return { fullPostcode: null, outcode: null };
  }
}

// Helper function to get nearby places using Google Places API
async function getNearbyPlaces(
  latitude: number,
  longitude: number,
  type: string,
  maxResults: number = 3
): Promise<Array<{ name: string; distance: number; address: string; rating?: number }>> {
  if (!latitude || !longitude || !process.env.GOOGLE_MAPS_API_KEY) {
    return [];
  }

  try {
    const radius = 5000; // 5km radius
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=${type}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return [];
    }

    // Calculate distance for each result and sort
    const placesWithDistance = data.results.map((place: any) => {
      const placeLat = place.geometry?.location?.lat;
      const placeLng = place.geometry?.location?.lng;
      
      let distance = 0;
      if (placeLat && placeLng) {
        distance = calculateDistance(latitude, longitude, placeLat, placeLng);
      }

      return {
        name: place.name || 'Unknown',
        distance: distance,
        address: place.vicinity || place.formatted_address || 'Address not available',
        rating: place.rating || undefined,
      };
    });

    // Sort by distance and take top results
    placesWithDistance.sort((a: any, b: any) => a.distance - b.distance);
    return placesWithDistance.slice(0, maxResults);
  } catch (error) {
    console.error(`Error fetching nearby ${type} places:`, error);
    return [];
  }
}

// Helper function to get all nearby amenities
async function getAllNearbyPlaces(
  latitude: number,
  longitude: number
): Promise<{
  schools: Array<{ name: string; distance: number; address: string; rating?: number }>;
  stations: Array<{ name: string; distance: number; address: string; rating?: number }>;
  parks: Array<{ name: string; distance: number; address: string; rating?: number }>;
  supermarkets: Array<{ name: string; distance: number; address: string; rating?: number }>;
  placesOfWorship: Array<{ name: string; distance: number; address: string; rating?: number }>;
  gyms: Array<{ name: string; distance: number; address: string; rating?: number }>;
  hospitals: Array<{ name: string; distance: number; address: string; rating?: number }>;
}> {
  // Search for all categories in parallel
  const [schools, stations, parks, supermarkets, churches, mosques, synagogues, hinduTemples, gyms, hospitals] = await Promise.all([
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

  // Combine all worship places, sort by distance, take top 3
  const allWorshipPlaces = [...churches, ...mosques, ...synagogues, ...hinduTemples];
  allWorshipPlaces.sort((a, b) => a.distance - b.distance);
  const placesOfWorship = allWorshipPlaces.slice(0, 3);

  return {
    schools,
    stations,
    parks,
    supermarkets,
    placesOfWorship,
    gyms,
    hospitals,
  };
}

function normalizeAddress(value: string | null | undefined): string | null {
  if (!value) return null;
  return value
    .toLowerCase()
    .replace(/,/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchEpcRowsForPostcode(postcode: string): Promise<any[]> {
  if (
    !postcode ||
    !process.env.EPC_API_EMAIL ||
    !process.env.EPC_API_KEY
  ) {
    return [];
  }

  try {
    const response = await fetch(
      `https://epc.opendatacommunities.org/api/v1/domestic/search?postcode=${encodeURIComponent(
        postcode
      )}`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Basic ${Buffer.from(
            `${process.env.EPC_API_EMAIL}:${process.env.EPC_API_KEY}`
          ).toString('base64')}`,
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return Array.isArray(data.rows) ? data.rows : [];
  } catch (error) {
    console.error('Error fetching EPC data:', error);
    return [];
  }
}

async function getAveragePricePerSqmForPropertyTypeAndOutcode(
  outcode: string | null,
  propertyTypeCode: 'D' | 'S' | 'T' | 'F' | 'O' | null
): Promise<{
  simpleAverage: number | null;
  weightedAverage: number | null;
  matchedSaleCount: number;
} | null> {
  if (
    !outcode ||
    !propertyTypeCode ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return null;
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const dateString = twelveMonthsAgo.toISOString().split('T')[0];

    const prefix = outcode.toUpperCase();
    const lowerBound = `${prefix} `;
    const upperBound = `${prefix}~`;

    const { data: sales, error } = await supabase
      .from('price_paid_data')
      .select('paon, saon, street, postcode, price, date_of_transfer')
      .eq('property_type', propertyTypeCode)
      .gte('date_of_transfer', dateString)
      .gte('postcode', lowerBound)
      .lt('postcode', upperBound)
      .limit(500);

    if (error) {
      console.error('Error querying Supabase for price/m² stats:', error);
      return null;
    }

    if (!sales || sales.length === 0) {
      return {
        simpleAverage: null,
        weightedAverage: null,
        matchedSaleCount: 0,
      };
    }

    const epcCache = new Map<string, any[]>();

    let sum = 0;
    let count = 0;
    let weightedNumerator = 0;
    let weightedDenominator = 0;

    for (const sale of sales) {
      const salePostcode = sale.postcode?.toUpperCase?.() ?? null;
      if (!salePostcode) continue;

      let epcRows = epcCache.get(salePostcode);
      if (!epcRows) {
        epcRows = await fetchEpcRowsForPostcode(salePostcode);
        epcCache.set(salePostcode, epcRows);
      }

      if (!epcRows || epcRows.length === 0) continue;

      const targetAddress = normalizeAddress(
        `${sale.paon ?? ''} ${sale.saon ?? ''} ${sale.street ?? ''}`
      );

      if (!targetAddress) continue;

      const matchingRow = epcRows.find((row) => {
        const candidates = [
          normalizeAddress(row.address1),
          normalizeAddress(row.address),
          normalizeAddress(row['address-line-1']),
        ].filter(Boolean) as string[];

        return candidates.some((candidate) => candidate === targetAddress);
      });

      if (!matchingRow) continue;

      const floorArea = matchingRow['total-floor-area']
        ? Number(matchingRow['total-floor-area'])
        : null;

      if (!floorArea || Number.isNaN(floorArea) || floorArea <= 0) continue;

      const price = Number(sale.price);
      if (!Number.isFinite(price) || price <= 0) continue;

      const pricePerSqm = price / floorArea;

      sum += pricePerSqm;
      count += 1;
      weightedNumerator += price;
      weightedDenominator += floorArea;
    }

    if (count === 0) {
      return {
        simpleAverage: null,
        weightedAverage: null,
        matchedSaleCount: 0,
      };
    }

    const simpleAverage = sum / count;
    const weightedAverage =
      weightedDenominator > 0 ? weightedNumerator / weightedDenominator : null;

    return {
      simpleAverage,
      weightedAverage,
      matchedSaleCount: count,
    };
  } catch (error) {
    console.error('Error calculating price per sqm stats:', error);
    return null;
  }
}

// Helper function to get sales count from Supabase
async function getSalesCountPast12Months(fullPostcode: string | null): Promise<number | null> {
  if (!fullPostcode || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Calculate date 12 months ago
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const dateString = twelveMonthsAgo.toISOString().split('T')[0]; // Format as YYYY-MM-DD

    // Query Supabase for count of sales in past 12 months
    const { count, error } = await supabase
      .from('price_paid_data')
      .select('*', { count: 'exact', head: true })
      .eq('postcode', fullPostcode)
      .gte('date_of_transfer', dateString);

    if (error) {
      console.error('Error querying Supabase:', error);
      return null;
    }

    return count ?? null;
  } catch (error) {
    console.error('Error getting sales count from Supabase:', error);
    return null;
  }
}

// Helper function to get average prices by year from Supabase
async function getAveragePricesByYear(outcode: string | null, propertyTypeCode: 'D' | 'S' | 'T' | 'F' | 'O' | null): Promise<{ yearlyAverages: Record<number, number>; overallAverage: number | null } | null> {
  if (!outcode || !propertyTypeCode || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase.rpc('get_average_price_by_year', {
      p_outcode: outcode.toUpperCase(),
      p_property_type: propertyTypeCode,
    });

    if (error) {
      console.error('Error querying Supabase for averages:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return { yearlyAverages: {}, overallAverage: null };
    }

    const yearlyAverages: Record<number, number> = {};
    let totalWeightedSum = 0;
    let totalCount = 0;

    const rows = data as Array<{ year: number | string; avg_price: number | null; sale_count: number | null }>;
    for (const row of rows) {
      const yearNumber = Number(row.year);
      const averagePrice = row.avg_price !== null ? Number(row.avg_price) : null;
      const saleCount = row.sale_count !== null ? Number(row.sale_count) : 0;

      if (!Number.isFinite(yearNumber) || averagePrice === null || Number.isNaN(averagePrice) || saleCount <= 0) {
        continue;
      }

      yearlyAverages[yearNumber] = averagePrice;
      totalWeightedSum += averagePrice * saleCount;
      totalCount += saleCount;
    }

    const overallAverage = totalCount > 0 ? totalWeightedSum / totalCount : null;

    return { yearlyAverages, overallAverage };
  } catch (error) {
    console.error('Error getting average prices from Supabase:', error);
    return null;
  }
}
// Helper function to get coordinates from postcode.io
async function getPostcodeCoordinates(postcode: string): Promise<{ latitude: number | null; longitude: number | null }> {
  if (!postcode || postcode.trim() === '') {
    return { latitude: null, longitude: null };
  }

  try {
    // URL encode the postcode (e.g., spaces become %20)
    const encodedPostcode = encodeURIComponent(postcode.trim());
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodedPostcode}`);
    
    if (!response.ok) {
      // If 404 or any error, return null values
      return { latitude: null, longitude: null };
    }

    const data = await response.json();
    
    // Check if status is 200 and result exists
    if (data.status === 200 && data.result) {
      return {
        latitude: data.result.latitude || null,
        longitude: data.result.longitude || null,
      };
    }
    
    // If result doesn't exist or invalid structure, return null
    return { latitude: null, longitude: null };
  } catch (error) {
    // On any error (network, parsing, etc.), return null and continue
    console.error('Error fetching postcode coordinates:', error);
    return { latitude: null, longitude: null };
  }
}

const FREE_PROPERTY_LIMIT = 3;

export async function POST(request: NextRequest) {
  try {
    // Check if environment variables are set
    const missingApiKeys = [
      !process.env.APIFY_API_TOKEN && 'APIFY_API_TOKEN',
      !process.env.OPENAI_API_KEY && 'OPENAI_API_KEY',
    ].filter(Boolean) as string[];
    if (missingApiKeys.length > 0) {
      console.error('Server configuration: missing env vars:', missingApiKeys.join(', '));
      return NextResponse.json(
        { error: 'Server configuration error: Missing API keys' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { url, postcode } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Auth: require signed-in user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Free-tier limit: check profile (plan, property_reports_used).
    // Ensure profiles has: property_reports_used (integer, default 0).
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const missingSupabase = [
      !supabaseUrl && 'NEXT_PUBLIC_SUPABASE_URL',
      !serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
    ].filter(Boolean) as string[];
    if (missingSupabase.length > 0) {
      console.error('Server configuration: missing env vars:', missingSupabase.join(', '));
      return NextResponse.json(
        { error: `Server configuration error: missing ${missingSupabase.join(', ')}. Add these in Vercel → Project → Settings → Environment Variables.` },
        { status: 500 }
      );
    }
    const supabaseAdmin = createClient(supabaseUrl as string, serviceRoleKey as string);
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('plan, property_reports_used, stripe_subscription_id, stripe_status')
      .eq('id', user.id)
      .maybeSingle();

    const planValue = profile?.plan ?? 'free';
    const hasActiveSubscription =
      !!profile?.stripe_subscription_id &&
      (profile?.stripe_status === 'active' || profile?.stripe_status === 'trialing');
    const isPro = planValue === 'pro' || hasActiveSubscription;
    const used = profile?.property_reports_used ?? 0;

    if (!isPro && used >= FREE_PROPERTY_LIMIT) {
      return NextResponse.json(
        {
          error: 'limit_reached',
          message: "You've used your 3 free property analyses. Upgrade to Pro to continue.",
        },
        { status: 403 }
      );
    }

    // Initialize clients inside the function to ensure env vars are loaded
    const apifyClient = new ApifyClient({
      token: process.env.APIFY_API_TOKEN,
    });

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log('Starting Apify actor run for URL:', url);

    // Start Apify actor run
    const run = await apifyClient.actor('dhrumil~rightmove-scraper').start({
      propertyUrls: [{ url }],
      fullPropertyDetails: true,
      includePriceHistory: true,
      monitoringMode: false,
      maxProperties: 1,
    });
    
    console.log('Apify run started with ID:', run.id);

    // Wait for the run to finish
    let runFinished = false;
    let attempts = 0;
    const maxAttempts = 60; // Wait up to 5 minutes (60 * 5 seconds)

    while (!runFinished && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const runInfo = await apifyClient.run(run.id).get();
      if (!runInfo) {
        return NextResponse.json(
          { error: 'Failed to get run info' },
          { status: 500 }
        );
      }
      if (runInfo.status === 'SUCCEEDED') {
        runFinished = true;
      } else if (runInfo.status === 'FAILED' || runInfo.status === 'ABORTED') {
        return NextResponse.json(
          { error: `Apify run ${runInfo.status.toLowerCase()}` },
          { status: 500 }
        );
      }
      attempts++;
    }

    if (!runFinished) {
      return NextResponse.json(
        { error: 'Apify run timed out' },
        { status: 500 }
      );
    }

    // Fetch dataset items
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'No property data found' },
        { status: 404 }
      );
    }

    const propertyData = items[0] as any;

    // Extract area with fallback
    const area = await getArea(
      propertyData,
      propertyData.floorplans as any[] | undefined,
      propertyData.description as string | undefined,
      openai
    );

    // Process price history - sort by year ascending (earliest first)
    let priceHistory: Array<{ price: string; year: string }> = [];
    if (propertyData.priceHistory && Array.isArray(propertyData.priceHistory) && propertyData.priceHistory.length > 0) {
      priceHistory = propertyData.priceHistory
        .map((entry: any) => ({
          price: entry.soldPrice || '',
          year: entry.year || '',
        }))
        .filter((entry: { price: string; year: string }) => entry.price && entry.year)
        .sort((a: { year: string }, b: { year: string }) => parseInt(a.year) - parseInt(b.year)); // Sort ascending (earliest first)
    }

    // Get postcode from property coordinates using Google Maps Geocoding API
    const propertyLat = propertyData.coordinates?.latitude;
    const propertyLon = propertyData.coordinates?.longitude;
    const housePostcode = propertyLat && propertyLon 
      ? await getPostcodeFromCoordinates(propertyLat, propertyLon)
      : { fullPostcode: null, outcode: null };

    // Get sales count from Supabase for past 12 months
    const salesCountPast12Months = await getSalesCountPast12Months(housePostcode.fullPostcode);

    const propertyTypeCode = mapPropertyTypeToCode(propertyData.propertyType || null);
    const averagePriceData = await getAveragePricesByYear(housePostcode.outcode, propertyTypeCode);
    if (!averagePriceData) {
      console.warn('Average price data unavailable', { outcode: housePostcode.outcode, propertyType: propertyData.propertyType, propertyTypeCode });
    }

    const pricePerSqmStats = await getAveragePricePerSqmForPropertyTypeAndOutcode(
      housePostcode.outcode,
      propertyTypeCode
    );

    // Get nearby places (amenities) for all categories
    const nearbyPlaces = propertyLat && propertyLon
      ? await getAllNearbyPlaces(propertyLat, propertyLon)
      : {
          schools: [],
          stations: [],
          parks: [],
          supermarkets: [],
          placesOfWorship: [],
          gyms: [],
          hospitals: [],
        };

    // Get postcode coordinates from postcode.io (if postcode provided)
    const postcodeCoords = await getPostcodeCoordinates(postcode || '');

    // Calculate distance between property and preferred address (if both coordinates exist)
    let distance: number | null = null;
    
    if (
      propertyLat &&
      propertyLon &&
      postcodeCoords.latitude !== null &&
      postcodeCoords.longitude !== null
    ) {
      distance = calculateDistance(
        propertyLat,
        propertyLon,
        postcodeCoords.latitude,
        postcodeCoords.longitude
      );
    }

    // Extract all required fields
    const result = {
      propertyAddress: propertyData.displayAddress || 'N/A',
      price: propertyData.price || 'N/A',
      propertyType: propertyData.propertyType || 'N/A',
      bathrooms: propertyData.bathrooms?.toString() || 'N/A',
      bedrooms: propertyData.bedrooms?.toString() || 'N/A',
      area: area,
      timeOnMarket: propertyData.firstVisibleDate 
        ? new Date(propertyData.firstVisibleDate as string).toLocaleDateString()
        : 'N/A',
      garden: checkFeature(propertyData.features as string[] | undefined, ['garden', 'patio', 'outdoor space', 'yard']),
      parking: checkFeature(propertyData.features as string[] | undefined, ['parking', 'driveway', 'off-street parking']),
      garage: checkFeature(propertyData.features as string[] | undefined, ['garage']),
      priceHistory: priceHistory.length > 0 ? priceHistory : null,
      latitude: propertyData.coordinates?.latitude?.toString() || 'N/A',
      longitude: propertyData.coordinates?.longitude?.toString() || 'N/A',
      preferredLatitude: postcodeCoords.latitude?.toString() || null,
      preferredLongitude: postcodeCoords.longitude?.toString() || null,
      preferredPostcode: postcode || null,
      distance: distance !== null ? distance.toFixed(2) : null,
      houseFullPostcode: housePostcode.fullPostcode,
      houseOutcode: housePostcode.outcode,
      nearbyPlaces: nearbyPlaces,
      salesCountPast12Months: salesCountPast12Months,
      averagePriceByYear: averagePriceData ? averagePriceData.yearlyAverages : null,
      averagePriceFiveYear: averagePriceData ? averagePriceData.overallAverage : null,
      averagePricePerSqm: pricePerSqmStats ? pricePerSqmStats.weightedAverage : null,
      averagePricePerSqmSimple: pricePerSqmStats ? pricePerSqmStats.simpleAverage : null,
      averagePricePerSqmMatchedSaleCount: pricePerSqmStats ? pricePerSqmStats.matchedSaleCount : 0,
    };

    // Increment free-tier usage after successful report
    if (!isPro) {
      const newCount = used + 1;
      if (profile) {
        await supabaseAdmin
          .from('profiles')
          .update({ property_reports_used: newCount })
          .eq('id', user.id);
      } else {
        await supabaseAdmin.from('profiles').insert({
          id: user.id,
          plan: 'free',
          property_reports_used: 1,
        });
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error scraping property:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to scrape property',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
