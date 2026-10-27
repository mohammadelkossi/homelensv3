# HomeLens report redesign — implementation brief

## Context
HomeLens (Next.js + TypeScript + Supabase + Vercel) generates a property report from a Rightmove listing URL. We have redesigned the report. Your job is to take the **current report** in this codebase to the **new design**, including the back-end data it needs.

Two reference files are in `/design-reference/` (add them to the repo first):
- `report-reference-desktop.html` — full report at 1200px
- `report-reference-mobile.html` — the same report at 390px

They are **visual references only**. Rebuild them as proper React components using our existing styling approach. Do not paste the HTML in. Anything with a **dotted underline** in the reference is **sample/placeholder data**: it shows where real data goes, it must never ship as text.

Existing data sources (already in the codebase — find them before adding anything):
- Rightmove listing via Apify (`dhrumil/rightmove-scraper`)
- EPC data (new MHCLG EPC API)
- HM Land Registry price paid data: Supabase table `price_paid_data` (~2021 onwards) + Land Registry SPARQL for full history / address resolution
- postcodes.io (geocoding, outcode/LSOA lookups)
- Overpass / OpenStreetMap (nearby amenities)
- Existing risk checks (conservation area, Article 4, crime, flood, noise, air quality, broadband, listed building / TPO / green belt)

## How to work
1. **Explore first, code second.** Read the current report page, its components, the report-generation/enrichment pipeline, the saved report data shape (`saved_reports`), and the PDF export. Then write a short plan in `docs/report-redesign-plan.md` mapping every section of the new design to: existing data we already have / a new calculation on existing data / a new data source. Stop and show me the plan before building.
2. Work in the phases below. Each phase must leave the app deployable.
3. **Never show placeholders.** If a value is missing or a source fails, hide that item (or the whole card) — don't render "[X]", "—" or a guess. Each new data point must fail gracefully without breaking report generation.
4. **Don't break saved reports.** Add a `report_version` field (new reports = 2). Old saved reports must still render with the old layout. Don't migrate old data.
5. Keep report generation fast: run new enrichment calls in parallel with the existing batches; pre-compute anything that can be pre-computed.
6. Write unit tests for every new calculation (offer range, growth rates, months of supply, rules engine, EPC age-band parsing).

## The new report, section by section

### Header
- Address (street + town) as the H1, postcode + "View on Rightmove ↗" in the left label column. "Property report · {date}" in the top bar.
- **No hero photo/map** any more.
- Fact grid (4 columns desktop, 2 columns mobile): **Asking price · Type · Bedrooms · Bathrooms · Floor area · EPC rating · Estimated year built**.
  - EPC rating: EPC `current_energy_rating`, with a small colour chip in the official EPC band colour.
  - Estimated year built: from EPC `construction_age_band`. These are bands (e.g. "1900–1929", "1930–1949", "2012 onwards") — parse and display the band as-is, don't invent decades.
  - Floor area: listing first, EPC `total_floor_area` as fallback.
  - **No tenure field.**

