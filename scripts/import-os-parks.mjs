// One-off/periodic import: OS Open Greenspace CSV (lon/lat, already reprojected
// from EPSG:27700 via ogr2ogr) -> Supabase parks table.
// Usage: node scripts/import-os-parks.mjs /path/to/parks.csv
//
// Expects columns: X (longitude), Y (latitude), id (OS id), function, distinctive_name_1.
// Upserts into public.parks (keyed on os_id so re-running with a refreshed
// extract is safe).

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
  console.error("Usage: node scripts/import-os-parks.mjs /path/to/parks.csv");
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
  return rows
    .filter((row) => row.distinctive_name_1?.trim() && row.X && row.Y)
    .map((row) => ({
      os_id: row.id?.trim() || null,
      name: row.distinctive_name_1.trim(),
      longitude: parseFloat(row.X),
      latitude: parseFloat(row.Y),
    }))
    .filter((row) => Number.isFinite(row.longitude) && Number.isFinite(row.latitude));
}

async function upsertRecords(records) {
  const BATCH = 500;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const { error } = await supabase.from("parks").upsert(batch, { onConflict: "os_id" });
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
  console.log(`Parsed ${records.length} named parks.`);

  await upsertRecords(records);
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
