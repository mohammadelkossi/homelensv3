// The whole report, assembled on the server, for the Claude/ChatGPT connector.
//
// On the website the browser fetches §02-§04's background data after the page
// renders and works out the score and offer there (see report-view.tsx). An AI
// assistant has no browser, so this does the same work in one place, from the same
// library functions, and returns it as data the assistant can read.

import OpenAI from "openai"
import type { PropertyReportCore } from "@/lib/property-report"
import { mapPropertyTypeToCode } from "@/lib/property-type"
import { getPricePaidDataEffectiveToday } from "@/lib/price-paid-data-clock"
import { getDistrictComparison, getDistrictSalesTrend, getNearestRecentSales } from "@/lib/district-comparison"
import { getSupplyDemandReport, type SupplyDemandReport } from "@/lib/supply-demand"
import { getAveragePricePerSqmForPropertyTypeAndOutcode } from "@/lib/price-per-sqm"
import { getAllNearbyPlaces, mergeNearbyPlaces, hasNearbyPlacesContent, type NearbyPlacesResult } from "@/lib/nearby-amenities"
import { fetchPlanningConstraints } from "@/lib/planning-constraints"
import { fetchCrimeSummary } from "@/lib/crime-data"
import { fetchBroadbandCoverage } from "@/lib/broadband-coverage"
import { fetchEnvironmentData } from "@/lib/environment-data"
import { ENGLAND_GEOGRAPHY_CODE, getCensusTenureForGeography, resolveLsoaForPostcode } from "@/lib/census-tenure"
import type { RisksRestrictionsData } from "@/lib/use-risks-restrictions"
import {
  homeLensScore,
  scoreDailyLife,
  scoreSectionRows,
  scoreMarket,
  scoreMustHaves,
  scorePrice,
  scoreRisks,
} from "@/lib/scoring/homelens-score"
import { districtValueGrowth, recommendedOfferRange, sellersGain, type PricePoint } from "@/lib/pricing/recommended-offer"
import { buildKeyPoints, type RuleContext } from "@/lib/rules-engine"
import {
  percentVs,
  summariseDailyLife,
  summariseListings,
  summariseRecentSales,
  summariseRisks,
  summariseScore,
  type ReportFindings,
} from "@/lib/key-points/findings"
import { generateOffer } from "@/lib/key-points/generate"

/** What the buyer is looking for. All optional: with none given, must-haves score a flat 100. */
export type ConnectorPreferences = {
  minBedrooms?: number
  minBathrooms?: number
  propertyType?: string
  minSizeSqm?: number
  wantsGarden?: boolean
  wantsParking?: boolean
  wantsGarage?: boolean
}

/** Each background lookup gets this long before the report goes out without it. */
const SECTION_TIMEOUT_MS = 25_000
/** The model-written offer gets this long before the rule-based offer is used instead. */
const AI_OFFER_TIMEOUT_MS = 20_000
/** Importance given to each preference the buyer stated (the website's sliders run 0-100). */
const STATED_PREFERENCE_IMPORTANCE = 100

/** `promise`, or `fallback` if it rejects or takes longer than `ms`. Records which sections fell back. */
async function settle<T>(label: string, promise: Promise<T>, fallback: T, ms: number, missing: string[]): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
      }),
    ])
  } catch (error) {
    console.warn(`[connector] ${label} unavailable:`, error instanceof Error ? error.message : error)
    missing.push(label)
    return fallback
  } finally {
    clearTimeout(timer)
  }
}

function parsePrice(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value !== "string" || value === "N/A") return null
  const n = parseFloat(value.replace(/£/g, "").replace(/,/g, "").trim())
  return Number.isNaN(n) ? null : n
}

function parseCount(value: string | null | undefined): number | null {
  if (!value || value === "N/A") return null
  const n = parseInt(value.replace("+", ""))
  return Number.isNaN(n) ? null : n
}

function parseCoordinate(value: string): number | null {
  const n = parseFloat(value)
  return Number.isFinite(n) ? n : null
}

const yesNo = (value: string): boolean | null => (value === "Yes" ? true : value === "No" ? false : null)

