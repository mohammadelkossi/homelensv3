// Periodic refresh: builds a per-police-force baseline for "crimes within ~1
// mile, latest month" (§03's Crime row) -> Supabase crime_force_baseline table.
// Usage: node scripts/refresh-crime-baseline.mjs
//
// Source: data.police.uk's free, no-key street-level crime API. The report's
// live crime figure for a property is "count of crimes within a fixed ~1 mile
// radius, latest available month" at that property's exact coordinates — there
// is no ready-made "average for this area" from the API to compare it against.
//
// A single flat national average would be misleading: that count is driven
// mostly by local population density, so a city-centre flat and a rural
// cottage are never comparable against one number — the city property would
// almost always look alarming and the rural one artificially safe, regardless
// of real relative risk. Instead this samples a spread of points *within each
// police force area* (Greater Manchester, Cumbria, etc.) using the exact same
// methodology (1-mile radius, latest month) the report itself uses, and stores
// the resulting mean/median per force — so a property is judged against other
// properties policed by the same force, not the whole country.
//
// Sampling method: for each force, fetch its neighbourhood list, pick an
// evenly-spaced sample across it (not just the first N — neighbourhood IDs
// aren't geographically ordered, but even-spacing across the full list still
// gives better spread than clustering), fetch each neighbourhood's boundary
// polygon, use its centroid (simple mean of the polygon's points) as a
// representative "property location", then query the same crimes-street
// endpoint the report uses. Median is stored as the primary baseline since a
// handful of high-crime inner-city neighbourhoods would otherwise skew a mean
// upward for an overall suburban/rural force.
//
// Idempotent: upserts on force_id, so re-running replaces each force's row
// with a fresh sample — safe to run periodically (crime data itself updates
// monthly, with the usual ~2 month lag).

import { readFileSync } from "node:fs";
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
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
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

const POLICE_API_BASE_URL = "https://data.police.uk/api";
const SAMPLES_PER_FORCE = 8;
// 150ms was too aggressive — a full 44-force run started hitting 429s partway through,
// and some of those came back as empty-but-"successful" responses rather than clean
// errors, silently polluting force averages with false zeros instead of being retried
// or skipped. 500ms plus more generous backoff below is the fix.
const REQUEST_DELAY_MS = 500;
const MAX_RETRIES = 4;

// Optional: node scripts/refresh-crime-baseline.mjs <force-id> [<force-id> ...]
// re-samples only the named forces instead of all 44 — for re-checking a
// suspicious result without re-running the full ~2-minute sweep.
const targetForceIds = process.argv.slice(2).length > 0 ? new Set(process.argv.slice(2)) : null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (response.status === 429) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        console.error(`  Failed after ${MAX_RETRIES + 1} attempts: ${url} (${error.message})`);
        return null;
      }
      await sleep(1000 * (attempt + 1));
    }
  }
  return null;
}

// Signed area via the shoelace formula, treating [lon, lat] as planar [x, y] —
// a fine approximation at neighbourhood scale (no geodesic correction needed).
function polygonArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

// Proper area-weighted polygon centroid, NOT a naive average of the boundary
// vertices. A naive vertex average is pulled toward wherever the polygon's
// outline happens to have more points (e.g. a winding river or motorway edge)
// and can land well outside the polygon entirely for irregular/concave shapes
// — which is exactly what was happening here: real neighbourhood boundaries
// aren't simple convex blobs, and the naive average was landing in rivers,
// parks and other unpopulated gaps, producing false near-zero crime counts
// even for dense areas like central Manchester.
function polygonCentroid(points) {
  const area = polygonArea(points);
  if (Math.abs(area) < 1e-12) return null;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    const cross = x1 * y2 - x2 * y1;
    cx += (x1 + x2) * cross;
    cy += (y1 + y2) * cross;
  }
  return { x: cx / (6 * area), y: cy / (6 * area) };
}

