import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ApifyClient } from 'apify-client';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { calculateDistanceKm, nearbyPlacesFromApify } from '@/lib/nearby-amenities';
import {
  hasFreeReportLimitReached,
  reportLimitReachedMessage,
  isProProfile,
} from '@/lib/report-generation';
import { mapPropertyTypeToCode } from '@/lib/property-type';
import { constructionAgeBandToRange } from '@/lib/epc';
import { getPricePaidDataEffectiveToday } from '@/lib/price-paid-data-clock';
import {
  normalizeAddress,
  fetchEpcRowsForPostcode,
  extractFloorArea,
  fetchEpcCertificateDocument,
} from '@/lib/epc-register';

export const maxDuration = 60;

// ─── Helpers (unchanged) ────────────────────────────────────────────────────

function checkFeature(features: string[] | undefined, keywords: string[]): string {
  if (!features || features.length === 0) return 'No';
  const lowerFeatures = features.map(f => f.toLowerCase());
  return keywords.some(keyword =>
    lowerFeatures.some(feature => feature.includes(keyword.toLowerCase()))
  ) ? 'Yes' : 'No';
}

// Rightmove's own structured tenure field — only shown when it's one of the three
// known values; anything else (null, or a future value this doesn't recognise)
// abstains rather than guess, since there's no independent source to cross-check
// tenure against (unlike EPC rating/address, which have the register + SPARQL).
function normalizeTenure(rawTenure: unknown): string | null {
  if (typeof rawTenure !== 'string') return null;
  switch (rawTenure.toUpperCase()) {
    case 'FREEHOLD':
      return 'Freehold';
    case 'LEASEHOLD':
      return 'Leasehold';
    case 'SHARE_OF_FREEHOLD':
      return 'Share of freehold';
    default:
      return null;
  }
}


// ─── FIX 1: Run floorplan + description extraction in parallel ───────────────
// Previously: sequential fallback (floorplan → description). Now both run at
// once and we take the first non-null result. Also downgraded description call
// from gpt-4 → gpt-4o-mini (10x cheaper, fast enough for simple text search).

