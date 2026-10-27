# Report redesign — implementation plan

Status: **in progress.** Shipped so far: header (EPC rating/age band, Swiss layout, `SHOW_HOMELENS_SCORE` flag), §03 risk table restyle, key-points rules engine + tabs, §05 must-haves moved to the end as a Yes/No grid, new footer (sources line + Analyse another property), and `report_version`/`saved_reports` persistence (migration applied live, report_version=2 written on every generation). §03 risk-checks sources resolved — see §0a. Test runner (Vitest) set up; rules engine has 11 passing unit tests.

**Section 01 "Is the price fair?" shipped**: new `src/lib/pricing/recommended-offer.ts` (recommended offer range, seller's gain, home/district annualised growth — pure, 31 passing unit tests) wired into a new `PriceFairness` component. Verified against realistic data: numbers line up closely with the brief's own worked example (seller's gain, asking-vs-district, price/m², growth rates all match the reference almost exactly; the offer-range calibration differs slightly, which is expected since it's explicitly a rules-based illustrative figure, not a target to replicate).

**Section 01 charts shipped**: neighbouring-districts line chart, ranking bars, and "this home's price history" chart (filled/hollow/dashed per the brief), backed by a new `/api/district-comparison` route and two new Postgres RPCs (`get_median_price_by_year`, matching districts by nearest outcode centroid via postcodes.io). Found and fixed a real performance bug along the way: the first RPC version timed out on the 4.5M-row table because its WHERE clause didn't match the existing functional index — rewritten to match, 4.2s → 150ms. Verified visually via Playwright screenshots (not just HTML text), which caught and fixed two real rendering bugs (a clipped label, an overlapping label).

**Section 02 "How fast is it selling?" shipped**: on-market days, district sales count + 12-month trend (new `get_district_sales_trend` RPC, correctly offset 3 months for Land Registry's reporting lag per the brief), and the 5-nearest-sales table (new `get_recent_sales_for_outcode` RPC + postcodes.io bulk geocode for real distance ranking, not just "same district"). £/m² column is "—" for now (EPC join not wired into this query yet — the brief explicitly allows "—" here). Supply & demand deliberately not built — the brief itself defers it to Phase 3 (needs a new Apify district search).

**Section 04 "What daily life looks like here" shipped**: restyled from the old flat filterable grid into the brief's grouped cards — The school run, Nurseries & childcare, Everyday errands & health (with CQC ratings shown inline where we have them), Green space — walking minutes computed from straight-line distance with the brief's required disclaimer copy. Reuses the existing Overpass/Apify data, no new backend. "Getting to work" and Ofsted ratings correctly left out (no data source yet, per the brief). Extracted the data-fetching into `use-nearby-places.ts`, matching the hook pattern used for §01/§02/§03.

Caught and fixed one real bug via full-page screenshot review: §04 had been wired in ahead of §03 in the page's source order, so sections rendered 01 → 02 → 04 → 03 → 05 instead of the brief's 01 → 02 → 03 → 04 → 05 (and didn't match the top nav's own Price · Market · Risks · Nearby · Must-haves order). Fixed by reordering the JSX blocks.

All five numbered sections (01–05) are now built in the new Swiss design.

**Mobile pass done**, checked against the 390px reference file directly (not just assumption) using Playwright at a 390px viewport, for every section. Found and fixed three real deviations from the brief's mobile spec:
1. The top nav (Price · Market · Risks · Nearby · Must-haves) was hidden below `lg` — the reference actually shows it on its own wrapped row on mobile, not hidden. Gave the header a dedicated mobile layout (two rows) instead of fighting one shared responsive grid.
2. §01's two largest headline numbers (recommended offer, seller's gain) were 56px on mobile; the brief caps "big headline numbers" at ~52px. Tightened to 48px.
3. §03's risk table was still a cramped 4-column table on mobile instead of the brief's explicit "each row stacks — check + status on top, finding, then meaning." Gave it a separate stacked mobile layout (`sm:hidden` card list vs. `hidden sm:block` table), verified the desktop table is unaffected.

Also fixed the key-points tabs wrapping to 2 lines on mobile (reference uses a tighter gap + `white-space: nowrap` + contained `overflow-x: auto` specifically for the tab bar — matched that exactly). Confirmed no page-level horizontal scroll anywhere, verified via `scrollWidth`/`clientWidth` checks in addition to visual screenshots.

**Lint pass done.** `npm run lint` initially reported ~81,000 problems — turned out ESLint was scanning the nested `homelens-v2/` checkout (1,221 of 1,339 linted files, including its own `node_modules`), not just this project; added it to `eslint.config.mjs`'s ignores, dropping the count to the real 52. Of those, fixed everything actually caused by this session's work:
- Removed 7 now-dead calculation functions (`getPricePerSqmColor`, `calculateDaysOnMarket`, `getDaysOnMarketColor`, `getSalesCountColor`, `getCAGRColor`, `formatPropertyValue`, `formatUserValue`) and 3 unused imports, all orphaned by replacing the old fact-grid/preference-card JSX earlier in the session.
- Deleted `nearby-amenities-section.tsx` and `nearby-amenities.tsx` outright — fully orphaned once §04 was replaced with `DailyLife`, confirmed via grep that nothing else imports them.
- Fixed a real `react-hooks/set-state-in-effect` error in all three new data-fetching hooks (`use-risks-restrictions`, `use-district-comparison`, `use-nearby-places`) by deferring the `setState` calls into a microtask instead of calling them synchronously at the top of the effect body.

Down to 38 problems, all pre-existing in files this session never touched (not fixed — out of scope).

Remaining: PDF export (agreed follow-up), and Phase 3 items (supply & demand, Census tenure, Ofsted, commute times — all explicitly hidden-until-built per the brief).

## 0a. Major update (2026-10-18): §03 risk-checks sources already exist

While starting the build, discovered that `origin/main` on GitHub was 2 commits ahead of this working directory (confirmed live on `homelens.co` via the Vercel API — production has been running this code since 4 Aug 2026). Pulling it in resolved almost all of §0's "risk checks don't exist" gap:

- **Conservation area, Article 4, green belt, flood risk zones, listed buildings nearby, TPOs nearby** — `src/lib/planning-constraints.ts`, via the free `planning.data.gov.uk` API (MHCLG), no key required. Polygon-intersects for area-based constraints, small-buffer proximity query for point features (listed buildings/TPOs), with correct "nearby, not asserted on this exact plot" framing.
- **Crime** — `src/lib/crime-data.ts`, via the free `data.police.uk` API, no key required. ~1 mile radius, most recent available month, top categories.
- **Air quality** — `src/lib/environment-data.ts`, nearest-cell lookup against the already-populated `air_quality_grid` table.
- **Noise** — `src/lib/environment-data.ts`, live point query against DEFRA's noise WMS services (road/rail/airport, England only) — no bulk import needed.
- **Broadband** — `src/lib/broadband-coverage.ts`, exact-postcode lookup against the already-populated `broadband_coverage` table.

All wired through a dedicated `GET /api/risks-restrictions?lat&lon&postcode` endpoint, called client-side from the results page *after* the report renders — deliberately kept out of the report-generation critical path since the government APIs are slower/flakier than the core pipeline. `RisksRestrictions`/`RisksRestrictionsSection` components already render all of this as a single card (not yet the brief's table-with-status-dots layout — that's still a Phase 1 restyle).

**Remaining true gap**: none of §03's data sources are missing now. What's left is restyling the existing card into the brief's `Check · Finding · What it means · Status` table, and the local-authority crime baseline (explicitly deferred in the brief anyway).

## 0. Reality check vs. the brief

The brief in `design-reference/REPORT_REDESIGN_PROMPT.md` assumes several things exist that don't. Confirmed by reading the codebase and querying the live Supabase project directly:

| Brief assumption | Actual state |
|---|---|
| Report has existing risk checks (conservation area, Article 4, crime, flood, noise, air quality, broadband, listed building/TPO/green belt) | **None exist.** No code anywhere checks any of these. Air quality, broadband, NHS locations, nurseries, and parks tables are populated in Supabase (see §2) but never queried. Conservation area, Article 4, crime, flood zone, listed building, TPO, and green belt have **no data source at all** yet — these need to be designed from scratch, not just "surfaced." |
| `saved_reports` has a shape to preserve, just needs a `report_version` field added | Table exists live with **0 rows** and **zero application code** reads or writes it. Reports today are fully ephemeral — the whole report is serialized into the `/results` URL query string, nothing is persisted server-side. "Don't break old saved reports" is moot; there's nothing to break. We do need to decide whether this redesign is also the moment we start actually persisting reports. |
| PDF export exists and needs updating | **Does not exist.** The only "share" action is Web Share API / copy-link. Net-new build if we want it. |
| EPC data already gives current_energy_rating + construction_age_band | EPC is only called today to backfill floor area for price/m² comps. Rating and age band (needed for the new header) are not fetched or surfaced anywhere — small addition, not already done. |
| Inter / Inter Tight already set up | App font is a custom "Britti Sans" OTF. Inter Tight only appears in the new mockup HTML. Net-new font load. |
| `price_paid_data` has Land Registry sales to query | **Confirmed populated**: 4,537,767 rows, Jan 2021 – Sep 2025 (verified directly against the live project, correcting an earlier wrong finding from initial investigation). Sections 01/02 can be tested against real data — no repopulation needed. |
| A feature-flag mechanism exists for `SHOW_HOMELENS_SCORE` | No flag system of any kind. Only precedent is a `?debug=true` URL param on the results page. |

None of this blocks starting Phase 1 (layout + data already in hand) or Phase 2 (`price_paid_data` is populated and testable). Section 03 can't be built beyond air quality/broadband until we pick real sources for conservation area / Article 4 / crime / flood / listed building / TPO / green belt.

## 1. Current architecture (for reference)

- **Report page**: `src/app/results/page.tsx` — 2,578-line client component, state entirely from URL search params, no server fetch. Houses the fact strip, both charts, preferences/match pills, and ~1,000 lines of inline HomeLens-score math. No sub-components for header/score/risks/must-haves — it's all inline JSX in one file.
- **Generation pipeline**: single route `src/app/api/scrape-property/route.ts` (993 lines). Apify Rightmove scrape → area extraction (OpenAI vision/text fallback) → two parallel batches: postcodes.io geocoding + amenities fallback, then Supabase `price_paid_data` queries/RPC + Land Registry SPARQL + EPC floor-area backfill. Response flattens into the `/results` URL.
- **Nearby amenities**: separate client-side call, `GET /api/nearby-amenities` → `src/lib/nearby-amenities.ts` → Overpass, merged with Apify fallback. Decoupled from the main generation route.
- **Styling**: Tailwind + shadcn configured (`components.json`), but the results page doesn't use the shadcn `Card` — every "card" is a hand-styled `<div>` with hardcoded hex colors. `nearby-amenities.tsx` is the one place that does use shadcn `Card`.
- **Score**: real and fairly sophisticated (market metrics + must-have match, weighted, 0–999 via `ScoreGauge`), but entirely inline in the page file — not unit-testable as-is.

This means the redesign isn't a retrofit of existing section components — it's closer to a rebuild of the page as proper componentized sections, reusing the pipeline's working data fetches and the score math (extracted, not rewritten).

## 2. Section-by-section data mapping

Legend: 🟢 existing data, ready to wire up · 🟡 new calculation on data we already have · 🔴 new data source needed

### Header
- Address, postcode, Rightmove link, asking price, type, bedrooms, bathrooms, floor area — 🟢 already scraped via Apify, already on the page today in different layout.
- EPC rating + colour chip — 🟡 EPC call already happens (for floor-area backfill); just also read `current_energy_rating` from the same response and add the official EPC band colour map.
- Estimated year built (EPC `construction_age_band`) — 🟡 same EPC response, read `construction_age_band`, display the band string as-is (no parsing into a single year).
- No tenure field — removal, not addition.

### HomeLens score + key points
- Score block — 🟢 the calculation exists (inline); work is extraction into `src/lib/scoring.ts` with unit tests, plus the `SHOW_HOMELENS_SCORE` flag (new: simplest option is an env var `NEXT_PUBLIC_SHOW_HOMELENS_SCORE`, no DB-backed flag system exists to extend).
- Rules engine (3 tabs × 3 items) — 🟡 new pure-TS module, but every starter rule the brief lists runs on data we already have (asking vs district avg, days on market, conservation area/Article 4 *once §03 exists*, flood zone *once §03 exists*, EPC band, build era, listing "Reduced on" flag). Rules referencing conservation/Article4/flood are blocked on §03's new sources landing first.
- "Store generated items in the saved report" — 🔴 requires deciding on persistence (see §0); today nothing is saved past the URL.

### 01 Is the price fair?
- Recommended offer range, seller's gain, asking-vs-district, growth rates — 🟡 all computable from `price_paid_data` + the existing RPC, once that table has rows. Formulas are new (offer-range heuristic, annualised growth) and need unit tests per the brief.
- Price per m² vs district average — 🟡 existing code path (EPC-joined comps), needs the new district × type × year materialised view described in the brief rather than per-report querying.
- Neighbouring districts chart (nearest 4 outcodes by centroid distance) — 🟡 new calc: outcode centroid distances via postcodes.io (🟢 already integrated), medians via the new materialised view.
- District × type × year materialised view — 🔴 new Supabase object, net new. Needs a refresh schedule (pg_cron or a scheduled Vercel/edge job — none exists yet).

### 02 How fast is it selling?
- Days on market, 12-month sold count — 🟢/🟡 existing `price_paid_data` query + Apify listing date, just needs the "ending 3 months ago" lag adjustment and a vs-previous-12-months comparison added.
- Typical days-on-market sub-line — hidden per brief (no data), no work needed.
- Supply & demand (months of supply) — 🔴 needs a new Apify Rightmove **search** (not just scrape-by-URL) for for-sale counts in a district/type, with 24h caching. Net-new integration, not just a new calculation.
- 5 nearest recent sales — 🟡 existing `price_paid_data` + EPC join + postcodes.io distance, new presentation only.

### 03 What to check before you offer
This is the biggest gap. Per data point:
- Conservation area — 🔴 no source identified yet. Needs a council planning-data provider (nothing in the codebase touches this).
- Article 4 direction — 🔴 same; typically bundled with conservation-area data from the same provider, if one is chosen.
- Crime — 🔴 no source. Police.uk API (street-level crime, free, no auth) is the standard off-the-shelf option; local-authority baseline (mentioned in the brief as a hide-until-implemented clause) would need a second, aggregated endpoint or dataset.
- Flood risk — 🔴 no source. Environment Agency flood risk API is the standard option (free).
- Noise — 🔴 no source. DEFRA strategic noise mapping is England-only and typically distributed as downloadable grids, not a live API — likely a one-off import similar to the air-quality table, not a per-report call.
- Air quality — 🟢 `air_quality_grid` table already populated (254,904 rows), just never queried. Straightforward to wire up by nearest grid cell to the property's coordinates.
- Broadband — 🟢 `broadband_coverage` table already populated (1.7M rows), never queried. Straightforward postcode lookup.
- Listed building / TPO / green belt — 🔴 no source. Historic England's National Heritage List has an API for listed buildings; TPO and green belt are typically council-by-council (coverage will genuinely vary, matching the brief's caveat).

