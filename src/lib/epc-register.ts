// Shared client for the government "Get energy performance of buildings data"
// service, plus the Land-Registry-sale matching logic built on top of it.
// Used both by the subject property's own EPC lookup (scrape-property route)
// and by anything resolving floor area for OTHER Land Registry sales (e.g.
// nearby comparable sales), since both need the same two-step search ->
// certificate lookup.
//   • Default endpoint → https://api.get-energy-performance-data.communities.gov.uk/api/domestic/search
//   • Auth → Bearer token only (old Basic email:apikey scheme removed)
//   • Query param → page_size (was: size)
//   • Response shape → { data: [...], pagination: {...} }  (was: { rows: [...] })
//   • 404 = "no certificates for this postcode" (normal), 429 = rate limited (retry)

const EPC_API_BASE_DEFAULT = 'https://api.get-energy-performance-data.communities.gov.uk';

export function normalizeAddress(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ').trim();
}

export async function fetchEpcRowsForPostcode(postcode: string, retries = 2): Promise<Record<string, unknown>[]> {
  if (!postcode) return [];

  const bearerToken = process.env.EPC_API_BEARER_TOKEN?.trim();
  if (!bearerToken) return [];

  const base = process.env.EPC_API_BASE?.trim() || EPC_API_BASE_DEFAULT;
  const endpoint = process.env.EPC_API_ENDPOINT?.trim() || `${base}/api/domestic/search`;

  const url = `${endpoint}?postcode=${encodeURIComponent(postcode)}&page_size=500`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 10000); // cap a single hung request
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${bearerToken}`,
        },
        signal: controller.signal,
      });

      // 429: back off and retry (honour Retry-After header if present)
      if (response.status === 429) {
        const wait = Number(response.headers.get('Retry-After')) * 1000 || 1000 * (attempt + 1);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      // 404 = no certificates found for this postcode (normal, not an error)
      if (response.status === 404) return [];

      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok || !contentType.includes('json')) return [];

      const data = await response.json();
      // New API shape: { data: [...], pagination: {...} }
      return Array.isArray(data?.data) ? data.data : [];
    } catch (error) {
      console.error('Error fetching EPC data:', error);
      return [];
    } finally {
      clearTimeout(t);
    }
  }
  return [];
}

// Pull floor area out of a full EPC certificate document. The certificate
// endpoint's response is free-form in the spec, so we defensively accept every
// plausible spelling of the floor-area key (camelCase, hyphenated, snake_case,
// upper). Returns null if none present or the value isn't a positive number.
export function extractFloorArea(doc: Record<string, unknown> | null | undefined): number | null {
  if (!doc || typeof doc !== 'object') return null;
  const candidateKeys = [
    'totalFloorArea',
    'total-floor-area',
    'total_floor_area',
    'TOTAL_FLOOR_AREA',
    'totalFloorAreaSquareMetres',
    'floorArea',
  ];
  for (const key of candidateKeys) {
    const raw = (doc as Record<string, unknown>)[key];
    if (raw != null && raw !== '') {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return null;
}

// Fetch a single full EPC certificate document by its certificate number.
// Search results only give a summary row; this is the second half of the
// two-step lookup for anything the summary omits (floor area, construction
// age band — the latter only exists nested in this full document, never in
// the search summary). Response shape: { data: { ...full EPC document... } }.
export async function fetchEpcCertificateDocument(certificateNumber: string, retries = 2): Promise<Record<string, unknown> | null> {
  if (!certificateNumber) return null;

  const bearerToken = process.env.EPC_API_BEARER_TOKEN?.trim();
  if (!bearerToken) return null;

  const base = process.env.EPC_API_BASE?.trim() || EPC_API_BASE_DEFAULT;
  const url = `${base}/api/certificate?certificate_number=${encodeURIComponent(certificateNumber)}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${bearerToken}`,
        },
      });

      // 429: back off and retry (honour Retry-After header if present)
      if (response.status === 429) {
        const wait = Number(response.headers.get('Retry-After')) * 1000 || 1000 * (attempt + 1);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }

      // 404 = certificate not found (normal, not an error)
      if (response.status === 404) return null;

      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok || !contentType.includes('json')) return null;

      const json = await response.json();
      // CertificateResponse: { data: { ...full EPC document... } }
      return (json?.data ?? json) as Record<string, unknown>;
    } catch (error) {
      console.error('Error fetching EPC certificate:', error);
      return null;
    }
  }
  return null;
}

export async function fetchCertificateFloorArea(certificateNumber: string, retries = 2): Promise<number | null> {
  const doc = await fetchEpcCertificateDocument(certificateNumber, retries);
  return extractFloorArea(doc);
}

export type LandRegistrySale = {
  paon?: string | null;
  saon?: string | null;
  street?: string | null;
  postcode?: string | null;
  price?: number | null;
};

// New API returns camelCase address fields (addressLine1..4). Legacy snake-case
// keys kept as a fallback for the old service. Exact-match only — this is
// matching structured Land Registry fields (paon/saon/street), not free text,
// so there's no ambiguity to resolve the way there is for a Rightmove listing's
// display address.
export function matchEpcRowForSale(
  sale: LandRegistrySale,
  epcRows: Record<string, unknown>[]
): Record<string, unknown> | null {
  const targetAddress = normalizeAddress(`${sale.paon ?? ''} ${sale.saon ?? ''} ${sale.street ?? ''}`);
  if (!targetAddress) return null;

  return (
    epcRows.find((row) => {
      const combinedNewLines = [row['addressLine1'], row['addressLine2'], row['addressLine3'], row['addressLine4']]
        .filter(Boolean)
        .join(' ');

      const candidates = [
        // New API (camelCase)
        normalizeAddress(row['addressLine1'] as string | undefined),
        normalizeAddress(combinedNewLines || undefined),
        // Legacy fallbacks (old service)
        normalizeAddress(row.address1 as string | undefined),
        normalizeAddress(row.address as string | undefined),
        normalizeAddress(row['address-line-1'] as string | undefined),
      ].filter(Boolean) as string[];
      return candidates.some((candidate) => candidate === targetAddress);
    }) ?? null
  );
}

/**
 * Resolves floor area (sqm) for a batch of Land Registry sales, keyed by the
 * same lookup key `saleLookupKey` produces. Fetches EPC search rows once per
 * unique postcode (in parallel), matches each sale to a row, then only pays
 * for a full-certificate fetch (also in parallel) for the matches that need
 * one — the search summary alone rarely carries floor area on the current API.
 */
export async function resolveFloorAreasForSales(
  sales: LandRegistrySale[],
  saleKeyOf: (sale: LandRegistrySale) => string
): Promise<Map<string, number>> {
  const floorAreaBySale = new Map<string, number>();
  if (!sales.length) return floorAreaBySale;

  const uniquePostcodes = [...new Set(sales.map((s) => s.postcode?.toUpperCase?.()).filter(Boolean))] as string[];
  const epcResults = await Promise.all(uniquePostcodes.map((pc) => fetchEpcRowsForPostcode(pc)));
  const epcCache = new Map<string, Record<string, unknown>[]>(uniquePostcodes.map((pc, i) => [pc, epcResults[i]]));

  const certTargets: { saleKey: string; certificateNumber: string }[] = [];

  for (const sale of sales) {
    const salePostcode = sale.postcode?.toUpperCase?.() ?? null;
    if (!salePostcode) continue;

    const epcRows = epcCache.get(salePostcode);
    const matchingRow = epcRows?.length ? matchEpcRowForSale(sale, epcRows) : null;
    if (!matchingRow) continue;

    const inlineFloorArea = extractFloorArea(matchingRow);
    const saleKey = saleKeyOf(sale);
    if (inlineFloorArea) {
      floorAreaBySale.set(saleKey, inlineFloorArea);
      continue;
    }

    const certificateNumber =
      (matchingRow['certificateNumber'] as string | undefined) ?? (matchingRow['certificate-number'] as string | undefined);
    if (certificateNumber) certTargets.push({ saleKey, certificateNumber });
  }

  if (certTargets.length) {
    const areas = await Promise.all(certTargets.map((t) => fetchCertificateFloorArea(t.certificateNumber)));
    certTargets.forEach((t, i) => {
      if (areas[i]) floorAreaBySale.set(t.saleKey, areas[i] as number);
    });
  }

  return floorAreaBySale;
}
