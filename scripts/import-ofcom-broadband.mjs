// One-off/periodic import: Ofcom Connected Nations postcode-level fixed
// broadband coverage CSVs -> Supabase broadband_coverage table.
// Usage: node scripts/import-ofcom-broadband.mjs /path/to/postcode_files_dir
//
// The source is ~120 CSVs (one per postcode-area prefix) extracted from
// Ofcom's "Fixed broadband coverage" download
// (https://www.ofcom.org.uk/phones-and-broadband/coverage-and-speeds/connected-nations-2025/data-downloads-2025
// -> Fixed broadband coverage zip -> postcode_files/*.csv, the "all premises"
// variant, not the "_res" residential-only one). Upserts keyed on postcode so
// re-running with a refreshed extract is safe.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
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

const CSV_DIR = process.argv[2];
if (!CSV_DIR) {
  console.error("Usage: node scripts/import-ofcom-broadband.mjs /path/to/postcode_files_dir");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function toNumber(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function readRecordsFromFile(filePath) {
  const raw = readFileSync(filePath, "utf8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true });
  return rows
    .filter((row) => row.postcode?.trim())
    .map((row) => ({
      postcode: row.postcode.trim(),
      postcode_display: row.postcode_space?.trim() || null,
      gigabit_availability: toNumber(row["Gigabit availability (% premises)"]),
      ultrafast_availability: toNumber(row["UFBB availability (% premises)"]),
      superfast_availability: toNumber(row["SFBB availability (% premises)"]),
      below_uso: toNumber(row["% of premises below the USO"]),
      decent_broadband_fwa: toNumber(row["% of premises able to receive decent broadband from FWA"]),
    }));
}

async function upsertBatch(batch, batchLabel) {
  const { error } = await supabase.from("broadband_coverage").upsert(batch, { onConflict: "postcode" });
  if (error) {
    console.error(`Upsert failed at ${batchLabel}:`, error.message);
    process.exit(1);
  }
}

async function upsertRecords(records) {
  const BATCH = 2000;
  const CONCURRENCY = 5;
  const batches = [];
  for (let i = 0; i < records.length; i += BATCH) {
    batches.push(records.slice(i, i + BATCH));
  }

  let completed = 0;
  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const group = batches.slice(i, i + CONCURRENCY);
    await Promise.all(group.map((batch, idx) => upsertBatch(batch, `batch ${i + idx}`)));
    completed += group.reduce((sum, b) => sum + b.length, 0);
    process.stdout.write(`\rInserted ${completed}/${records.length} rows`);
  }
  process.stdout.write("\n");
}

async function main() {
  const files = readdirSync(CSV_DIR).filter((f) => f.endsWith(".csv"));
  console.log(`Found ${files.length} CSV files in ${CSV_DIR}.`);

  let allRecords = [];
  for (const file of files) {
    const records = readRecordsFromFile(join(CSV_DIR, file));
    allRecords = allRecords.concat(records);
    process.stdout.write(`\rParsed ${allRecords.length} postcodes so far (${file})`);
  }
  process.stdout.write("\n");

  console.log(`Total postcodes to import: ${allRecords.length}`);
  await upsertRecords(allRecords);
  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