**Recommendation**: scope §03 into its own sub-phase. Air quality and broadband can ship in Phase 1 (data's already there). Conservation area / Article 4 / crime / flood / listed building / TPO / green belt all need a source decision before any code — I'd rather flag this now than build the risk table shell and leave 6 of 8 rows permanently hidden.

### 04 What daily life looks like here
- Nurseries & childcare — 🟢 `nurseries` table populated (27,581 rows), never queried.
- Everyday errands & health (GP/dentist/hospital with CQC rating) — 🟢 `nhs_locations` table populated with ratings (23,056 rows), never queried. Supermarket needs Overpass (🟢 already integrated via `/api/nearby-amenities`).
- Green space — 🟢 `parks` table populated (8,252 rows), never queried.
- The school run — 🟡 schools come via the existing Overpass/Apify nearby-amenities path already; Ofsted ratings explicitly hidden for this phase per the brief (no source yet).
- Getting to work (commute) — hidden per brief, no work needed yet (needs a routing source later).
- Census tenure split — 🔴 one-off ONS Census 2021 tenure dataset import by LSOA, explicitly a later/hidden phase per the brief.
- Walking times from straight-line distance — 🟡 trivial calc, just needs the copy change the brief specifies (don't claim real routing).

### 05 Does it tick your boxes?
- 🟢 Must-haves matching already exists (it's half of the current score calc) — this is a relocation to the end of the report, not new logic.

### Footer
- 🟢 "Analyse another property" exists today (as the results-page CTA). Sources line is copy, pending which §03 sources actually ship.

## 3. Other build items the brief calls for that are net-new (not just "move this")

- **`report_version` + persistence decision**: since `saved_reports` is currently unused, recommend either (a) start writing real reports to it now with `report_version = 2` from day one, giving the redesign an actual persistence story, or (b) keep reports URL-only for this redesign and treat `report_version` as forward-looking schema only. Need your call before Phase 1 — it affects whether the rules-engine output and recommended-offer calc need a stable storage shape now or can stay request-scoped.
- **Feature flag**: propose a simple `NEXT_PUBLIC_SHOW_HOMELENS_SCORE` env var for now rather than building a flags system, since there's no existing precedent to extend and the brief only needs one flag.
- **Score extraction**: pull the ~1,000 lines of inline scoring math out of `results/page.tsx` into `src/lib/scoring/` with unit tests — needed regardless of the flag, since the brief wants the score's "Risks" sub-score to reflect the new §03 checks.
- **Fonts**: add Inter Tight + Inter via `next/font/google` (there's already a working `next/font/google` pattern for Geist in `layout.tsx` to copy, even though Geist itself isn't used by Tailwind today).
- **PDF export**: genuinely net-new. Needs a library choice (e.g. `@react-pdf/renderer` or a Puppeteer-based route) — not scoped in detail here since it's explicitly phase-3-adjacent in the brief ("update the PDF export" assumes one exists; recommend treating as new work, sized separately once phases 1–2 land).
- **Git hygiene**: `design-reference/`, `scripts/`, and 6 of 7 `supabase-add-*.sql` files are currently untracked — worth committing as part of this work so the SQL/import history isn't lost.

## 4. Proposed build order

Mostly following the brief's 3 phases, with the §03 and persistence caveats folded in:

1. **Phase 1 — layout + data we already have**: new componentized page structure (header, score behind flag, tabs shell, must-haves moved to end, footer), wire up air quality / broadband / nurseries / NHS / parks tables (all populated, zero app code today), EPC rating + age band, mobile layout, score extracted to `src/lib`. Rules engine ships with only the rules that don't depend on §03 sources; conservation/Article4/flood-dependent rules land once those sources exist.
2. **Phase 2 — new calculations on existing data**: district aggregates materialised view, price/m² comparison, growth rates, neighbour chart + ranking, 12-month sales trend, 5 nearest sales, seller's gain, recommended-offer formula — all unit-tested, verifiable against real `price_paid_data` rows.
3. **Phase 3 — new data sources**: decide and integrate conservation area / Article 4 / crime / flood / listed building / TPO / green belt (§03 remainder), Apify district search for supply & demand, Census tenure import, Ofsted, commute times — each hidden until done, per the brief.

## 5. Decisions (resolved 2026-10-18)

1. **Persistence**: start writing to `saved_reports` now, `report_version = 2` for all new reports.
2. **Feature flag**: `NEXT_PUBLIC_SHOW_HOMELENS_SCORE` env var.
3. **§03 risk sources**: research free/official options for conservation area, Article 4, crime, flood, listed building/TPO/green belt first; bring back a shortlist before integrating. Air quality + broadband ship in Phase 1 regardless (data already populated).
4. **PDF export**: deferred — separate follow-up, sized after Phase 1/2 land.
5. **`price_paid_data`**: confirmed populated (4.5M rows, Jan 2021–Sep 2025) — no repopulation needed, this is resolved.
