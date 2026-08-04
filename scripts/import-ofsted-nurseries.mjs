// One-off/periodic import: Ofsted "Childcare providers and inspections"
// management information CSV -> Supabase nurseries table.
// Usage: node scripts/import-ofsted-nurseries.mjs /path/to/ofsted_childcare.csv
//
// Filters to "Childcare on non-domestic premises" (nurseries/preschools/
// day-care) with a real name and postcode — childminders and home childcarers
// have their personal address data redacted in the open dataset, so they're
// excluded rather than imported with unusable location data. Geocodes
// postcodes in batches via postcodes.io (free, no key), then upserts into
// public.nurseries (keyed on provider_urn so re-running with a refreshed CSV
// is safe).

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

const CSV_PATH = process.argv[2];
if (!CSV_PATH) {
  console.error("Usage: node scripts/import-ofsted-nurseries.mjs /path/to/ofsted_childcare.csv");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const OVERALL_EFFECTIVENESS_LABELS = {
  "1": "Outstanding",
  "2": "Good",
  "3": "Requires improvement",
  "4": "Inadequate",
};

function convertDate(raw) {
  // Ofsted dates come as DD/MM/YYYY.
  if (!raw) return null;
  const parts = raw.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function readRows(csvPath) {
  // Two title/note lines precede the real header row.
  const raw = readFileSync(csvPath, "latin1");
  const lines = raw.split("\n");
  const csvBody = lines.slice(2).join("\n");
  return parse(csvBody, { columns: true, skip_empty_lines: true, relax_column_count: true });
}

function toCandidates(rows) {
  const candidates = [];
  for (const row of rows) {
    if (row["Provider Type"] !== "Childcare on non-domestic premises") continue;

    const name = row["Provider Name"]?.trim();
    const postcode = row["Provider Postcode"]?.trim();
    if (!name || name === "REDACTED" || !postcode || postcode === "REDACTED") continue;

    const addressParts = [row["Provider Address Line 1"], row["Provider Address Line 2"], row["Provider Address Line 3"]]
      .map((part) => part?.trim())
      .filter(Boolean);

    candidates.push({
      provider_urn: row["Provider URN"]?.trim() || null,
      name,
      subtype: row["Provider Subtype"]?.trim() || null,
      address: addressParts.join(", ") || null,
      postcode,
      region: row["Region"]?.trim() || null,
      local_authority: row["Local Authority"]?.trim() || null,
      overall_rating: OVERALL_EFFECTIVENESS_LABELS[row["Most Recent Full: Overall Effectiveness"]?.trim()] || null,
      rating_date: convertDate(row["Most Recent Full: Inspection Date"]?.trim()),
    });
  }
  return candidates;
}

async function geocodePostcodes(postcodes) {
  const unique = [...new Set(postcodes)];
  const coordsByPostcode = new Map();
  const BATCH = 100;

  for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH);
    const response = await fetch("https://api.postcodes.io/postcodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postcodes: batch }),
    });
    if (!response.ok) {
      console.error("postcodes.io batch failed:", response.status);
      continue;
    }
    const data = await response.json();
    for (const entry of data.result ?? []) {
      if (entry.result) {
        coordsByPostcode.set(entry.query, { lat: entry.result.latitude, lon: entry.result.longitude });
      }
    }
    process.stdout.write(`\rGeocoded ${Math.min(i + BATCH, unique.length)}/${unique.length} postcodes`);
  }
  process.stdout.write("\n");
  return coordsByPostcode;
}

async function upsertRecords(records) {
  const BATCH = 500;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const { error } = await supabase.from("nurseries").upsert(batch, { onConflict: "provider_urn" });
    if (error) {
      console.error("Upsert failed at batch", i, error.message);
      process.exit(1);
    }
    process.stdout.write(`\rInserted ${Math.min(i + BATCH, records.length)}/${records.length} rows`);
  }
  process.stdout.write("\n");
}

async function main() {
  console.log(`Reading ${CSV_PATH}...`);
  const rows = readRows(CSV_PATH);
  console.log(`Parsed ${rows.length} total childcare provider rows.`);

  const candidates = toCandidates(rows);
  console.log(`Matched ${candidates.length} named nurseries with a postcode.`);

  const coordsByPostcode = await geocodePostcodes(candidates.map((c) => c.postcode));

  const records = candidates
    .map((c) => {
      const coords = coordsByPostcode.get(c.postcode);
      if (!coords) return null;
      return { ...c, latitude: coords.lat, longitude: coords.lon };
    })
    .filter(Boolean);

  console.log(`Geocoded ${records.length}/${candidates.length} rows (skipping unmatched postcodes).`);

  await upsertRecords(records);
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
