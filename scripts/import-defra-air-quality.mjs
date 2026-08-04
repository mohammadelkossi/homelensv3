// One-off/periodic import: DEFRA UK-AIR modelled background pollution CSV
// (already joined + reprojected to lat/lon, see scratch conversion steps in
// project notes) -> Supabase air_quality_grid table.
// Usage: node scripts/import-defra-air-quality.mjs /path/to/air_quality_combined.csv
//
// Expects columns: gridcode, longitude, latitude, no2, pm25, pm10. Upserts
// keyed on gridcode so re-running with a refreshed extract is safe.

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
  console.error("Usage: node scripts/import-defra-air-quality.mjs /path/to/air_quality_combined.csv");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function readRecords(csvPath) {
  const raw = readFileSync(csvPath, "utf8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true });
  return rows.map((row) => ({
    gridcode: row.gridcode,
    longitude: parseFloat(row.longitude),
    latitude: parseFloat(row.latitude),
    no2: parseFloat(row.no2),
    pm25: parseFloat(row.pm25),
    pm10: parseFloat(row.pm10),
  }));
}

async function upsertRecords(records) {
  const BATCH = 2000;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const { error } = await supabase.from("air_quality_grid").upsert(batch, { onConflict: "gridcode" });
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
  const records = readRecords(CSV_PATH);
  console.log(`Parsed ${records.length} grid cells.`);

  await upsertRecords(records);
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
