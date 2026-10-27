"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import posthog from "posthog-js"
import { Footer } from "@/components/footer"
import { Navbar } from "@/components/navbar"
import { interBody, interTight } from "@/app/results/report-fonts"
import { INK, MUTED, HAIRLINE, ACCENT, WARN, BODY_FONT, DISPLAY_FONT } from "@/components/tools/tool-ui"
import { PriceFairness } from "@/components/report/price-fairness"
import { RankingBars } from "@/components/report/ranking-bars"
import { NeighbourChart } from "@/components/report/neighbour-chart"
import { ReportHeader } from "@/components/report/report-header"
import { HomeLensScore } from "@/components/report/homelens-score"
import { KeyPointsTabs } from "@/components/report/key-points-tabs"
import type { KeyPoints } from "@/lib/rules-engine"
import {
  homeLensScore,
  scoreDailyLife,
  scoreMarket,
  scoreMustHaves,
  scorePrice,
  scoreRisks,
  scoreSectionRows,
} from "@/lib/scoring/homelens-score"
import { HomePriceHistoryChart } from "@/components/report/home-price-history-chart"
import { districtValueGrowth, homeValueGrowth } from "@/lib/pricing/recommended-offer"
import { MarketSpeed } from "@/components/report/market-speed"
import { SupplyDemand } from "@/components/report/supply-demand"
import { NearestForSale } from "@/components/report/nearest-for-sale"
import { DailyLife } from "@/components/report/daily-life"
import { MustHavesGrid, type MustHaveItem } from "@/components/report/must-haves-grid"
import { RisksRestrictionsSection } from "@/components/risks-restrictions-section"
import {
  SAMPLE_ASKING_PRICE,
  SAMPLE_ASKING_YEAR,
  SAMPLE_AI_OFFER,
  SAMPLE_AGE_BAND,
  SAMPLE_BATHROOMS,
  SAMPLE_BEDROOMS,
  SAMPLE_EPC_RATING,
  SAMPLE_TENURE,
  SAMPLE_AVERAGE_PRICE_BY_YEAR,
  SAMPLE_CENSUS_TENURE,
  SAMPLE_DISTRICT_PRICE_PER_SQM,
  SAMPLE_ENGLAND_TENURE,
  SAMPLE_FIRST_LISTED,
  SAMPLE_FLOOR_AREA_SQM,
  SAMPLE_KEY_POINTS,
  SAMPLE_NEARBY,
  SAMPLE_NEIGHBOUR_DISTRICTS,
  SAMPLE_NEAREST_FOR_SALE,
  SAMPLE_NEAREST_SALES,
  SAMPLE_OUTCODE,
  SAMPLE_PAST_SALES,
  SAMPLE_POSTCODE,
  SAMPLE_POSTCODE_SALES_12M,
  SAMPLE_PROPERTY_TYPE,
  SAMPLE_RANKING,
  SAMPLE_RANKING_YEAR,
  SAMPLE_RISKS,
  SAMPLE_SALES_TREND,
  SAMPLE_SUPPLY_DEMAND,
} from "@/app/home-sample-report"

const BAR = "#D4D4D8"
const CARD_BORDER = "#DCE2EB"
const CARD_DIVIDER = "#EDF0F5"


const STATS = [
  // Land Registry's full Price Paid record (1995 onwards, ~30M sales), which each report's
  // address match and sale history query live — not just our own 2021+ copy (~4.5M rows).
  { value: "20M+", text: "home sales, HM Land Registry", glyph: "dot" },
  { value: "30+ yrs", text: "of sale history, back to 1995", glyph: "bars" },
  { value: "1.7M", text: "postcodes with broadband coverage, from Ofcom", glyph: "bar" },
  { value: "11", text: "official and open data sources behind each report", glyph: "steps" },
] as const

const STEPS = [
  { title: "Tell us what matters", text: "Bedrooms, bathrooms, garden, parking — the things you won’t compromise on." },
  { title: "Paste a Rightmove link", text: "Any house or flat for sale on Rightmove. The report takes under a minute." },
  { title: "Decide with the facts", text: "Price, market, risks and daily life in one report, scored against your must-haves." },
]

