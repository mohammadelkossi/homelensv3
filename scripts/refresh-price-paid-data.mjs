// Periodic refresh: HM Land Registry Price Paid Data -> Supabase price_paid_data table.
// Usage: node scripts/refresh-price-paid-data.mjs
//
// Source: https://www.gov.uk/government/statistical-data-sets/price-paid-data-yearly-file
// Files are published per calendar year at a stable URL
// (https://price-paid-data.publicdata.landregistry.gov.uk/pp-<year>.csv), updated
// monthly with that year's transactions as they're registered — so re-downloading
// the current year's file is how you pick up anything new. HMLR's own data always
// lags real time by a couple of months (a sale has to complete registration before
// it appears), so "fully current" isn't realistic even running this often.
//
// The CSV has NO header row. Column order is fixed:
//   0 Transaction ID, 1 Price, 2 Date of Transfer, 3 Postcode, 4 Property Type,
//   5 Old/New, 6 Duration, 7 PAON, 8 SAON, 9 Street, 10 Locality, 11 Town/City,
//   12 District, 13 County, 14 PPD Category Type, 15 Record Status (A/C/D)
//
// This only imports Record Status "A" (addition) rows — "C" (change) and "D"
// (delete) rows reference a transaction_id already in our table and would need
// update/delete handling rather than a plain insert. Rare in practice (used for
// HMLR's own corrections to historic entries); skipping them means an occasional
// correction doesn't land here, which is an acceptable gap for this table's
// purpose (comparable sold prices), not worth the added complexity/risk of
// mutating or deleting existing rows in an unattended script.
//
// Idempotent: upserts on transaction_id (unique constraint added for this
// script), so re-running — including over an overlapping date range — is safe.

import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
  const path = new URL("../.env.local", import.meta.url);
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const YEARLY_FILE_BASE = "https://price-paid-data.publicdata.landregistry.gov.uk";
// Kept small: this table has 6 indexes (pkey, postcode, date, postcode+date, a
// functional outcode+type+date index, plus the transaction_id unique constraint
// this script relies on), so a large batch x high concurrency combination hit
// Postgres's statement timeout on the first real run — more concurrent index
// maintenance than it could finish in time.
const UPSERT_BATCH_SIZE = 500;
const UPSERT_CONCURRENCY = 2;

function nullIfEmpty(value) {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapRow(columns) {
  const [
    transactionId,
    price,
    dateOfTransfer,
    postcode,
    propertyType,
    , // old/new — not stored
    , // duration — not stored
    paon,
    saon,
    street,
    , // locality — not stored
    townCity,
    district,
    county,
    , // ppd category — not stored
    recordStatus,
  ] = columns;

  return {
    transaction_id: transactionId,
    price: Number(price),
    date_of_transfer: (dateOfTransfer ?? "").split(" ")[0] || null,
    postcode: nullIfEmpty(postcode),
    property_type: nullIfEmpty(propertyType),
    paon: nullIfEmpty(paon),
    saon: nullIfEmpty(saon),
    street: nullIfEmpty(street),
    town_city: nullIfEmpty(townCity),
    district: nullIfEmpty(district),
    county: nullIfEmpty(county),
    recordStatus,
  };
}

// These are large files (the 2025 one is ~129MB) fetched over a single plain
// response.text() with no streaming/resume, so a dropped connection partway
// through loses the whole download — seen twice in practice (ECONNRESET,
// "terminated"). Retrying from scratch is the only option without a much more
// involved streaming rewrite, so just retry a few times with backoff.
async function fetchYearCsv(year, retries = 3) {
  const url = `${YEARLY_FILE_BASE}/pp-${year}.csv`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`Downloading ${url} ${attempt > 0 ? `(attempt ${attempt + 1}) ` : ""}...`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      if (attempt === retries) throw error;
      const waitMs = 2000 * (attempt + 1);
      console.log(`  Download failed (${error.message}), retrying in ${waitMs / 1000}s...`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
}

async function upsertBatch(batch, batchLabel) {
  const { error } = await supabase
    .from("price_paid_data")
    .upsert(batch, { onConflict: "transaction_id", ignoreDuplicates: true });
  if (error) {
    console.error(`Upsert failed at ${batchLabel}:`, error.message);
    process.exit(1);
  }
}

async function upsertRecords(records) {
  const batches = [];
  for (let i = 0; i < records.length; i += UPSERT_BATCH_SIZE) {
    batches.push(records.slice(i, i + UPSERT_BATCH_SIZE));
  }

  let completed = 0;
  for (let i = 0; i < batches.length; i += UPSERT_CONCURRENCY) {
    const group = batches.slice(i, i + UPSERT_CONCURRENCY);
    await Promise.all(group.map((batch, idx) => upsertBatch(batch, `batch ${i + idx}`)));
    completed += group.reduce((sum, b) => sum + b.length, 0);
    process.stdout.write(`\r  Upserted ${completed}/${records.length} rows`);
  }
  process.stdout.write("\n");
}

async function main() {
  const { data: latestRow, error: latestError } = await supabase
    .from("price_paid_data")
    .select("date_of_transfer")
    .order("date_of_transfer", { ascending: false })
    .limit(1)
    .single();
  if (latestError) {
    console.error("Failed to read current latest date_of_transfer:", latestError.message);
    process.exit(1);
  }

  const cutoffDate = latestRow.date_of_transfer; // "YYYY-MM-DD"
  const cutoffYear = Number(cutoffDate.slice(0, 4));
  const currentYear = new Date().getFullYear();
  console.log(`Current table max date_of_transfer: ${cutoffDate}`);

  const years = [];
  for (let y = cutoffYear; y <= currentYear; y++) years.push(y);
  console.log(`Fetching year file(s): ${years.join(", ")}`);

  let totalImported = 0;
  for (const year of years) {
    const csvText = await fetchYearCsv(year);
    const rows = parse(csvText, { columns: false, skip_empty_lines: true });
    console.log(`  Parsed ${rows.length} rows from ${year}.`);

    const records = rows
      .map(mapRow)
      .filter((r) => r.recordStatus === "A" && r.date_of_transfer && r.date_of_transfer > cutoffDate)
      .map(({ recordStatus, ...rest }) => rest);

    console.log(`  ${records.length} new rows after ${cutoffDate} (Record Status "A" only).`);
    if (records.length > 0) {
      await upsertRecords(records);
      totalImported += records.length;
    }
  }

  console.log(`Done. Imported ${totalImported} new rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