function pointInPolygon(point, points) {
  let inside = false;
  const { x, y } = point;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function centroid(boundary) {
  if (!boundary || boundary.length < 3) return null;
  const points = boundary.map((p) => [Number(p.longitude), Number(p.latitude)]);

  const c = polygonCentroid(points);
  if (c && pointInPolygon(c, points)) {
    return { latitude: c.y, longitude: c.x };
  }

  // Area-weighted centroid landed outside the polygon (can happen for very
  // non-convex shapes) — fall back to the actual boundary vertex closest to
  // the naive average, a guaranteed-real point on the neighbourhood's edge
  // rather than an unrelated empty patch.
  let sumLon = 0;
  let sumLat = 0;
  for (const [x, y] of points) {
    sumLon += x;
    sumLat += y;
  }
  const avgLon = sumLon / points.length;
  const avgLat = sumLat / points.length;
  let closest = points[0];
  let closestDist = Infinity;
  for (const p of points) {
    const d = (p[0] - avgLon) ** 2 + (p[1] - avgLat) ** 2;
    if (d < closestDist) {
      closestDist = d;
      closest = p;
    }
  }
  return { latitude: closest[1], longitude: closest[0] };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function evenSample(items, count) {
  if (items.length <= count) return items;
  const step = items.length / count;
  const sampled = [];
  for (let i = 0; i < count; i++) {
    sampled.push(items[Math.floor(i * step)]);
  }
  return sampled;
}

async function main() {
  const lastUpdated = await fetchJson(`${POLICE_API_BASE_URL}/crime-last-updated`);
  const month = lastUpdated?.date?.slice(0, 7);
  if (!month) {
    console.error("Could not resolve the latest available crime data month. Aborting.");
    process.exit(1);
  }
  console.log(`Latest crime data month: ${month}`);

  let forces = await fetchJson(`${POLICE_API_BASE_URL}/forces`);
  if (!forces?.length) {
    console.error("Could not fetch force list. Aborting.");
    process.exit(1);
  }
  if (targetForceIds) {
    forces = forces.filter((f) => targetForceIds.has(f.id));
    console.log(`Re-sampling ${forces.length} force(s): ${forces.map((f) => f.id).join(", ")}\n`);
  } else {
    console.log(`${forces.length} police forces found.\n`);
  }

  const results = [];

  for (const force of forces) {
    await sleep(REQUEST_DELAY_MS);
    const neighbourhoods = await fetchJson(`${POLICE_API_BASE_URL}/${force.id}/neighbourhoods`);
    if (!neighbourhoods?.length) {
      console.log(`${force.id}: no neighbourhoods returned, skipping.`);
      continue;
    }

    const sample = evenSample(neighbourhoods, SAMPLES_PER_FORCE);
    const counts = [];

    for (const neighbourhood of sample) {
      await sleep(REQUEST_DELAY_MS);
      const boundary = await fetchJson(`${POLICE_API_BASE_URL}/${force.id}/${neighbourhood.id}/boundary`);
      const point = centroid(boundary);
      if (!point) {
        console.log(`  ${neighbourhood.id} (${neighbourhood.name}): boundary fetch failed, skipped`);
        continue;
      }

      await sleep(REQUEST_DELAY_MS);
      const crimes = await fetchJson(
        `${POLICE_API_BASE_URL}/crimes-street/all-crime?lat=${point.latitude}&lng=${point.longitude}&date=${month}`
      );
      if (!Array.isArray(crimes)) {
        console.log(`  ${neighbourhood.id} (${neighbourhood.name}): crime fetch failed, skipped`);
        continue;
      }
      console.log(`  ${neighbourhood.id} (${neighbourhood.name}): ${crimes.length} crimes at ${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`);
      counts.push(crimes.length);
    }

    if (counts.length === 0) {
      console.log(`${force.id}: no usable samples, skipping.`);
      continue;
    }

    const mean = counts.reduce((sum, c) => sum + c, 0) / counts.length;
    const med = median(counts);
    console.log(`${force.id}: ${counts.length} samples, mean ${mean.toFixed(1)}, median ${med.toFixed(1)}`);

    results.push({
      force_id: force.id,
      force_name: force.name,
      sample_size: counts.length,
      mean_crime_count: mean,
      median_crime_count: med,
      data_month: month,
      computed_at: new Date().toISOString(),
    });
  }

  console.log(`\nUpserting ${results.length} force baselines...`);
  const { error } = await supabase.from("crime_force_baseline").upsert(results, { onConflict: "force_id" });
  if (error) {
    console.error("Upsert failed:", error);
    process.exit(1);
  }
  console.log("Done.");
}

main();