// Everything each report section contains (see src/components/report/*).
const QUESTIONS = [
  {
    title: "At a glance",
    items: [
      "The full address and postcode",
      "Asking price, property type, bedrooms and bathrooms",
      "Floor area, EPC rating and estimated year built",
      "Tenure",
      "HomeLens score, broken down by price, market, location, must-haves and risks",
      "Key points: why it works, what to watch out for and what to ask the agent",
    ],
  },
  {
    title: "What is a fair price?",
    items: [
      "Recommended offer range and opening offer",
      "Why that range: the signals behind it",
      "The seller’s gain, if it’s sold before",
      "How the asking price compares with nearby districts",
      "Asking price vs the area average",
      "Price per m² vs the area average",
      "Area value growth, and the last 12 months",
      "Average sold prices: the area vs its neighbours",
      "This home’s price history, if it’s sold before",
    ],
  },
  {
    title: "How is the local market?",
    items: [
      "Days on the market and when it was first listed",
      "Area sales in the past 12 months vs the year before",
      "Sales in the postcode itself",
      "Supply & demand: buyer’s, balanced or seller’s market",
      "5 most recent sales nearby, with £ per m²",
      "5 closest homes for sale now",
    ],
  },
  {
    title: "What to check before you offer",
    items: [
      "Crime reported nearby",
      "Broadband speeds",
      "Air quality",
      "Road, rail and aircraft noise",
      "Flood risk",
      "Conservation area",
      "Article 4 direction",
      "Listed buildings, tree preservation and green belt",
    ],
  },
  {
    title: "What daily life looks like here",
    items: [
      "How homes nearby are occupied (Census 2021)",
      "The school run",
      "Nurseries and childcare, with Ofsted ratings",
      "Transport: nearest stations",
      "Health: GPs, dentists and hospitals, with CQC ratings",
      "Green space",
      "Walking times to all of the above",
    ],
  },
  {
    title: "Does it tick your boxes?",
    items: ["Garden, parking and garage", "Bedrooms and bathrooms", "Property type", "Checked against your own must-haves"],
  },
]

// Same wording as the live homelens.co FAQs (minus the four dropped questions).
const FAQS = [
  { q: "How does HomeLens work?", a: "Simply paste a Rightmove property link into our platform & tell us your personal preferences for your new home. We'll pull the data and analyse it against both the market (price per square metre, local growth rates etc) and your personal preferences. You then get a clear score for how closely that property matches your needs." },
  { q: "What can I do with my score?", a: "The analysis is meant for a) comparison between different properties, b) to provide an insight into a property's value & c) as leverage for negotiation with the property seller" },
  { q: "How quickly do I get my report?", a: "Reports generate instantly. As soon as you paste a property link, our system pulls the data and creates your personalised analysis. No waiting days or weeks like traditional property reports." },
  { q: "Can I analyse any property on Rightmove?", a: "Yes, as long as it's an active Rightmove listing with sufficient data. Our system works with houses, flats, new builds, and period properties across England and Wales." },
  { q: "Is HomeLens a replacement for a survey or solicitor?", a: "No. HomeLens helps you decide which properties are worth pursuing before you spend money on surveys, legal fees, or even viewings. Think of us as your pre-purchase filter, not a replacement for professional property services." },
  { q: "Can I share reports with my partner or estate agent?", a: "Yes. Every report includes a shareable link so you can easily discuss findings with family, friends, or your estate agent." },
  { q: "What if a property I analysed gets reduced in price?", a: "Great question! Property prices change frequently. If you've analysed a property and the price drops, simply re-run the analysis with the updated link. Your Personal Fit score stays the same, but the Investment Score will update to reflect the new pricing." },
]

type PriceSampleData = {
  offer: string
  offerNote: string
  stats: { k: string; v: string; warn: boolean }[]
  neighbours: { label: string; value: string; width: string; highlight?: boolean }[]
  home: { value: string; width: string }
}

// 61 King Edward Crescent (hero). Offer is gpt-6-astra's (SAMPLE_AI_OFFER), as in the
// sample report. Area figures are 2026 semi-detached averages (HM Land Registry);
// £/m² vs LS18's £3,831 average. Bars scaled £250k–£400k.
const belowAsking = (value: number) => Math.round(((SAMPLE_ASKING_PRICE - value) / SAMPLE_ASKING_PRICE) * 100)
const KING_EDWARD_PRICE: PriceSampleData = {
  offer: `£${SAMPLE_AI_OFFER.low / 1000}k – £${SAMPLE_AI_OFFER.high / 1000}k`,
  offerNote: `${belowAsking(SAMPLE_AI_OFFER.high)}–${belowAsking(SAMPLE_AI_OFFER.low)}% below the £${SAMPLE_ASKING_PRICE.toLocaleString("en-GB")} asking price`,
  stats: [
    { k: "Asking vs LS18", v: "−5%", warn: false },
    { k: "Price/m² vs LS18", v: "−3%", warn: false },
    { k: "On the market", v: "167 days", warn: true },
    // districtValueGrowth: LS18 semi averages £340,564 (2023) → £365,594 (2026), annualised.
    // Shown instead of the home's own growth: 61 has no Land Registry sale since 1995.
    { k: "LS18 value growth", v: "2.4% / yr", warn: false },
  ],
  neighbours: [
    { label: "LS18 · this area", value: "£366k", width: "77%", highlight: true },
    { label: "LS17 Alwoodley", value: "£350k", width: "67%" },
    { label: "LS16 Adel", value: "£336k", width: "57%" },
    { label: "LS20 Guiseley", value: "£315k", width: "43%" },
  ],
  home: { value: "£349k", width: "66%" },
}

function trackGetStarted(location: string) {
  posthog.capture("get_started_clicked", { location })
}

function PrimaryButton({ location, children }: { location: string; children: ReactNode }) {
  return (
    <Link
      href="/preferences"
      onClick={() => trackGetStarted(location)}
      className="inline-flex h-[52px] items-center justify-center whitespace-nowrap px-6 text-[14px] font-medium text-white no-underline transition-colors hover:bg-[#2A2A2E] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A369D]/50"
      style={{ backgroundColor: INK, border: `1px solid ${INK}` }}
    >
      {children}
    </Link>
  )
}