export async function buildFullReport(core: PropertyReportCore, preferences: ConnectorPreferences = {}) {
  const missing: string[] = []
  const now = new Date()

  const latitude = parseCoordinate(core.latitude)
  const longitude = parseCoordinate(core.longitude)
  const hasLocation = latitude !== null && longitude !== null
  const outcode = core.houseOutcode
  const postcode = core.houseFullPostcode
  const propertyType = core.propertyType !== "N/A" ? core.propertyType : null
  const propertyTypeCode = mapPropertyTypeToCode(propertyType)
  const effectiveToday = await getPricePaidDataEffectiveToday()

  // ── Background data: the lookups the website's browser makes after the page renders ──
  const emptySupply: SupplyDemandReport = { supplyDemand: null, nearestForSale: [] }
  const [risks, district, supply, nearbyLookup, pricePerSqmStats, census] = await Promise.all([
    hasLocation
      ? settle<RisksRestrictionsData | null>(
          "risks",
          Promise.all([
            fetchPlanningConstraints(latitude, longitude),
            fetchCrimeSummary(latitude, longitude),
            fetchBroadbandCoverage(postcode),
            fetchEnvironmentData(latitude, longitude),
          ]).then(([planningConstraints, crimeSummary, broadbandCoverage, environmentData]) => ({
            planningConstraints,
            crimeSummary,
            broadbandCoverage,
            environmentData,
          })),
          null,
          SECTION_TIMEOUT_MS,
          missing
        )
      : null,
    outcode && propertyTypeCode
      ? settle(
          "district comparison",
          Promise.all([
            getDistrictComparison(outcode, propertyTypeCode),
            getDistrictSalesTrend(outcode, propertyTypeCode, effectiveToday),
            hasLocation ? getNearestRecentSales(outcode, propertyTypeCode, latitude, longitude, effectiveToday) : Promise.resolve([]),
          ]).then(([districts, salesTrend, nearestSales]) => ({ districts, salesTrend, nearestSales })),
          null,
          SECTION_TIMEOUT_MS,
          missing
        )
      : null,
    outcode && propertyTypeCode
      ? settle(
          "supply and demand",
          getSupplyDemandReport({ outcode, propertyTypeCode, latitude, longitude, subjectRightmoveUrl: core.rightmoveUrl, effectiveToday }),
          emptySupply,
          SECTION_TIMEOUT_MS,
          missing
        )
      : emptySupply,
    hasLocation
      ? settle<NearbyPlacesResult | null>("nearby places", getAllNearbyPlaces(latitude, longitude), null, SECTION_TIMEOUT_MS, missing)
      : null,
    outcode && propertyTypeCode
      ? settle(
          "area price per square metre",
          getAveragePricePerSqmForPropertyTypeAndOutcode(outcode, propertyTypeCode, effectiveToday),
          null,
          SECTION_TIMEOUT_MS,
          missing
        )
      : null,
    postcode
      ? settle(
          "census tenure",
          (async () => {
            const lsoa = await resolveLsoaForPostcode(postcode)
            if (!lsoa) return null
            const [local, england] = await Promise.all([
              getCensusTenureForGeography(lsoa),
              getCensusTenureForGeography(ENGLAND_GEOGRAPHY_CODE),
            ])
            return { local, england }
          })(),
          null,
          SECTION_TIMEOUT_MS,
          missing
        )
      : null,
  ])

  // The listing's own schools and stations (already in the scrape) fill in for a failed lookup.
  const nearbyPlaces = nearbyLookup ? mergeNearbyPlaces(core.nearbyPlaces, nearbyLookup) : core.nearbyPlaces
  const dailyLifePlaces = hasNearbyPlacesContent(nearbyPlaces) ? nearbyPlaces : null

  // ── The same derived figures report-view.tsx works out in the browser ──
  const askingPrice = parsePrice(core.price)
  const areaSqm = (() => {
    const raw = core.area !== "N/A" ? core.area : core.epcFloorArea
    const n = raw === null || raw === undefined ? NaN : parseFloat(String(raw).replace(/m²|m\^2/g, ""))
    return Number.isFinite(n) && n > 0 ? n : null
  })()
  const pricePerSqm = askingPrice !== null && areaSqm !== null ? askingPrice / areaSqm : null
  const areaPricePerSqm = pricePerSqmStats?.weightedAverage ?? null

  const averagePriceByYear = core.averagePriceByYear as Record<string, number> | null
  const districtYears = averagePriceByYear ? Object.keys(averagePriceByYear).sort() : []
  const latestDistrictYear = districtYears.length > 0 ? districtYears[districtYears.length - 1] : null
  const districtAveragePrice = latestDistrictYear ? averagePriceByYear![latestDistrictYear] : null
  const areaGrowth = averagePriceByYear ? districtValueGrowth(averagePriceByYear)?.multiYearRatePercent ?? null : null

  const saleHistory: PricePoint[] = [...((core.priceHistory ?? []) as { price: string; year: string }[])]
    .sort((a, b) => a.year.localeCompare(b.year))
    .map((entry) => ({ price: parsePrice(entry.price), year: parseInt(entry.year) }))
    .filter((p): p is PricePoint => p.price !== null && Number.isFinite(p.year))
  const lastSale = saleHistory.length > 0 ? saleHistory[saleHistory.length - 1] : null

  // Reports saved before listedDateIso existed only have the formatted date.
  const listedDateSource = core.listedDateIso ?? (core.timeOnMarket && core.timeOnMarket !== "N/A" ? core.timeOnMarket : null)
  const listedDate = listedDateSource ? new Date(listedDateSource) : null
  const validListedDate = listedDate && !Number.isNaN(listedDate.getTime()) ? listedDate : null
  const daysOnMarket = validListedDate ? Math.floor((now.getTime() - validListedDate.getTime()) / 86_400_000) : null
  const listedDateLabel = validListedDate
    ? validListedDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null

  const noise = risks?.environmentData.noiseLevels
  const noiseValues = noise ? [noise.roadNoiseDb, noise.railNoiseDb, noise.airportNoiseDb].filter((v): v is number => v !== null) : []
  const salesCountPast12Months = typeof core.salesCountPast12Months === "number" ? core.salesCountPast12Months : null

  const ruleContext: RuleContext = {
    askingPrice,
    propertyType,
    outcode,
    districtAveragePrice,
    districtAverageYear: latestDistrictYear ? parseInt(latestDistrictYear) : null,
    daysOnMarket,
    listedDateLabel,
    salesCountPast12Months,
    lastSalePrice: lastSale?.price ?? null,
    lastSaleYear: lastSale?.year ?? null,
    epcRating: core.epcRating,
    constructionAgeBand: core.constructionAgeBand,
    hasConservationArea: (risks?.planningConstraints.conservationAreas.length ?? 0) > 0,
    hasArticle4: (risks?.planningConstraints.article4Directions.length ?? 0) > 0,
    hasFloodRisk: (risks?.planningConstraints.floodRiskZones.length ?? 0) > 0,
    maxNoiseDb: noiseValues.length > 0 ? Math.max(...noiseValues) : null,
    bedrooms: core.bedrooms !== "N/A" ? core.bedrooms : null,
    priceReduced: false,
  }

  const stated = <T,>(value: T | undefined) => (value === undefined ? null : STATED_PREFERENCE_IMPORTANCE)
  const home = {
    bedrooms: parseCount(core.bedrooms),
    bathrooms: parseCount(core.bathrooms),
    propertyType,
    areaSqm,
    garden: yesNo(core.garden),
    parking: yesNo(core.parking),
    garage: yesNo(core.garage),
  }
  const score = homeLensScore({
    price: scorePrice({
      askingPrice,
      districtAveragePrice,
      pricePerSqm,
      districtPricePerSqm: areaPricePerSqm,
      areaGrowthRatePercent: areaGrowth,
    }),
    market: scoreMarket({
      supplyDemandLabel: supply.supplyDemand?.label ?? null,
      daysOnMarket,
      salesTrendChangePercent: district?.salesTrend?.changePercent ?? null,
    }),
    risks: scoreRisks(risks),
    dailyLife: scoreDailyLife(dailyLifePlaces),
    mustHaves: scoreMustHaves({
      wanted: {
        bedrooms: preferences.minBedrooms?.toString() ?? null,
        bathrooms: preferences.minBathrooms?.toString() ?? null,
        propertyType: preferences.propertyType ?? null,
        size: preferences.minSizeSqm?.toString() ?? null,
      },
      importance: {
        bedrooms: stated(preferences.minBedrooms),
        bathrooms: stated(preferences.minBathrooms),
        propertyType: stated(preferences.propertyType),
        size: stated(preferences.minSizeSqm),
        // A buyer who says they don't need a garden shouldn't have it scored at all.
        garden: preferences.wantsGarden ? STATED_PREFERENCE_IMPORTANCE : null,
        parking: preferences.wantsParking ? STATED_PREFERENCE_IMPORTANCE : null,
        garage: preferences.wantsGarage ? STATED_PREFERENCE_IMPORTANCE : null,
      },
      home,
    }),
  })

  const gain = sellersGain(askingPrice, lastSale?.price ?? null)
  const nearestSales = district?.nearestSales ?? []
  const street = String(core.fullAddress || core.propertyAddress)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
  const addressWithoutPostcode = postcode ? street.filter((part) => !part.toUpperCase().includes(postcode.toUpperCase())) : street

  const findings: ReportFindings = {
    property: {
      address: [addressWithoutPostcode.slice(0, 2).join(", "), postcode].filter(Boolean).join(", ") || null,
      askingPrice,
      propertyType,
      bedrooms: home.bedrooms,
      bathrooms: home.bathrooms,
      floorAreaSqm: areaSqm,
      epcRating: core.epcRating ?? null,
      estimatedYearBuilt: core.constructionAgeBand ?? null,
      tenure: core.tenure ?? null,
    },
    price: {
      outcode,
      areaAveragePrice: districtAveragePrice === null ? null : Math.round(districtAveragePrice),
      areaAverageYear: ruleContext.districtAverageYear,
      askingVsAreaPercent: percentVs(askingPrice, districtAveragePrice),
      pricePerSqm: pricePerSqm === null ? null : Math.round(pricePerSqm),
      areaPricePerSqm: areaPricePerSqm === null ? null : Math.round(areaPricePerSqm),
      pricePerSqmVsAreaPercent: percentVs(pricePerSqm, areaPricePerSqm),
      areaGrowthPercentPerYear: areaGrowth === null ? null : Math.round(areaGrowth * 10) / 10,
      lastSale,
      sellersGainPercent: gain ? Math.round(gain.percent) : null,
      saleHistory,
      recentSalesNearby: summariseRecentSales(nearestSales),
    },
    market: {
      daysOnMarket,
      firstListed: listedDateLabel,
      supplyDemand: supply.supplyDemand
        ? {
            label: supply.supplyDemand.label,
            forSaleNow: supply.supplyDemand.forSaleCount,
            salesPerYear: supply.supplyDemand.salesPerYear,
            monthsOfSupply: Math.round(supply.supplyDemand.monthsOfSupply * 10) / 10,
          }
        : null,
      areaSalesLast12Months: district?.salesTrend?.currentCount ?? null,
      areaSalesPrevious12Months: district?.salesTrend?.previousCount ?? null,
      areaSalesChangePercent:
        district?.salesTrend?.changePercent === null || district?.salesTrend?.changePercent === undefined
          ? null
          : Math.round(district.salesTrend.changePercent),
      postcodeSalesLast12Months: salesCountPast12Months,
      listingsForSaleNearby: summariseListings(supply.nearestForSale),
    },
    risks: summariseRisks(risks),
    dailyLife: summariseDailyLife(dailyLifePlaces),
    score: summariseScore(score),
  }

  // ── Recommended offer: the model's, checked against the evidence; else the rule-based one ──
  const ruleOffer =
    askingPrice !== null
      ? recommendedOfferRange({
          askingPrice,
          daysOnMarket,
          premiumOverDistrictPercent: districtAveragePrice ? ((askingPrice - districtAveragePrice) / districtAveragePrice) * 100 : null,
          sellersGainPercent: gain?.percent ?? null,
          recentSalesCount: salesCountPast12Months,
        })
      : null
  const aiOffer =
    askingPrice !== null && process.env.OPENAI_API_KEY
      ? await settle(
          "AI-written offer",
          generateOffer(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), findings),
          null,
          AI_OFFER_TIMEOUT_MS,
          []
        )
      : null
  const recommendedOffer = aiOffer
    ? { low: aiOffer.low, high: aiOffer.high, openingOffer: aiOffer.opening, reasons: aiOffer.reasons, basis: "model, checked against local evidence" }
    : ruleOffer
      ? { low: ruleOffer.low, high: ruleOffer.high, openingOffer: ruleOffer.openingOffer, reasons: ruleOffer.reasons, basis: "rules" }
      : null

  return {
    generatedAt: now.toISOString(),
    rightmoveUrl: core.rightmoveUrl,
    property: {
      ...findings.property,
      listingAddress: core.propertyAddress,
      fullAddress: core.fullAddress,
      postcode,
      garden: home.garden,
      parking: home.parking,
      garage: home.garage,
    },
    // Unlike findings.score (written for the key-points model), this keeps the must-haves section.
    homeLensScore: {
      total: score.total,
      max: score.max,
      sections: Object.fromEntries(scoreSectionRows(score).map((row) => [row.label, { score: row.value, max: row.max }])),
    },
    recommendedOffer,
    price: {
      ...findings.price,
      sellersGainPounds: gain ? Math.round(gain.amount) : null,
      areaAveragePriceByYear: averagePriceByYear,
      neighbouringDistricts: district?.districts ?? [],
    },
    market: findings.market,
    risks: findings.risks,
    planningConstraints: risks?.planningConstraints ?? null,
    dailyLife: findings.dailyLife,
    nearbyPlaces: dailyLifePlaces,
    localTenure: census,
    keyPoints: buildKeyPoints(ruleContext),
    /** Sections that could not be loaded in time; the report is otherwise complete. */
    unavailableSections: missing,
    disclaimer:
      "HomeLens reports are guidance based on public data and the listing, not a valuation or professional advice. A survey and a solicitor's searches are still needed before buying.",
  }
}

export type FullReport = Awaited<ReturnType<typeof buildFullReport>>