// Fallback for when the EPC register lookup (postcode search + address match,
// see matchSubjectEpcRow) can't resolve a certificate — typically because
// Rightmove's own listing address has no house number to disambiguate between
// several certificates on the same street. Rightmove renders the specific
// certificate for THIS listing as a chart image (no address-matching needed,
// since Rightmove already knows which certificate is this property's own), so
// reading the band off that image sidesteps the whole disambiguation problem.
// Only gets the current rating letter — construction age band and floor area
// aren't legible from this chart, so those still rely on the register lookup.
async function extractEpcBandFromImage(epcImageUrl: string, openaiClient: OpenAI): Promise<string | null> {
  try {
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are analyzing a UK property Energy Performance Certificate (EPC) rating chart image. It shows a vertical bar split into colour bands labelled A (most efficient, top) through G (least efficient, bottom). One or two pointer arrows mark where the property sits on the bar. If there are two arrows, one marks the "Current" rating and the other marks the "Potential" rating — you must read the "Current" one only, ignore "Potential".
Respond with ONLY the single current rating letter (A, B, C, D, E, F, or G). If you cannot clearly identify the current rating from the image, respond with "NOT_FOUND".
Format your response as a single letter only (e.g., "D" or "NOT_FOUND").`,
            },
            {
              type: 'image_url',
              image_url: { url: epcImageUrl },
            },
          ],
        },
      ],
      max_tokens: 10,
    });
    const result = response.choices[0]?.message?.content?.trim().toUpperCase();
    if (result && /^[A-G]$/.test(result)) return result;
    return null;
  } catch (error) {
    console.error('Error extracting EPC band from image:', error);
    return null;
  }
}

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

async function getPostcodeFromCoordinates(
  latitude: number,
  longitude: number
): Promise<{
  fullPostcode: string | null
  outcode: string | null
  region: string | null
  country: string | null
}> {
  if (!latitude || !longitude) {
    return { fullPostcode: null, outcode: null, region: null, country: null };
  }
  try {
    const url = new URL('https://api.postcodes.io/postcodes');
    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lon', String(longitude));
    url.searchParams.set('limit', '1');
    const response = await fetch(url.toString());
    if (!response.ok) return { fullPostcode: null, outcode: null, region: null, country: null };
    const data = await response.json();
    const result = data.status === 200 ? data.result?.[0] : null;
    const fullPostcode = result?.postcode ?? null;
    if (!fullPostcode) return { fullPostcode: null, outcode: null, region: null, country: null };
    const outcode = fullPostcode.trim().split(' ')[0] ?? null;
    return {
      fullPostcode,
      outcode,
      region: typeof result?.region === 'string' ? result.region : null,
      country: typeof result?.country === 'string' ? result.country : null,
    };
  } catch (error) {
    console.error('Error fetching postcode from coordinates:', error);
    return { fullPostcode: null, outcode: null, region: null, country: null };
  }
}

// ─── Address / price helpers (unchanged) ────────────────────────────────────

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
  const segments = s.split(',').map((seg) => seg.trim()).filter(Boolean);
  if (segments.length === 0) return null;

  const first = segments[0];
  const withoutFlat = first.replace(/^(Flat|Unit|Apartment|Suite)\s+[^,]+,?\s*/i, '').trim();
  const withoutLeading = withoutFlat.replace(/^\d+[A-Za-z]?\s+/, '').trim();
  if (withoutLeading.length >= 4) return withoutLeading.toLowerCase();

  // Some addresses (e.g. Land Registry's composed "9, Hopwood Bank, Leeds, LS18")
  // put the house number and street in separate segments rather than "9 Hopwood
  // Bank" together — if the first segment is just a bare number, the street is
  // the next segment instead.
  if (/^\d+[A-Za-z]?$/.test(first) && segments[1] && segments[1].length >= 4) {
    return segments[1].toLowerCase();
  }

  return null;
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

// Last-resort full-address fallback for when the Land Registry SPARQL match above
// has nothing to go on (no sold-price history at all — roughly half of current
// listings) or comes back empty. Runs the "Rightmove EPC Full Address Finder" Apify
// actor, which reads the property's own EPC certificate image via vision and
// cross-matches it against the EPC register for that outcode/incode — so unlike the
// SPARQL path, it needs no price history and isn't thrown off by a coordinate-derived
// postcode drifting onto a neighbouring address.
type EpcFinderActorResult = {
  fullAddress?: string;
  possibleAddresses?: string[];
  epcMatched?: 'accurate' | 'approx' | 'none';
};

async function getFullAddressFromEpcFinderActor(
  apifyClient: ApifyClient,
  outcode: string | null,
  incode: string | null,
  propertyType: string | null,
  epcImageUrl: string | null,
  waitSecs: number
): Promise<string | null> {
  if (!outcode || !incode || !propertyType || !epcImageUrl || !process.env.OPENAI_API_KEY) return null;

  try {
    const run = await apifyClient.actor('dhrumil~rightmove-epc-full-address-finder').call(
      {
        openAiApiKey: process.env.OPENAI_API_KEY,
        propertyType,
        epc: epcImageUrl,
        outcode,
        incode,
        populateHistory: false,
        onlyMatched: false,
      },
      { waitSecs }
    );

    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
    const result = items?.[0] as EpcFinderActorResult | undefined;
    if (!result?.fullAddress) return null;

    // "accurate" can still come back alongside several possibleAddresses (e.g. a
    // terrace where several EPC certificates share the same rating/floor area) —
    // that's an ambiguous match wearing a confident label, so abstain rather than
    // guess, consistent with matchSubjectEpcRow's approach elsewhere in this file.
    if (result.possibleAddresses && result.possibleAddresses.length > 1) return null;
    if (result.epcMatched !== 'accurate') return null;

    return result.fullAddress;
  } catch (error) {
    console.error('Error running EPC full-address-finder actor:', error);
    return null;
  }
}

// Pull a leading house number / flat identifier off a listing address, e.g.
// "Flat 3, Example House, Example Street" → "3", "12a Example Street" → "12a".
// Used as an extra discriminator when matching EPC rows, since (unlike the
// Land Registry query) there's no price+year to disambiguate multiple units
// sharing a postcode and street name.
function extractHouseNumberFragment(listingAddress: string): string | null {
  const first = listingAddress.trim().split(',')[0]?.trim();
  if (!first) return null;
  const flatMatch = first.match(/^(?:Flat|Unit|Apartment|Suite)\s+([^,]+)/i);
  if (flatMatch) return flatMatch[1].trim().toLowerCase();
  const numberMatch = first.match(/^(\d+[A-Za-z]?)\b/);
  return numberMatch ? numberMatch[1].toLowerCase() : null;
}

const UK_POSTCODE_OR_OUTCODE = /^[A-Z]{1,2}\d[A-Z\d]?(\s*\d[A-Z]{2})?$/i;
const UK_FULL_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/;

// The listing's own postcode: Rightmove's outcode + incode fields first, else a
// full postcode written into the display address ("Wolfreton Garth, Kirk Ella, HU10 7AD").
function listingPostcode(listing: { outcode?: unknown; incode?: unknown; displayAddress?: unknown }): string | null {
  const outcode = typeof listing.outcode === 'string' ? listing.outcode.trim().toUpperCase() : '';
  const incode = typeof listing.incode === 'string' ? listing.incode.trim().toUpperCase() : '';
  const fromFields = `${outcode} ${incode}`;
  if (UK_FULL_POSTCODE.test(fromFields)) return fromFields;

  const address = typeof listing.displayAddress === 'string' ? listing.displayAddress : '';
  const match = address.match(/\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i);
  return match ? `${match[1].toUpperCase()} ${match[2].toUpperCase()}` : null;
}

// EPC rows often carry only line 1 + postcode (no town), e.g. "61 King Edward
// Crescent, LS18 4BE". The listing's own displayAddress ("King Edward Crescent,
// Horsforth, Leeds") has the locality, so borrow any parts the row is missing.
function composeEpcAddress(row: Record<string, unknown>, listingAddress: string): string | null {
  const lines = [row['addressLine1'], row['addressLine2'], row['addressLine3'], row['addressLine4']]
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean);
  const postcode = typeof row['postcode'] === 'string' ? row['postcode'].trim() : '';
  if (!lines.length && !postcode) return null;

  const present = lines.join(' ').toLowerCase();
  const locality = listingAddress
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p && !UK_POSTCODE_OR_OUTCODE.test(p) && !present.includes(p.toLowerCase()));

  return [...lines, ...locality, postcode].filter(Boolean).join(', ');
}

// Fallback full-address match against the EPC register, used when the Land
// Registry price-paid match comes back null (property never sold, or the
// match was ambiguous). No price/year to filter with here, so we narrow by
// exact postcode (fetchEpcRowsForPostcode) + street-name fragment, plus a
// house/flat number fragment when the listing address has one. Only accepts
// the match if exactly one distinct address survives the filter.
// Shared EPC match for the subject property — used both to resolve its full
// address (when Land Registry's SPARQL match comes back null) and to read its
// own rating/age-band/floor-area. One match, reused for both, so the address
// and the header facts can never come from two different certificates.
async function matchSubjectEpcRow(
  fullPostcode: string | null,
  listingAddress: string
): Promise<Record<string, unknown> | null> {
  if (!fullPostcode) return null;

  const rows = await fetchEpcRowsForPostcode(fullPostcode.trim().toUpperCase());
  if (!rows.length) return null;

  const streetFragment = extractStreetSearchFragment(listingAddress);
  const numberFragment = extractHouseNumberFragment(listingAddress);

  if (streetFragment) {
    // Keyed by certificateNumber (always unique), not by normalized address —
    // two certificates for the same property can normalize to the identical
    // string (e.g. "4, Greenbanks Drive" and "4 Greenbanks Drive" both become
    // "4 greenbanks drive" once commas are stripped), which would otherwise
    // silently collapse them to one entry via Map overwrite and skip the
    // most-recent-certificate resolution below entirely.
    const matches: Record<string, unknown>[] = []
    const normalizedByMatch = new Map<Record<string, unknown>, string>()
    for (const row of rows) {
      const combined = [row['addressLine1'], row['addressLine2'], row['addressLine3'], row['addressLine4']]
        .filter(Boolean)
        .join(' ');
      const normalized = normalizeAddress(combined || undefined);
      if (!normalized || !normalized.includes(streetFragment)) continue;
      if (numberFragment) {
        // Exact match on the leading house/flat number, not substring — "9" must
        // not match "29 Hopwood Bank" just because "29" contains the digit "9".
        const leadingNumber = normalized.match(/^(\d+[a-z]?)\b/)?.[1];
        if (leadingNumber !== numberFragment) continue;
      }
      matches.push(row);
      normalizedByMatch.set(row, normalized);
    }

    if (matches.length === 1) return matches[0];

    // A property re-certified over the years gets a new EPC each time, often
    // with slightly different address formatting between certs — if every
    // match normalizes to the same address, or shares the same UPRN, it's
    // unambiguously one property; just take its most recent certificate.
    if (matches.length > 1) {
      const distinctAddresses = new Set(matches.map((row) => normalizedByMatch.get(row)))
      const uprns = new Set(matches.map((row) => row['uprn']).filter((u) => u != null));
      if (distinctAddresses.size === 1 || uprns.size === 1) {
        return [...matches].sort((a, b) => {
          const dateA = typeof a['registrationDate'] === 'string' ? a['registrationDate'] : '';
          const dateB = typeof b['registrationDate'] === 'string' ? b['registrationDate'] : '';
          return dateB.localeCompare(dateA);
        })[0];
      }
    }
  }

  // Postcode search returned exactly one certificate — safe to use even without a confident address match.
  if (rows.length === 1) return rows[0];

  return null;
}

// The search summary row uses currentEnergyEfficiencyBand (not currentEnergyRating)
// and has no construction_age_band field at all — that only exists nested inside
// the full certificate's sap_building_parts[]. Candidate keys cover both the
// summary row's camelCase and the full certificate's snake_case.
function extractCurrentEnergyRating(doc: Record<string, unknown> | null | undefined): string | null {
  if (!doc) return null;
  const candidateKeys = [
    'currentEnergyEfficiencyBand',
    'current_energy_efficiency_band',
    'currentEnergyRating',
    'current-energy-rating',
  ];
  for (const key of candidateKeys) {
    const raw = doc[key];
    if (typeof raw === 'string' && raw.trim()) return raw.trim().toUpperCase();
  }
  return null;
}

// construction_age_band lives per sap_building_part (main dwelling + any
// extensions can each have their own). The first entry is the main dwelling,
// which is what "estimated year built" should reflect, not a later extension.
function extractConstructionAgeBandCode(doc: Record<string, unknown> | null | undefined): string | null {
  if (!doc) return null;
  const parts = doc['sap_building_parts'];
  if (Array.isArray(parts) && parts.length > 0) {
    const band = (parts[0] as Record<string, unknown> | undefined)?.['construction_age_band'];
    if (typeof band === 'string' && band.trim()) return band.trim();
  }
  // Fallback in case a differently-shaped response ever carries it top-level.
  const topLevel = doc['constructionAgeBand'] ?? doc['construction-age-band'] ?? doc['construction_age_band'];
  return typeof topLevel === 'string' && topLevel.trim() ? topLevel.trim() : null;
}

async function subjectEpcDetailsFromRow(
  row: Record<string, unknown> | null
): Promise<{ currentEnergyRating: string | null; constructionAgeBand: string | null; totalFloorArea: number | null } | null> {
  if (!row) return null;

  let currentEnergyRating = extractCurrentEnergyRating(row);
  let constructionAgeBandCode = extractConstructionAgeBandCode(row);
  let totalFloorArea = floorAreaFromEpcRow(row);

  const certificateNumber =
    (row['certificateNumber'] as string | undefined) ?? (row['certificate-number'] as string | undefined) ?? null;

  // construction_age_band is never in the search summary, so fetch the full
  // certificate whenever we have a number and are still missing something.
  if (certificateNumber && (!currentEnergyRating || !constructionAgeBandCode || !totalFloorArea)) {
    const doc = await fetchEpcCertificateDocument(certificateNumber);
    currentEnergyRating = currentEnergyRating ?? extractCurrentEnergyRating(doc);
    constructionAgeBandCode = constructionAgeBandCode ?? extractConstructionAgeBandCode(doc);
    totalFloorArea = totalFloorArea ?? extractFloorArea(doc);
  }

  return {
    currentEnergyRating,
    constructionAgeBand: constructionAgeBandToRange(constructionAgeBandCode),
    totalFloorArea,
  };
}

// ─── EPC MIGRATION ──────────────────────────────────────────────────────────
// NOTE: the new /api/domestic/search endpoint does NOT return floor area in its
// payload, so this will return null for new-API rows. Kept legacy keys as a
// fallback in case EPC_API_ENDPOINT is still pointed at the old service. See
// the message accompanying this file for how to restore floor area if needed.
function floorAreaFromEpcRow(row: Record<string, unknown>): number | null {
  const raw =
    (row['totalFloorArea'] as unknown) ??
    (row['total-floor-area'] as unknown) ??
    null;
  const floorArea = raw != null ? Number(raw) : null;
  if (!floorArea || isNaN(floorArea) || floorArea <= 0) return null;
  return floorArea;
}

// ─── Header redesign ────────────────────────────────────────────────────────
// EPC rating + construction age band for the subject property itself (not a
// comp sale). Land Registry sale matching uses exact paon/saon/street equality
// because it's matching structured fields; here we only have Rightmove's
// free-text displayAddress, so matching is a loose substring check instead.

async function getSalesCountPast12Months(fullPostcode: string | null, effectiveToday: Date): Promise<number | null> {
  if (!fullPostcode || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const twelveMonthsAgo = new Date(effectiveToday);
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
  const requestStartedAt = Date.now();
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

    if (hasFreeReportLimitReached(profile, user.created_at)) {
      return NextResponse.json(
        { error: 'limit_reached', message: reportLimitReachedMessage() },
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
      includeNearestSchools: true,
      monitoringMode: false,
      maxProperties: 1,
      // UK residential proxy: in a 20-pair test (Oct 2026) it cut slow runs (>18s) from
      // 25% to 10% and the worst case from ~39s to ~24s vs the default datacenter proxy,
      // at no extra cost (this actor bills per property; proxy usage isn't passed on).
      proxy: { useApifyProxy: true, apifyProxyGroups: ['RESIDENTIAL'], apifyProxyCountry: 'GB' },
    });

    let runFinished = false;
    let attempts = 0;
    const maxAttempts = 60;
    while (!runFinished && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
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

    // §04's full Overpass lookup is fetched client-side after the report renders
    // (see useNearbyPlaces) — it can stall 10+ seconds on a slow or rate-limited
    // endpoint. Only the listing's own schools/stations go out with the report:
    // free (already in the scrape) and a fallback for when Overpass is down.
    const nearbyPlaces = nearbyPlacesFromApify({
      nearestStations: propertyData.nearestStations,
      nearestSchools: propertyData.nearestSchools,
    });

    const [housePostcode, postcodeCoords, area, effectiveToday] = await Promise.all([
      propertyLat && propertyLon
        ? getPostcodeFromCoordinates(propertyLat, propertyLon)
        : Promise.resolve({ fullPostcode: null, outcode: null, region: null, country: null }),
      getPostcodeCoordinates(postcode || ''),
      getArea(propertyData, propertyData.floorplans, propertyData.description, openai),
      getPricePaidDataEffectiveToday(),
    ]);

    // Rightmove's coordinates are often offset slightly from the real address, so
    // the postcode reverse-geocoded from them can land on a neighbour (e.g. HU10 7AB
    // for a listing at HU10 7AD) — and every exact-postcode lookup below then misses.
    // The listing's own postcode wins whenever it has one.
    const subjectPostcode = listingPostcode(propertyData) ?? housePostcode.fullPostcode;
    const subjectOutcode = subjectPostcode?.split(' ')[0] ?? housePostcode.outcode;

    // Batch 2 — needs the postcode from batch 1
    // NOTE: the £/m² district-average stat used to be computed here too, but it
    // was by far the most expensive thing in this handler (up to 500 sales each
    // needing a floor area resolved via EPC/Homedata, concurrency-capped — Sentry
    // traces showed this alone commonly taking 10-50s+, occasionally pushing the
    // whole request past its 60s timeout). It's now fetched client-side after the
    // report renders instead, via /api/price-per-sqm — same reason district
    // comparison, supply & demand and risks & restrictions are already out here.
    const [salesCountPast12Months, averagePriceData, matchedFullAddress, subjectEpcRow] = await Promise.all([
      getSalesCountPast12Months(subjectPostcode, effectiveToday),
      getAveragePricesByYear(subjectOutcode, propertyTypeCode),
      getFullAddressFromLandRegistrySparql(
        subjectPostcode,
        subjectOutcode,
        priceHistory,
        propertyData.displayAddress || ''
      ),
      matchSubjectEpcRow(subjectPostcode, propertyData.displayAddress || ''),
    ]);

    // Rightmove's raw displayAddress sometimes has no house number at all (e.g.
    // "Hopwood Bank, Horsforth, Leeds" with no "9"), which leaves the street-only
    // match ambiguous across every EPC certificate on that street — correctly
    // returns null rather than guessing. The Land Registry SPARQL match above
    // often resolves the full "9, Hopwood Bank, ..." address from price/date
    // history instead, so retry the EPC match with that once it's available.
    let resolvedSubjectEpcRow = subjectEpcRow;
    if (!resolvedSubjectEpcRow && matchedFullAddress && matchedFullAddress !== propertyData.displayAddress) {
      resolvedSubjectEpcRow = await matchSubjectEpcRow(subjectPostcode, matchedFullAddress);
    }

    // Both the SPARQL match and the EPC-register match above came up empty — try the
    // EPC-image actor as a last resort (sequential, since it's only worth the extra
    // latency when the free paths have already failed). This route has a hard 60s
    // function timeout (maxDuration above) and the Apify scrape alone can already eat
    // most of that, so only attempt this with real time left, and cap its own wait to
    // whatever's left — never let it be the thing that times out the whole report.
    const MIN_EPC_FINDER_BUDGET_SECS = 15;
    const RESPONSE_OVERHEAD_SECS = 3;
    let epcFinderFullAddress: string | null = null;
    if (!matchedFullAddress && !resolvedSubjectEpcRow) {
      const elapsedSecs = (Date.now() - requestStartedAt) / 1000;
      const remainingSecs = 60 - elapsedSecs - RESPONSE_OVERHEAD_SECS;
      if (remainingSecs >= MIN_EPC_FINDER_BUDGET_SECS) {
        epcFinderFullAddress = await getFullAddressFromEpcFinderActor(
          apifyClient,
          propertyData.outcode || null,
          propertyData.incode || null,
          propertyData.propertyType || null,
          typeof propertyData.epc === 'string' ? propertyData.epc : null,
          Math.floor(remainingSecs)
        );
        if (epcFinderFullAddress) {
          resolvedSubjectEpcRow = await matchSubjectEpcRow(subjectPostcode, epcFinderFullAddress);
        }
      }
    }

    const epcMatchedAddress = resolvedSubjectEpcRow
      ? composeEpcAddress(resolvedSubjectEpcRow, propertyData.displayAddress || '')
      : null;
    const subjectEpc = await subjectEpcDetailsFromRow(resolvedSubjectEpcRow);

    // Register lookup found no certificate at all (most often: Rightmove's address had
    // no house number to disambiguate between several on the same street). Rightmove's
    // own EPC chart image for this exact listing needs no address matching, so it's a
    // last-resort fallback for the rating alone — age band and floor area still depend
    // on the register lookup above.
    let epcRating = subjectEpc?.currentEnergyRating ?? null;
    if (!epcRating && typeof propertyData.epc === 'string' && propertyData.epc) {
      epcRating = await extractEpcBandFromImage(propertyData.epc, openai);
    }

    const tenure = normalizeTenure(propertyData.tenure);

    // Floor area priority when Rightmove's own data (structured size, dedicated
    // floorplan, or description — all tried in getArea above) comes up empty:
    // 1. The EPC register certificate's recorded floor area — an authoritative
    //    figure, already resolved above as part of address matching.
    // 2. Only if that's also unavailable, a guess at the LAST photo in the regular
    //    gallery, in case the agent uploaded the floorplan there instead of using
    //    Rightmove's dedicated floorplan slot (confirmed to happen — see the
    //    Bowness Avenue case). extractAreaFromFloorplan abstains ("NOT_FOUND")
    //    when nothing's explicitly labelled, so this costs one vision call and
    //    falls through safely if the last photo isn't actually a floorplan.
    const epcFloorArea = subjectEpc?.totalFloorArea ?? null;
    let resolvedArea = area;
    if (resolvedArea === 'N/A') {
      if (epcFloorArea !== null) {
        resolvedArea = epcFloorArea.toString();
      } else {
        const images = Array.isArray(propertyData.images) ? propertyData.images : [];
        const lastImageUrl = images[images.length - 1];
        if (typeof lastImageUrl === 'string') {
          const lastImageArea = await extractAreaFromFloorplan(lastImageUrl, openai);
          if (lastImageArea) resolvedArea = lastImageArea;
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────

    const distance =
      propertyLat && propertyLon && postcodeCoords.latitude !== null && postcodeCoords.longitude !== null
        ? calculateDistanceKm(propertyLat, propertyLon, postcodeCoords.latitude, postcodeCoords.longitude)
        : null;

    const result = {
      rightmoveUrl: url || null,
      propertyAddress: propertyData.displayAddress || 'N/A',
      // The finder actor's string is just line 1 ("61 King Edward Crescent"); the
      // EPC row it resolved to (when it did) composes the fuller address.
      fullAddress: matchedFullAddress || epcMatchedAddress || epcFinderFullAddress || propertyData.displayAddress || 'N/A',
      price: propertyData.price || 'N/A',
      propertyType: propertyData.propertyType || 'N/A',
      bathrooms: propertyData.bathrooms?.toString() || 'N/A',
      bedrooms: propertyData.bedrooms?.toString() || 'N/A',
      area: resolvedArea,
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
      houseFullPostcode: subjectPostcode,
      houseOutcode: subjectOutcode,
      nearbyPlaces,
      salesCountPast12Months,
      averagePriceByYear: averagePriceData?.yearlyAverages ?? null,
      averagePriceFiveYear: averagePriceData?.overallAverage ?? null,
      epcRating,
      constructionAgeBand: subjectEpc?.constructionAgeBand ?? null,
      epcFloorArea,
      tenure,
    };

    // Increment usage counter for non-Pro users with a report allowance
    if (!isProProfile(profile)) {
      const used = profile?.property_reports_used ?? 0;
      const newCount = used + 1;
      if (profile) {
        await supabaseAdmin.from('profiles').update({ property_reports_used: newCount }).eq('id', user.id);
      } else {
        await supabaseAdmin.from('profiles').insert({ id: user.id, plan: 'free', property_reports_used: 1 });
      }
    }

    // Persist the report (report_version 2 = the redesigned layout). Best-effort: a save
    // failure must never break report generation for the user.
    let savedReportId: number | null = null;
    try {
      const { data: savedReport, error: saveError } = await supabaseAdmin
        .from('saved_reports')
        .insert({ user_id: user.id, property_url: url || null, report_data: result, report_version: 2 })
        .select('id')
        .single();
      if (saveError) {
        console.error('Failed to save report:', saveError);
      } else {
        savedReportId = savedReport?.id ?? null;
      }
    } catch (error) {
      console.error('Failed to save report:', error);
    }

    return NextResponse.json({ ...result, savedReportId });
  } catch (error: any) {
    console.error('Error scraping property:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scrape property', details: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    );
  }
}