function GhostButton({ href, newTab = false, children }: { href: string; newTab?: boolean; children: ReactNode }) {
  return (
    <a
      href={href}
      {...(newTab && { target: "_blank", rel: "noopener noreferrer" })}
      className="inline-flex h-[52px] items-center justify-center whitespace-nowrap bg-white px-6 text-[14px] font-medium no-underline transition-colors hover:bg-[#F4F4F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A369D]/50"
      style={{ color: INK, border: `1px solid ${INK}` }}
    >
      {children}
    </a>
  )
}

function Glyph({ kind }: { kind: (typeof STATS)[number]["glyph"] }) {
  const common = { className: "mb-[22px] block h-[18px]", "aria-hidden": true as const }
  if (kind === "dot") return <svg {...common} viewBox="0 0 18 18"><circle cx="9" cy="9" r="8" fill={INK} /></svg>
  if (kind === "bars")
    return (
      <svg {...common} viewBox="0 0 22 18">
        <rect y="1" width="22" height="3" fill={INK} />
        <rect y="7.5" width="15" height="3" fill={INK} />
        <rect y="14" width="19" height="3" fill={INK} />
      </svg>
    )
  if (kind === "bar") return <svg {...common} viewBox="0 0 10 18"><rect x="1" width="8" height="18" fill={INK} /></svg>
  return <svg {...common} viewBox="0 0 22 18"><path d="M0 18V12H8V6H14V0H22V18Z" fill={INK} /></svg>
}

function Light({ size, color = INK, children }: { size: number; color?: string; children: ReactNode }) {
  return (
    <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 300, fontSize: size, letterSpacing: "-0.04em", lineHeight: 1, color }}>
      {children}
    </div>
  )
}

function ReportFrame({ left, right, children }: { left: string; right: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-hidden bg-white" style={{ border: `1px solid ${INK}` }}>
      <div className="flex items-center justify-between gap-3 px-3.5 py-2 text-[11px]" style={{ borderBottom: `1px solid ${INK}`, color: MUTED }}>
        <span className="truncate">{left}</span>
        <span className="shrink-0">{right}</span>
      </div>
      {children}
    </div>
  )
}

function ReportScore({ score, max }: { score: number; max: number }) {
  return (
    <div className="shrink-0 text-right">
      <div className="flex items-baseline justify-end gap-1">
        <span className="text-[40px] sm:text-[48px]" style={{ fontFamily: DISPLAY_FONT, fontWeight: 300, letterSpacing: "-0.04em", lineHeight: 1, color: ACCENT }}>
          {score}
        </span>
        <span className="text-[13px]" style={{ color: MUTED }}>/{max}</span>
      </div>
      <div className="mt-1.5 text-[13px]" style={{ fontFamily: DISPLAY_FONT, fontWeight: 500, letterSpacing: "-0.02em" }}>HomeLens score</div>
    </div>
  )
}

