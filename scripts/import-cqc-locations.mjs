// One-off/periodic import: CQC "Care directory with filters" CSV -> Supabase nhs_locations table.
// Usage: node scripts/import-cqc-locations.mjs /path/to/CQC_directory.csv
//
// Filters to Hospital / Doctors-GPs / Dentist service types, geocodes postcodes in
// batches via postcodes.io (free, no key), then upserts into public.nhs_locations
// (keyed on cqc_location_id so re-running with a refreshed CSV is safe).

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
  console.error("Usage: node scripts/import-cqc-locations.mjs /path/to/CQC_directory.csv");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const CATEGORY_MATCHERS = [
  { category: "hospital", test: (types) => types.some((t) => t.includes("Hospital")) },
  { category: "gp_surgery", test: (types) => types.some((t) => t.includes("Doctors/GPs")) },
  { category: "dentist", test: (types) => types.some((t) => t.includes("Dentist")) },
];

function readRows(csvPath) {
  const raw = readFileSync(csvPath, "utf8");
  // CQC export has a title + blank lines before the real header on line 5.
  const lines = raw.split("\n");
  const csvBody = lines.slice(4).join("\n");
  return parse(csvBody, { columns: true, skip_empty_lines: true, relax_column_count: true });
}

function toCandidates(rows) {
  const candidates = [];
  for (const row of rows) {
    const name = row["Name"]?.trim();
    const postcode = row["Postcode"]?.trim();
    const serviceTypes = (row["Service types"] || "").split("|").map((s) => s.trim()).filter(Boolean);
    if (!name || !postcode || serviceTypes.length === 0) continue;

    for (const { category, test } of CATEGORY_MATCHERS) {
      if (!test(serviceTypes)) continue;
      candidates.push({
        cqc_location_id: row["CQC Location ID (for office use only)"]?.trim() || null,
        name,
        category,
        address: row["Address"]?.trim() || null,
        postcode,
        region: row["Region"]?.trim() || null,
        local_authority: row["Local authority"]?.trim() || null,
      });
    }
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
    const { error } = await supabase.from("nhs_locations").upsert(batch, { onConflict: "cqc_location_id,category" });
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
  console.log(`Parsed ${rows.length} total CQC locations.`);

  const candidates = toCandidates(rows);
  console.log(`Matched ${candidates.length} hospital/GP/dentist rows.`);

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
