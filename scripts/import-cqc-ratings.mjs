// Import CQC overall ratings CSV (produced by convert-cqc-ratings.py) into nhs_locations.
// Usage: node scripts/import-cqc-ratings.mjs /path/to/ratings.csv
//
// Updates existing rows by cqc_location_id via the update_nhs_location_ratings
// RPC (see supabase-add-nhs-ratings.sql) rather than upserting, since ratings
// apply per location and a location can have more than one category row.

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
  console.error("Usage: node scripts/import-cqc-ratings.mjs /path/to/ratings.csv");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function readRatings(csvPath) {
  const raw = readFileSync(csvPath, "utf8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true });
  return rows
    .filter((row) => row.cqc_location_id && row.overall_rating)
    .map((row) => ({
      cqc_location_id: row.cqc_location_id.trim(),
      overall_rating: row.overall_rating.trim(),
      rating_date: row.rating_date?.trim() || null,
    }));
}

async function applyRatings(ratings) {
  const BATCH = 500;
  for (let i = 0; i < ratings.length; i += BATCH) {
    const batch = ratings.slice(i, i + BATCH);
    const { error } = await supabase.rpc("update_nhs_location_ratings", { ratings: batch });
    if (error) {
      console.error("Rating update failed at batch", i, error.message);
      process.exit(1);
    }
    process.stdout.write(`\rApplied ${Math.min(i + BATCH, ratings.length)}/${ratings.length} ratings`);
  }
  process.stdout.write("\n");
}

async function main() {
  console.log(`Reading ${CSV_PATH}...`);
  const ratings = readRatings(CSV_PATH);
  console.log(`Parsed ${ratings.length} ratings.`);

  await applyRatings(ratings);
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