function PriceSample({ data, aside }: { data: PriceSampleData; aside?: ReactNode }) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[10px]" style={{ color: MUTED }}>
            Recommended offer
          </div>
          <div className="my-1 whitespace-nowrap"><Light size={40} color={ACCENT}>{data.offer}</Light></div>
          <div className="text-[11px]" style={{ color: MUTED }}>{data.offerNote}</div>
        </div>
        {aside}
      </div>
      <div
        className={`mb-3.5 mt-4 grid gap-3.5 pt-3 ${data.stats.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}
        style={{ borderTop: `1px solid ${INK}` }}
      >
        {data.stats.map((s) => (
          <div key={s.k}>
            <div className="text-[10px]" style={{ color: MUTED }}>{s.k}</div>
            <div className="mt-[3px]"><Light size={24} color={s.warn ? WARN : INK}>{s.v}</Light></div>
          </div>
        ))}
      </div>
      {data.neighbours.map((n) => (
        <div
          key={n.label}
          className="grid grid-cols-[86px_1fr_40px] items-center gap-2 py-1 text-[10.5px]"
          style={n.highlight ? { color: ACCENT, fontWeight: 600 } : undefined}
        >
          <span>{n.label}</span>
          <span style={{ height: 6, width: n.width, backgroundColor: n.highlight ? ACCENT : BAR }} />
          <span className="text-right">{n.value}</span>
        </div>
      ))}
      <div className="grid grid-cols-[86px_1fr_40px] items-center gap-2 py-1 text-[10.5px] font-semibold" style={{ color: WARN }}>
        <span>This home</span>
        <span style={{ borderTop: `2px dashed ${WARN}`, width: data.home.width }} />
        <span className="text-right">{data.home.value}</span>
      </div>
    </>
  )
}

// Nearest semi-detached sales to 61 King Edward Crescent in the last 2 years
// (HM Land Registry, from /api/district-comparison), formatted as the report does.
const KING_EDWARD_ASKING = { price: 349000, areaSqm: 94.1 }
const KING_EDWARD_RECENT_SALES = [
  { address: "39 King Edward Avenue", postcode: "LS18 4BD", price: 342500, date: "2026-05-18", distanceKm: 0.109, areaSqm: 96 },
  { address: "3 Salmon Crescent", postcode: "LS18 4ET", price: 485000, date: "2025-12-12", distanceKm: 0.149, areaSqm: 150 },
  { address: "35 Drury Avenue", postcode: "LS18 4BR", price: 338500, date: "2025-07-21", distanceKm: 0.170, areaSqm: 106 },
  { address: "134 Stanhope Drive", postcode: "LS18 4EU", price: 345000, date: "2024-10-25", distanceKm: 0.194, areaSqm: 83 },
  { address: "85 Stanhope Drive", postcode: "LS18 4EU", price: 317000, date: "2024-10-07", distanceKm: 0.194, areaSqm: 96 },
]

// LS18 semi-detached, from /api/supply-demand (Oct 2026): 37 unique Rightmove listings vs
// 82 HM Land Registry sales in the past 12 months ≈ 5.4 months → "Balanced" (4–6).
function SupplyDemandMini() {
  return (
    <div className="w-full sm:w-[210px]">
      <div className="text-[10px]" style={{ color: MUTED }}>Supply & demand, LS18</div>
      <div className="mt-1.5 grid grid-cols-3 gap-1">
        {["Seller’s", "Balanced", "Buyer’s"].map((segment) => {
          const active = segment === "Balanced"
          return (
            <div key={segment}>
              <div className="h-1.5" style={{ backgroundColor: active ? ACCENT : BAR }} />
              <div className="mt-1 text-[10px]" style={{ fontFamily: DISPLAY_FONT, fontWeight: active ? 600 : 400, color: active ? ACCENT : INK }}>
                {segment}
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-1 text-[10px]" style={{ color: MUTED }}>37 for sale · about 5 months of supply</div>
    </div>
  )
}

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })
const perSqm = (price: number, area: number) => `£${Math.round(price / area).toLocaleString("en-GB")}`
const soldMonth = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
const miles = (km: number) => `${(km * 0.621371).toFixed(1)} mi`

function RecentSalesTable() {
  const cell = "py-1.5 pr-2 text-[11px]"
  return (
    <>
      <div className="text-[13px] font-semibold">5 most recent sales nearby</div>
      <p className="mb-1.5 mt-0.5 text-[11px]" style={{ color: MUTED }}>Closest semi-detached sales in the last 2 years.</p>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {["Address", "Sold", "£ / m²", "Price", "Dist."].map((h, i) => (
              <th key={h} className={`pb-1 pr-2 text-[10px] font-medium ${i >= 2 ? "text-right" : "text-left"}`} style={{ color: MUTED, borderBottom: `1px solid ${INK}`, fontFamily: DISPLAY_FONT }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr style={{ color: ACCENT, fontWeight: 600, borderBottom: `1px solid ${HAIRLINE}` }}>
            <td className={cell}>This home (asking)</td>
            <td className={cell}>Now</td>
            <td className={`${cell} text-right`}>{perSqm(KING_EDWARD_ASKING.price, KING_EDWARD_ASKING.areaSqm)}</td>
            <td className={`${cell} text-right`}>{gbp.format(KING_EDWARD_ASKING.price)}</td>
            <td className={`${cell} text-right`} />
          </tr>
          {KING_EDWARD_RECENT_SALES.map((s) => (
            <tr key={s.address} style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
              <td className={cell}>
                {s.address}
                <span className="hidden sm:inline" style={{ color: MUTED }}>, {s.postcode}</span>
              </td>
              <td className={`${cell} whitespace-nowrap`}>{soldMonth(s.date)}</td>
              <td className={`${cell} text-right`}>{perSqm(s.price, s.areaSqm)}</td>
              <td className={`${cell} text-right font-semibold`}>{gbp.format(s.price)}</td>
              <td className={`${cell} whitespace-nowrap text-right`}>{miles(s.distanceKm)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

function daysSince(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000)
}

const SAMPLE_MUST_HAVES: MustHaveItem[] = [
  { label: "Garden", value: true },
  { label: "Parking", value: true },
  { label: "Garage", value: false },
  { label: "4 bedrooms", value: true },
  { label: "1 bathroom", value: false },
  { label: "Semi-Detached", value: true },
]

function SampleRanking() {
  const prices = SAMPLE_RANKING.map((r) => r.price)
  const insight =
    SAMPLE_ASKING_PRICE > Math.max(...prices)
      ? `At ${gbp.format(SAMPLE_ASKING_PRICE)} it’s asking more than the typical semi-detached home in any nearby district.`
      : SAMPLE_ASKING_PRICE < Math.min(...prices)
        ? `At ${gbp.format(SAMPLE_ASKING_PRICE)} it’s asking less than the typical semi-detached home in every nearby district.`
        : `At ${gbp.format(SAMPLE_ASKING_PRICE)} it’s asking more than some nearby districts and less than others.`
  return (
    <div>
      <div className="font-semibold">How the asking price compares, {SAMPLE_RANKING_YEAR}</div>
      <div className="mt-1" style={{ color: MUTED }}>{insight}</div>
      <div className="mt-4"><RankingBars rows={SAMPLE_RANKING} thisHomePrice={SAMPLE_ASKING_PRICE} /></div>
      <p className="mt-1.5 text-[12px]" style={{ color: MUTED }}>Average semi-detached sold price by district.</p>
    </div>
  )
}

const ORDINALS = ["", "second", "third", "fourth", "fifth", "sixth"]

function neighbourRankInsight(): string {
  const i = SAMPLE_RANKING.findIndex((r) => r.isSubjectDistrict)
  if (i === 0) return `${SAMPLE_OUTCODE} is the most expensive of its neighbours.`
  if (i === SAMPLE_RANKING.length - 1) return `${SAMPLE_OUTCODE} is the least expensive of its neighbours.`
  return `${SAMPLE_OUTCODE} is the ${ORDINALS[i]} most expensive of its neighbours, behind ${SAMPLE_RANKING[i - 1].label}.`
}

// 61 King Edward Crescent's real HomeLens score, from the same scoring module as the
// report. Must-haves use the sample buyer shown in §05: 4 beds, 2 baths, a semi, and
// a garden, parking and a garage, all equally important.
function sampleHomeLens(daysOnMarket: number) {
  return homeLensScore({
    price: scorePrice({
      askingPrice: SAMPLE_ASKING_PRICE,
      districtAveragePrice: SAMPLE_AVERAGE_PRICE_BY_YEAR[String(SAMPLE_RANKING_YEAR)],
      pricePerSqm: SAMPLE_ASKING_PRICE / SAMPLE_FLOOR_AREA_SQM,
      districtPricePerSqm: SAMPLE_DISTRICT_PRICE_PER_SQM,
      areaGrowthRatePercent: districtValueGrowth(SAMPLE_AVERAGE_PRICE_BY_YEAR)?.multiYearRatePercent ?? null,
    }),
    market: scoreMarket({
      supplyDemandLabel: SAMPLE_SUPPLY_DEMAND.label,
      daysOnMarket,
      salesTrendChangePercent: SAMPLE_SALES_TREND.changePercent,
    }),
    risks: scoreRisks(SAMPLE_RISKS),
    dailyLife: scoreDailyLife(SAMPLE_NEARBY),
    mustHaves: scoreMustHaves({
      wanted: { bedrooms: "4", bathrooms: "2", propertyType: "semi-detached", size: null },
      importance: { bedrooms: 50, bathrooms: 50, propertyType: 50, size: 50, garden: 50, parking: 50, garage: 50 },
      home: {
        bedrooms: Number(SAMPLE_BEDROOMS),
        bathrooms: Number(SAMPLE_BATHROOMS),
        propertyType: SAMPLE_PROPERTY_TYPE,
        areaSqm: SAMPLE_FLOOR_AREA_SQM,
        garden: true,
        parking: true,
        garage: false,
      },
    }),
  })
}

function SampleReportSection({ index, daysOnMarket }: { index: number; daysOnMarket: number }) {
  const askingPricePerSqm = SAMPLE_ASKING_PRICE / SAMPLE_FLOOR_AREA_SQM
  if (index === 0) {
    const score = sampleHomeLens(daysOnMarket)
    const fill = (items: KeyPoints["know"]) => items.map((i) => ({ ...i, description: i.description.replace("{days}", String(daysOnMarket)) }))
    const keyPoints: KeyPoints = { know: fill(SAMPLE_KEY_POINTS.know), consider: fill(SAMPLE_KEY_POINTS.consider), ask: fill(SAMPLE_KEY_POINTS.ask) }
    return (
      <>
        <ReportHeader
          compact
          street="61 King Edward Crescent, Horsforth"
          town={null}
          postcode={SAMPLE_POSTCODE}
          rightmoveUrl={null}
          askingPrice={gbp.format(SAMPLE_ASKING_PRICE)}
          propertyType={SAMPLE_PROPERTY_TYPE}
          bedrooms={SAMPLE_BEDROOMS}
          bathrooms={SAMPLE_BATHROOMS}
          floorArea={`${SAMPLE_FLOOR_AREA_SQM} m²`}
          epcRating={SAMPLE_EPC_RATING}
          constructionAgeBand={SAMPLE_AGE_BAND}
          tenure={SAMPLE_TENURE}
        />
        <div className="grid grid-cols-1 gap-6 pt-6 sm:grid-cols-12" style={{ fontFamily: BODY_FONT, fontSize: 14 }}>
          <div className="sm:col-span-3">
            <HomeLensScore score={score.total ?? 0} maxScore={score.max} sections={scoreSectionRows(score)} />
          </div>
          <div className="min-w-0 sm:col-span-9">
            <KeyPointsTabs keyPoints={keyPoints} />
          </div>
        </div>
      </>
    )
  }
  if (index === 1) {
    const lastSale = SAMPLE_PAST_SALES[SAMPLE_PAST_SALES.length - 1]
    const salesWithAsking = [...SAMPLE_PAST_SALES, { price: SAMPLE_ASKING_PRICE, year: SAMPLE_ASKING_YEAR }]
    const growth = homeValueGrowth(salesWithAsking)
    const historyInsight = growth?.previous
      ? `Grew ${growth.previous.ratePercent.toFixed(1)}% a year to ${growth.previous.toYear}, then ${growth.latest.ratePercent.toFixed(1)}% a year to today’s asking price.`
      : growth
        ? `Grew ${growth.latest.ratePercent.toFixed(1)}% a year to today’s asking price.`
        : null
    return (
      <>
        <PriceFairness
          askingPrice={SAMPLE_ASKING_PRICE}
          districtAveragePrice={SAMPLE_AVERAGE_PRICE_BY_YEAR[String(SAMPLE_RANKING_YEAR)]}
          districtAverageYear={SAMPLE_RANKING_YEAR}
          propertyType={SAMPLE_PROPERTY_TYPE}
          outcode={SAMPLE_OUTCODE}
          pricePerSqm={askingPricePerSqm}
          districtPricePerSqm={SAMPLE_DISTRICT_PRICE_PER_SQM}
          daysOnMarket={daysOnMarket}
          recentSalesCount={SAMPLE_POSTCODE_SALES_12M}
          lastSalePrice={lastSale.price}
          lastSaleYear={lastSale.year}
          priceHistorySales={salesWithAsking}
          averagePriceByYear={SAMPLE_AVERAGE_PRICE_BY_YEAR}
          aiOffer={{ ...SAMPLE_AI_OFFER, reasons: SAMPLE_AI_OFFER.reasons.map((r) => r.replace("{days}", String(daysOnMarket))) }}
        />
        <div className="mt-10 border-t pt-4" style={{ borderColor: INK }}>
          <div className="font-semibold">Average sold price, semi-detached homes: {SAMPLE_OUTCODE} and its neighbours</div>
          <div className="mt-1" style={{ color: MUTED }}>{neighbourRankInsight()}</div>
          <div className="mt-4">
            <NeighbourChart districts={SAMPLE_NEIGHBOUR_DISTRICTS} subjectOutcode={SAMPLE_OUTCODE} />
          </div>
          <p className="mt-1.5 text-[12px]" style={{ color: MUTED }}>Average sold price, HM Land Registry.</p>
        </div>
        {/* With a seller's gain to show, the report moves the ranking down here beside the price history. */}
        <div className="mt-10 grid grid-cols-1 gap-10 border-t pt-4 sm:grid-cols-2" style={{ borderColor: INK }}>
          <div>
            <div className="font-semibold">This home’s price history</div>
            {historyInsight && <div className="mt-1" style={{ color: MUTED }}>{historyInsight}</div>}
            <div className="mt-4">
              <HomePriceHistoryChart sales={SAMPLE_PAST_SALES} askingPrice={SAMPLE_ASKING_PRICE} askingYear={SAMPLE_ASKING_YEAR} />
            </div>
            <div className="mt-1.5 flex gap-4 text-[12px]" style={{ color: MUTED }}>
              <span>● Sold</span>
              <span>○ Asking price (not a sale)</span>
            </div>
          </div>
          <SampleRanking />
        </div>
      </>
    )
  }
  if (index === 2) {
    return (
      <>
        <MarketSpeed
          daysOnMarket={daysOnMarket}
          salesTrend={SAMPLE_SALES_TREND}
          outcode={SAMPLE_OUTCODE}
          propertyType={SAMPLE_PROPERTY_TYPE}
          postcodeSalesCount={SAMPLE_POSTCODE_SALES_12M}
          postcode={SAMPLE_POSTCODE}
          nearestSales={SAMPLE_NEAREST_SALES}
          askingPrice={SAMPLE_ASKING_PRICE}
          askingPricePerSqm={askingPricePerSqm}
          extraContent={<SupplyDemand data={SAMPLE_SUPPLY_DEMAND} propertyType={SAMPLE_PROPERTY_TYPE} outcode={SAMPLE_OUTCODE} />}
        />
        <div className="mt-10 border-t pt-4" style={{ borderColor: INK }}>
          <NearestForSale listings={SAMPLE_NEAREST_FOR_SALE} propertyType={SAMPLE_PROPERTY_TYPE} linkToListings={false} />
        </div>
      </>
    )
  }
  if (index === 3) return <RisksRestrictionsSection data={SAMPLE_RISKS} loading={false} />
  if (index === 4) {
    return (
      <DailyLife
        schools={SAMPLE_NEARBY.schools}
        nurseries={SAMPLE_NEARBY.nurseries}
        dentists={SAMPLE_NEARBY.dentists}
        gpSurgeries={SAMPLE_NEARBY.gpSurgeries}
        hospitals={SAMPLE_NEARBY.hospitals}
        parks={SAMPLE_NEARBY.parks}
        stations={SAMPLE_NEARBY.stations}
        censusTenure={SAMPLE_CENSUS_TENURE}
        englandCensusTenure={SAMPLE_ENGLAND_TENURE}
      />
    )
  }
  return (
    <>
      <MustHavesGrid items={SAMPLE_MUST_HAVES} />
      <p className="mt-4 text-[12px]" style={{ color: MUTED }}>Checked against a sample buyer’s must-haves. Set yours once and every report is scored against them.</p>
    </>
  )
}

function SectionLabel({ title, text, size = 22 }: { title: string; text?: string; size?: number }) {
  return (
    <>
      <h2 className="mb-1.5" style={{ fontFamily: DISPLAY_FONT, fontWeight: 500, fontSize: size, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
        {title}
      </h2>
      {text && <p className="text-[13px]" style={{ color: MUTED }}>{text}</p>}
    </>
  )
}

const SECTION = "grid grid-cols-1 gap-6 py-14 md:grid-cols-12"
const RULE = { borderBottom: `1px solid ${INK}` }

export default function Home() {
  const [activeQuestion, setActiveQuestion] = useState(0)
  const daysOnMarket = daysSince(SAMPLE_FIRST_LISTED)
  const heroScore = sampleHomeLens(daysOnMarket)
  const heroPrice: PriceSampleData = {
    ...KING_EDWARD_PRICE,
    stats: KING_EDWARD_PRICE.stats.map((s) => (s.k === "On the market" ? { ...s, v: `${daysOnMarket} days` } : s)),
  }

  return (
    <div
      className={`min-h-screen bg-[#FBFAF7] ${interBody.variable} ${interTight.variable}`}
      style={{ color: INK }}
    >
      {/* Own wrapper so the sticky navbar scrolls away with the hero, as before. */}
      <div className="relative" style={{ zIndex: 50 }}>
        <Navbar />
      </div>

      <main className="mx-auto max-w-[1200px] px-5 pb-12 text-[14px] leading-normal md:px-12 md:pb-[72px]" style={{ fontFamily: BODY_FONT }}>
        {/* Hero */}
        <section className={`${SECTION} md:py-16`} style={RULE}>
          <div className="md:col-span-6 md:self-center">
            <h1
              className="whitespace-nowrap text-[36px] min-[360px]:text-[44px] md:text-[46px] lg:text-[60px] xl:text-[68px]"
              style={{ fontFamily: DISPLAY_FONT, fontWeight: 400, letterSpacing: "-0.04em", lineHeight: 1, margin: 0 }}
            >
              The history
              <br />
              check for houses.
            </h1>
            <p className="mt-6 max-w-[446px] text-[20px] md:text-[22px]" style={{ fontFamily: DISPLAY_FONT, fontWeight: 300, letterSpacing: "-0.02em", lineHeight: 1.3 }}>
              See how long it’s really been listed, whether the price stacks up, and the planning and flood risks — before you book a viewing.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <PrimaryButton location="hero">Get started</PrimaryButton>
              <GhostButton href="/sample" newTab>See sample report</GhostButton>
            </div>
            <div className="mt-7 max-w-[446px]">
              {["Full address and postcode", "Real first-listed date", "Price vs sold prices nearby", "Planning and flood risks"].map((item) => (
                <div key={item} className="flex items-baseline gap-2.5 py-2 text-[13px]" style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                  <span style={{ color: ACCENT }} aria-hidden>✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="min-w-0 md:col-span-6 md:col-start-7">
            <div
              className="overflow-hidden rounded-[20px] bg-white"
              style={{
                border: `1px solid ${CARD_BORDER}`,
                boxShadow: "0 1px 2px rgba(14,23,38,0.06), 0 24px 48px -16px rgba(14,23,38,0.18)",
              }}
            >
              <div className="flex items-start justify-between gap-4 p-5" style={{ borderBottom: `1px solid ${CARD_DIVIDER}` }}>
                <div className="min-w-0">
                  <p className="text-[20px] sm:text-[22px]" style={{ fontFamily: DISPLAY_FONT, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                    61 King Edward Crescent, Horsforth, Leeds, LS18 4BE
                  </p>
                  <p className="mt-1 text-[13px]" style={{ color: MUTED }}>4 bed semi-detached · 94 m² · Asking £349,000</p>
                </div>
                <ReportScore score={heroScore.total ?? 0} max={heroScore.max} />
              </div>
              <div className="p-5" style={{ borderBottom: `1px solid ${CARD_DIVIDER}` }}>
                <PriceSample data={heroPrice} aside={<SupplyDemandMini />} />
              </div>
              <div className="p-5">
                <RecentSalesTable />
              </div>
            </div>
          </div>
        </section>

        {/* Trust numbers */}
        <section className={SECTION} style={RULE}>
          <div className="md:col-span-3">
            <SectionLabel title="Built on official records" text="Records from government and public bodies, matched to the listing you choose." />
          </div>
          <div className="grid grid-cols-2 gap-6 md:col-span-9 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.value}>
                <Glyph kind={s.glyph} />
                <div className="text-[40px] md:text-[48px]" style={{ fontFamily: DISPLAY_FONT, fontWeight: 400, letterSpacing: "-0.045em", lineHeight: 1 }}>
                  {s.value}
                </div>
                <div className="mt-3.5 max-w-[190px] text-[14px] leading-[1.45]" style={{ color: MUTED }}>{s.text}</div>
              </div>
            ))}
          </div>
          <ul
            aria-label="Data sources"
            className="grid grid-cols-2 gap-x-6 gap-y-2 pt-4 text-[13px] sm:grid-cols-3 md:col-span-12 lg:flex lg:justify-between"
            style={{ borderTop: `1px solid ${HAIRLINE}` }}
          >
            {["HM Land Registry", "EPC Register", "Planning Data", "Environment Agency", "police.uk", "DEFRA", "Ofcom", "CQC", "Ofsted"].map((name) => (
              <li key={name} className="whitespace-nowrap">{name}</li>
            ))}
          </ul>
        </section>

        {/* How it works */}
        <section id="how" className={`${SECTION} scroll-mt-4`} style={RULE}>
          <div className="md:col-span-3">
            <SectionLabel title="How it works" text="Three steps, under a minute." />
          </div>
          <div className="grid grid-cols-1 gap-8 md:col-span-9 md:grid-cols-3 md:gap-6">
            {STEPS.map((step, i) => (
              <div key={step.title}>
                <Light size={44} color={ACCENT}>{i + 1}</Light>
                <h3 className="mb-1.5 mt-3.5 text-[18px]" style={{ fontFamily: DISPLAY_FONT, fontWeight: 500, letterSpacing: "-0.015em", lineHeight: 1.25 }}>
                  {step.title}
                </h3>
                <p style={{ color: MUTED }}>{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What's in a report */}
        <section id="sample" className={`${SECTION} scroll-mt-4 md:py-16`} style={RULE}>
          <div className="md:col-span-4">
            <SectionLabel title="What’s in a report" size={28} />
            <p className="mb-6 text-[14px]" style={{ color: MUTED }}>An overview, then five questions answered for every listing. Click through the sample.</p>
            <div role="tablist" aria-orientation="vertical" aria-label="Report sections">
              {QUESTIONS.map((q, i) => {
                const active = i === activeQuestion
                return (
                  <button
                    key={q.title}
                    type="button"
                    role="tab"
                    id={`question-tab-${i}`}
                    aria-selected={active}
                    aria-controls="question-panel"
                    onClick={() => setActiveQuestion(i)}
                    className="grid w-full grid-cols-[40px_1fr] py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A369D]/50"
                    style={{ color: active ? INK : MUTED, borderBottom: `1px solid ${active ? INK : HAIRLINE}` }}
                  >
                    <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 300, fontSize: 19, color: ACCENT }}>{String(i).padStart(2, "0")}</span>
                    <span style={{ fontFamily: DISPLAY_FONT, fontSize: 19, letterSpacing: "-0.015em" }}>{q.title}</span>
                    {active && (
                      <ul className="col-start-2 mt-2 list-disc space-y-1 pl-4 text-[12px] marker:text-[#6B6B70]">
                        {q.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
          <div id="question-panel" role="tabpanel" aria-labelledby={`question-tab-${activeQuestion}`} className="-mx-5 min-w-0 md:col-span-8 md:col-start-5 md:mx-0">
            <ReportFrame left={`${String(activeQuestion).padStart(2, "0")} · ${QUESTIONS[activeQuestion].title}`} right={<>Sample report<span className="hidden sm:inline"> · 61 King Edward Crescent</span></>}>
              {/* Fixed height on desktop so switching tabs doesn't make the page jump; the
                  bottom fade (plus matching padding) hints that longer sections scroll. */}
              <div
                key={activeQuestion}
                className="px-3 py-5 md:h-[600px] md:px-5 md:overflow-y-auto md:overscroll-contain md:pb-12 md:[mask-image:linear-gradient(to_bottom,black_calc(100%-48px),transparent)]"
              >
                <SampleReportSection index={activeQuestion} daysOnMarket={daysOnMarket} />
              </div>
            </ReportFrame>
          </div>
        </section>

        {/* FAQs */}
        <section id="faq" className={`${SECTION} scroll-mt-4`} style={RULE}>
          <div className="md:col-span-3">
            <SectionLabel title="Questions" />
          </div>
          <div className="md:col-span-9">
            {FAQS.map((f) => (
              <div key={f.q} className="grid grid-cols-1 gap-2 py-4 md:grid-cols-[1fr_1.4fr] md:gap-6" style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
                <div className="font-semibold">{f.q}</div>
                <div style={{ color: MUTED }}>{f.a}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className={SECTION}>
          <div className="md:col-span-3">
            <p className="text-[13px]" style={{ color: MUTED }}>Start now</p>
          </div>
          <div className="md:col-span-9">
            <h2 className="text-[44px] md:text-[64px]" style={{ fontFamily: DISPLAY_FONT, fontWeight: 400, letterSpacing: "-0.04em", lineHeight: 1, margin: 0 }}>
              Analyse your first property.
            </h2>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <PrimaryButton location="cta_section">Get started</PrimaryButton>
              <GhostButton href="/sample" newTab>See sample report</GhostButton>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
