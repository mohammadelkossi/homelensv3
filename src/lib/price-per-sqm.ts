// "Price per m² vs district average" (§01) — extracted out of
// scrape-property/route.ts so it can run OUTSIDE the report-generation
// critical path (see src/app/api/price-per-sqm/route.ts). This is the single
// most expensive thing the report used to block on: it resolves a floor area
// for up to 500 district sales via a two-step EPC lookup (search, then
// certificate), concurrency-capped, with a Homedata fallback for anything EPC
// can't resolve. Traced in Sentry: this alone commonly took 10-50s+ depending
// on how slow the EPC Register API was responding that moment, occasionally
// pushing the whole /api/scrape-property request past its 60s timeout.
import { createClient } from "@supabase/supabase-js";
import { getPropertyRecord, searchAddresses } from "@/lib/homedata";
import {
  fetchEpcRowsForPostcode,
  fetchCertificateFloorArea,
  matchEpcRowForSale,
  type LandRegistrySale,
} from "@/lib/epc-register";

const HOMEDATA_FLOOR_AREA_LOOKUP_LIMIT = 25;
const HOMEDATA_LOOKUP_CONCURRENCY = 5;

// The new /api/domestic/search endpoint does NOT return floor area in its
// payload, so this will return null for new-API rows. These bound how many
// certificate lookups we do per report (latency + rate limits; the service
// allows 6000 requests / 5 min per IP). Overflow falls back to Homedata.
const EPC_CERTIFICATE_LOOKUP_LIMIT = 150;
const EPC_CERTIFICATE_LOOKUP_CONCURRENCY = 8;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let index = 0; index < items.length; index += limit) {
    const batch = items.slice(index, index + limit);
    const batchResults = await Promise.all(batch.map(mapper));
    results.push(...batchResults);
  }
  return results;
}

function saleLookupKey(sale: LandRegistrySale): string {
  return [sale.postcode, sale.paon, sale.saon, sale.street]
    .map((part) => (part ?? "").trim().toLowerCase())
    .join("|");
}

// Kept legacy keys as a fallback in case EPC_API_ENDPOINT is still pointed at
// the old service, which did return floor area inline.
function floorAreaFromEpcRow(row: Record<string, unknown>): number | null {
  const raw = (row["totalFloorArea"] as unknown) ?? (row["total-floor-area"] as unknown) ?? null;
  const floorArea = raw != null ? Number(raw) : null;
  if (!floorArea || isNaN(floorArea) || floorArea <= 0) return null;
  return floorArea;
}

async function getFloorAreaForSaleFromHomedata(sale: LandRegistrySale): Promise<number | null> {
  if (!process.env.HOMEDATA_API_KEY) return null;

  const query = [sale.paon, sale.saon, sale.street, sale.postcode].filter(Boolean).join(" ").trim();
  if (!query) return null;

  try {
    const suggestions = await searchAddresses(query);
    const uprn = suggestions[0]?.uprn;
    if (!uprn) return null;

    const property = await getPropertyRecord(String(uprn));
    const area = property.epc_floor_area ?? property.predicted_floor_area ?? property.internal_area_sqm;
    const floorArea = area != null ? Number(area) : null;
    if (!floorArea || !Number.isFinite(floorArea) || floorArea <= 0) return null;
    return floorArea;
  } catch (error) {
    console.error("Homedata floor area lookup failed:", error);
    return null;
  }
}