### HomeLens score + key points
- Score block (score, /max, verdict label, 5 sub-scores: Price, Market, Location, Your must-haves, Risks). I'm undecided about keeping the score — put the whole block behind a feature flag `SHOW_HOMELENS_SCORE` so it can be switched off without layout breaking.
- Next to it, a **tabbed block with three tabs**: "3 things to know" · "Things to consider" · "To ask the agent". Each tab always shows exactly **3 numbered items** (title + one short line).
- Build a **rules engine** (pure TypeScript, deterministic, no AI needed) that produces all three lists from report data. Each rule = trigger condition + priority + title/description template. Take the top 3 per tab by priority, with sensible fallbacks so each tab always has 3. Store the generated items in the saved report so they don't change later. Starter rules (expand as sensible):
  - Know: asking price vs district average (if > ±10%), long time on market (> 60 days), conservation area / Article 4, flood zone 2/3, no recent sales in postcode, large seller's gain.
  - Consider: EPC D or worse ("expect higher heating bills"), built before 1930 ("get a Level 3 survey"), EPC improvement budget, conservation-area limits on upgrades, flood insurance, noise above 55 dB.
  - Ask the agent: freehold or leasehold (always available as a fallback — we don't show tenure), why it hasn't sold (if > 60 days), is the seller in a chain, what's included, any planning history (if conservation/Article 4), has the price been reduced (only if the listing shows "Reduced on").

### 01 Is the price fair?
- **Recommended offer** (labelled "Illustrative"): a range (e.g. £665k – £690k), "X–Y% below the asking price", a suggested opening offer, and a "Why this range" list of the signals used. Rules-based and configurable: start from asking price and apply discounts for days on market, premium over district average, seller's gain, lack of local sales. Keep the disclaimer: "A guide based on local sales and market signals, not a formal valuation. Doesn't account for condition or improvements." Unit-test the formula.
- **Seller's gain at asking price**: asking − last sale price (£ and %), "since they bought in {year}", paid vs asking rows.
- Four stats: **Asking price vs district average** (%, £ vs £, "Detached sales, {year}"), **Price per m² vs district average** (%, £/m² vs £/m², "{district} sales with a known floor area"), **This home's value growth** (annualised growth between consecutive sales: latest period as the headline, previous period as the sub-line), **District value growth** (annualised over the last ~3 years + "+X% in the last year").
- **Neighbouring districts line chart**: median sold price for this property type, this district + the 4 nearest postcode districts (by outcode centroid distance), by year for the last 4 full years. Drop any year with fewer than 5 sales. This district highlighted.
- **This home's price history chart**: past sales (filled dots), asking price (hollow dot, dashed line — not a sale), district median as a dashed horizontal line.
- **Ranking bars**: "How the asking price compares" — district medians for the latest year, highest first, plus "This home" as a dashed bar.
- **Back end**: create a pre-computed Supabase table/materialised view of **district × property type × year** with median price, sale count and median £/m² (£/m² needs Land Registry sales matched to EPC floor area by address). Refresh it on a schedule. Most of this section should read from it rather than querying `price_paid_data` per report.

### 02 How fast is it selling?
- **On the market**: days since first listed (from the listing). Sub-line "Typical in {district}: X days" — **hide this line for now** (we don't collect the data yet).
- **Detached (property type) homes sold in {district}, past 12 months**: count + change vs the previous 12 months. Land Registry lags 2–3 months — use the 12 months ending 3 months ago and say so in the code comments. Small print: sales in the postcode itself.
- **Supply & demand**: months of supply = (same-type homes for sale in the district now) ÷ (sales per month from the count above). Label: < 4 months Seller's, 4–6 Balanced, > 6 Buyer's; show the 3-segment bar with the active one highlighted and a line like "6 detached for sale now · about 10 months of supply". The for-sale count needs an Apify Rightmove search for the district + property type (cache per district for 24h). If fewer than ~10 sales, widen to all property types in the district and say so. If the search fails, hide the card.
- **There is no listing / price-change history table** in the new design — don't build one.
- **5 most recent sales nearby**: closest same-type sales in the last 2 years — address, date, price, £/m² (EPC join, "—" allowed only in this column), distance (postcode centroid via postcodes.io bulk lookup). Land Registry has no bedrooms: use EPC habitable rooms if available or drop the bedrooms line. Final row: "This home (asking)".

### 03 What to check before you offer
- Same risk checks as today, now a table: **Check · Finding · What it means · Status**. Each check needs a status: `clear` / `check` / `nothing_found`, with a coloured dot. Keep the coverage caveat for listed building / TPO / green belt. On mobile each row stacks (check + status on top, finding, then meaning).
- Crime "[Compared with the Leeds average]" needs a local-authority baseline — hide that clause until implemented.

### 04 What daily life looks like here
Restructure from "one nearest place per category" into grouped cards, each with a headline + up to 3 nearest places with walking minutes:
- **Getting to work** — commute times (train to nearest city centre, drive at 8am, cycle). **Hide this card in this phase**; we'll add a routing source later.
- **The school run** — 3 nearest primary schools. Ofsted rating is a later phase (hide).
- **Nurseries & childcare** — nearest + count within 5 minutes.
- **Everyday errands & health** — nearest supermarket (or "No supermarket found within {radius} km"), dentist, GP (with CQC rating if we have it), hospital.
- **Green space** — 3 nearest parks.
- **How homes are occupied** — Census 2021 tenure split for the home's LSOA (owned outright, mortgage, private rented, social rented) vs England. One-off import of the ONS tenure dataset into Supabase; LSOA from postcodes.io. Later phase — hide until imported.
- Walking times: if we don't use real routing, compute from straight-line distance at ~5 km/h and change the copy to say so (the reference says "most direct route" — don't claim routing we don't do).

### 05 Does it tick your boxes?
- Must-haves (Yes/No) moved to the end of the report, with the "Set your must-haves to personalise the score" link.

### Footer
- "Comparing homes? Run another listing and see them side by side." + "Analyse another property →" button.
- Sources line — add EPC register, Rightmove listing data, and Census 2021 / Ofsted when those ship.

## Design rules
- Swiss / editorial style: Inter Tight (light weights for big numbers/headings) + Inter for body, black hairline rules between sections, 12-column grid on desktop (3-col label column + 9-col body), numbered sections (01–05), generous whitespace, no cards/bubbles/shadows.
- Colours: near-black text #0B0B0C, accent blue #0A369D (this home / highlights), warning orange-red for negative signals, green for clear/positive, greys for comparison data.
- Mobile (≤ 640px): single column, label column stacks above body, fact grid and key stats in 2 columns, big headline numbers scale down (~52px max), tables stay inside the viewport (no horizontal page scroll), tabs fit on one line.
- Top nav: anchor links to sections (Price · Market · Risks · Nearby · Must-haves), Share, PDF.
- Update the PDF export to match the new layout.

## Phases
1. **Layout + data we already have**: new page structure, header facts (incl. EPC + age band), score behind flag, tabs with the rules engine, risk table with statuses, nearby regrouping, must-haves at the end, footer, `report_version`, mobile.
2. **New calculations on existing data**: district aggregates table, price/m² comparison, growth rates, neighbour chart + ranking, 12-month sales count + trend, 5 nearest sales, seller's gain, recommended offer.
3. **New data sources** (each hidden until done): supply & demand (Apify district search), Census tenure, Ofsted, crime baseline, commute times.

At the end of each phase: run the type-checker, linter and tests, generate a report for a real listing (e.g. a detached house in LS18) and check it against the reference files at 1200px and 390px, then summarise what changed and what's still hidden.