export async function getAveragePricePerSqmForPropertyTypeAndOutcode(
  outcode: string | null,
  propertyTypeCode: "D" | "S" | "T" | "F" | "O" | null,
  effectiveToday: Date
): Promise<{ simpleAverage: number | null; weightedAverage: number | null; matchedSaleCount: number } | null> {
  if (!outcode || !propertyTypeCode || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const twelveMonthsAgo = new Date(effectiveToday);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const dateString = twelveMonthsAgo.toISOString().split("T")[0];
    const prefix = outcode.toUpperCase();

    const { data: sales, error } = await supabase
      .from("price_paid_data")
      .select("paon, saon, street, postcode, price, date_of_transfer")
      .eq("property_type", propertyTypeCode)
      .gte("date_of_transfer", dateString)
      .gte("postcode", `${prefix} `)
      .lt("postcode", `${prefix}~`)
      .limit(500);

    if (error || !sales?.length) {
      return { simpleAverage: null, weightedAverage: null, matchedSaleCount: 0 };
    }

    // Collect all unique postcodes, fetch EPC data for all of them in parallel,
    // then build the cache map — not a sequential for-loop fetch.
    const uniquePostcodes = [...new Set(sales.map((s) => s.postcode?.toUpperCase?.()).filter(Boolean))] as string[];
    const epcResults = await Promise.all(uniquePostcodes.map((pc) => fetchEpcRowsForPostcode(pc)));
    const epcCache = new Map<string, Record<string, unknown>[]>(uniquePostcodes.map((pc, i) => [pc, epcResults[i]]));

    const floorAreaBySale = new Map<string, number>();
    const homedataCandidates: LandRegistrySale[] = [];

    // Two-step EPC lookup:
    //   1. Match each sale to an EPC search row (address match).
    //   2. Fast path: if the search row already carries floor area (old service,
    //      or a future search-schema change), use it — no extra call.
    //   3. Otherwise take the row's certificateNumber and queue a certificate
    //      lookup, which is where the new service exposes floor area.
    // Anything that can't be resolved falls through to the Homedata lookup.
    type CertTarget = { saleKey: string; sale: LandRegistrySale; certificateNumber: string };
    const certTargets: CertTarget[] = [];

    for (const sale of sales as LandRegistrySale[]) {
      const price = Number(sale.price);
      if (!Number.isFinite(price) || price <= 0) continue;

      const salePostcode = sale.postcode?.toUpperCase?.() ?? null;
      if (!salePostcode) continue;

      const epcRows = epcCache.get(salePostcode);
      const matchingRow = epcRows?.length ? matchEpcRowForSale(sale, epcRows) : null;

      if (!matchingRow) {
        homedataCandidates.push(sale);
        continue;
      }

      // Fast path — search row already has floor area inline.
      const inlineFloorArea = floorAreaFromEpcRow(matchingRow);
      if (inlineFloorArea !== null) {
        floorAreaBySale.set(saleLookupKey(sale), inlineFloorArea);
        continue;
      }

      // New service — queue a certificate lookup using the row's certificate number.
      const certificateNumber =
        (matchingRow["certificateNumber"] as string | undefined) ??
        (matchingRow["certificate-number"] as string | undefined) ??
        (matchingRow["certificateNumber".toLowerCase()] as string | undefined);
      if (certificateNumber) {
        certTargets.push({ saleKey: saleLookupKey(sale), sale, certificateNumber });
      } else {
        homedataCandidates.push(sale);
      }
    }

    // Fetch floor area from the certificate endpoint. Deduped by certificate
    // number and run with bounded concurrency to respect the API's rate limits.
    // Cap the number of lookups per report; overflow falls back to Homedata.
    const certLookupTargets = certTargets.slice(0, EPC_CERTIFICATE_LOOKUP_LIMIT);
    for (const overflow of certTargets.slice(EPC_CERTIFICATE_LOOKUP_LIMIT)) {
      homedataCandidates.push(overflow.sale);
    }

    const uniqueCertNumbers = [...new Set(certLookupTargets.map((t) => t.certificateNumber))];
    const certFloorAreas = await mapWithConcurrency(uniqueCertNumbers, EPC_CERTIFICATE_LOOKUP_CONCURRENCY, async (certNumber) => ({
      certNumber,
      floorArea: await fetchCertificateFloorArea(certNumber),
    }));
    const floorAreaByCert = new Map<string, number | null>(certFloorAreas.map((r) => [r.certNumber, r.floorArea]));

    for (const target of certLookupTargets) {
      const floorArea = floorAreaByCert.get(target.certificateNumber) ?? null;
      if (floorArea !== null) {
        floorAreaBySale.set(target.saleKey, floorArea);
      } else {
        // Certificate had no usable floor area → try Homedata as a last resort.
        homedataCandidates.push(target.sale);
      }
    }

    const homedataTargets = homedataCandidates.slice(0, HOMEDATA_FLOOR_AREA_LOOKUP_LIMIT);
    const homedataResults = await mapWithConcurrency(homedataTargets, HOMEDATA_LOOKUP_CONCURRENCY, async (sale) => ({
      key: saleLookupKey(sale),
      floorArea: await getFloorAreaForSaleFromHomedata(sale),
    }));

    for (const result of homedataResults) {
      if (result.floorArea !== null) {
        floorAreaBySale.set(result.key, result.floorArea);
      }
    }

    let sum = 0;
    let count = 0;
    let weightedNumerator = 0;
    let weightedDenominator = 0;

    for (const sale of sales as LandRegistrySale[]) {
      const price = Number(sale.price);
      if (!Number.isFinite(price) || price <= 0) continue;

      const floorArea = floorAreaBySale.get(saleLookupKey(sale));
      if (floorArea === undefined) continue;

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
    console.error("Error calculating price per sqm stats:", error);
    return null;
  }
}
