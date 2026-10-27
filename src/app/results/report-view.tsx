"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { RisksRestrictionsSection } from "@/components/risks-restrictions-section"
import { HomeLensScore } from "@/components/report/homelens-score"
import {
  homeLensScore,
  scoreDailyLife,
  scoreMarket,
  scoreMustHaves,
  scorePrice,
  scoreRisks,
  scoreSectionRows,
} from "@/lib/scoring/homelens-score"
import { ReportHeader } from "@/components/report/report-header"
import { ReportSection } from "@/components/report/report-section"
import { KeyPointsTabs } from "@/components/report/key-points-tabs"
import { MustHavesGrid, type MustHaveItem } from "@/components/report/must-haves-grid"
import { PriceFairness } from "@/components/report/price-fairness"
import { districtValueGrowth, homeValueGrowth, sellersGain, type PricePoint } from "@/lib/pricing/recommended-offer"
import {
  percentVs,
  summariseDailyLife,
  summariseListings,
  summariseRecentSales,
  summariseRisks,
  summariseScore,
  type ReportFindings,
} from "@/lib/key-points/findings"
import { useAiKeyPoints, type ReportInsightsPreset } from "@/lib/use-ai-key-points"
import type { RisksRestrictionsData } from "@/lib/use-risks-restrictions"
import type { NearbyPlacesResult } from "@/lib/nearby-amenities"
import type { DistrictSalesTrend, DistrictYearlyData, NearbySale } from "@/lib/district-comparison"
import type { NearestForSaleListing, SupplyDemand as SupplyDemandData } from "@/lib/use-supply-demand"
import type { PricePerSqmStats } from "@/lib/use-price-per-sqm"
import type { CensusTenureBreakdown } from "@/lib/census-tenure"
import { useRisksRestrictions } from "@/lib/use-risks-restrictions"
import { useDistrictComparison } from "@/lib/use-district-comparison"
import { useSupplyDemand } from "@/lib/use-supply-demand"
import { usePricePerSqm } from "@/lib/use-price-per-sqm"
import { SupplyDemand } from "@/components/report/supply-demand"
import { NearestForSale } from "@/components/report/nearest-for-sale"
import { NeighbourChart } from "@/components/report/neighbour-chart"
import { RankingBars, type RankingRow } from "@/components/report/ranking-bars"
import { HomePriceHistoryChart } from "@/components/report/home-price-history-chart"
import { MarketSpeed } from "@/components/report/market-speed"
import { DailyLife } from "@/components/report/daily-life"
import { ReportFeedback } from "@/components/report/report-feedback"
import { useCensusTenure } from "@/lib/use-census-tenure"
import { useNearbyPlaces } from "@/lib/use-nearby-places"
import { hasNearbyPlacesContent } from "@/lib/nearby-amenities"
import { buildKeyPoints, type RuleContext } from "@/lib/rules-engine"
import { interBody, interTight } from "./report-fonts"
import { useState, useEffect, useMemo } from "react"

const SHOW_HOMELENS_SCORE = process.env.NEXT_PUBLIC_SHOW_HOMELENS_SCORE === "true"

const ORDINAL_WORDS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"]
function ordinalWord(n: number): string {
  return ORDINAL_WORDS[n - 1] ?? `${n}th`
}

/** A frozen report: every background response, the AI insights, and the date it's "as of". */
export type ReportSnapshot = {
  asOf: string
  risks: RisksRestrictionsData
  nearbyPlaces: NearbyPlacesResult
  district: { districts: DistrictYearlyData[]; salesTrend: DistrictSalesTrend | null; nearestSales: NearbySale[] }
  supplyDemand: { supplyDemand: SupplyDemandData | null; nearestForSale: NearestForSaleListing[] }
  pricePerSqm: PricePerSqmStats
  census: { tenure: CensusTenureBreakdown | null; englandTenure: CensusTenureBreakdown | null }
  insights: ReportInsightsPreset
}

type ReportViewProps = {
  /** Render a fixed report (e.g. /sample) instead of reading the URL's query string. */
  query?: string
  /** Freeze the report: no live lookups or AI calls, and dates are as of snapshot.asOf. */
  snapshot?: ReportSnapshot
}

export function ReportView({ query, snapshot }: ReportViewProps) {
  const urlParams = useSearchParams()
  const searchParams = useMemo(() => (query !== undefined ? new URLSearchParams(query) : urlParams), [query, urlParams])
  // "Today" for days on market and the asking-price year: fixed for a snapshot so it never drifts.
  const asOf = useMemo(() => (snapshot ? new Date(snapshot.asOf) : new Date()), [snapshot])
  const [isScrolled, setIsScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [shareFeedback, setShareFeedback] = useState<"idle" | "copied">("idle")

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    const title = "HomeLens Property Analysis"

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          url,
          text: `Check out this HomeLens property analysis: ${displayAddress}`,
        })
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          await copyToClipboard(url)
        }
      }
    } else {
      await copyToClipboard(url)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setShareFeedback("copied")
      setTimeout(() => setShareFeedback("idle"), 2000)
    } catch {
      setShareFeedback("idle")
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])
  
  // Extract data from URL params
  const propertyData = {
    fullAddress: searchParams.get('fullAddress') || null,
    propertyAddress: searchParams.get('propertyAddress') || 'N/A',
    price: searchParams.get('price') || 'N/A',
    propertyType: searchParams.get('propertyType') || 'N/A',
    bathrooms: searchParams.get('bathrooms') || 'N/A',
    bedrooms: searchParams.get('bedrooms') || 'N/A',
    area: searchParams.get('area') || 'N/A',
    timeOnMarket: searchParams.get('timeOnMarket') || 'N/A',
    garden: searchParams.get('garden') || 'N/A',
    parking: searchParams.get('parking') || 'N/A',
    garage: searchParams.get('garage') || 'N/A',
    latitude: searchParams.get('latitude') || 'N/A',
    longitude: searchParams.get('longitude') || 'N/A',
    preferredLatitude: searchParams.get('preferredLatitude') === 'null' || !searchParams.get('preferredLatitude') ? null : searchParams.get('preferredLatitude'),
    preferredLongitude: searchParams.get('preferredLongitude') === 'null' || !searchParams.get('preferredLongitude') ? null : searchParams.get('preferredLongitude'),
    distance: searchParams.get('distance') === 'null' || !searchParams.get('distance') ? null : searchParams.get('distance'),
    houseFullPostcode: searchParams.get('houseFullPostcode') === 'null' || !searchParams.get('houseFullPostcode') ? null : searchParams.get('houseFullPostcode'),
    houseOutcode: searchParams.get('houseOutcode') === 'null' || !searchParams.get('houseOutcode') ? null : searchParams.get('houseOutcode'),
    salesCountPast12Months: searchParams.get('salesCountPast12Months') === 'null' || !searchParams.get('salesCountPast12Months') ? null : searchParams.get('salesCountPast12Months'),
    rightmoveUrl: searchParams.get('rightmoveUrl') === 'null' || !searchParams.get('rightmoveUrl') ? null : searchParams.get('rightmoveUrl'),
    epcRating: searchParams.get('epcRating') === 'null' || !searchParams.get('epcRating') ? null : searchParams.get('epcRating'),
    constructionAgeBand: searchParams.get('constructionAgeBand') === 'null' || !searchParams.get('constructionAgeBand') ? null : searchParams.get('constructionAgeBand'),
    epcFloorArea: searchParams.get('epcFloorArea') === 'null' || !searchParams.get('epcFloorArea') ? null : searchParams.get('epcFloorArea'),
    tenure: searchParams.get('tenure') === 'null' || !searchParams.get('tenure') ? null : searchParams.get('tenure'),
  }
  const displayAddress = propertyData.fullAddress || propertyData.propertyAddress

  // In snapshot mode (the public sample) every hook gets empty inputs, so none of them
  // fetches, and the report reads the saved responses instead.
  const live = !snapshot
  const lat = live ? propertyData.latitude : ""
  const lon = live ? propertyData.longitude : ""
  const outcode = live ? propertyData.houseOutcode : null
  const postcode = live ? propertyData.houseFullPostcode : null
  const liveRisks = useRisksRestrictions(lat, lon, postcode)
  const liveCensus = useCensusTenure(postcode)
  const liveDistrict = useDistrictComparison(outcode, propertyData.propertyType, lat, lon)
  const liveSupply = useSupplyDemand(outcode, propertyData.propertyType, lat, lon, live ? propertyData.rightmoveUrl : null)
  const liveNearby = useNearbyPlaces(live ? searchParams.get("nearbyPlaces") : null, lat, lon)
  const livePricePerSqm = usePricePerSqm(outcode, propertyData.propertyType)

  const { data: riskData, loading: riskDataLoading } = snapshot ? { data: snapshot.risks, loading: false } : liveRisks
  const { tenure: censusTenure, englandTenure: englandCensusTenure } = snapshot ? snapshot.census : liveCensus
  const { districts: neighbourDistricts, salesTrend: districtSalesTrend, nearestSales, loading: districtLoading } = snapshot
    ? { ...snapshot.district, loading: false }
    : liveDistrict
  const { supplyDemand, nearestForSale, loading: supplyDemandLoading } = snapshot ? { ...snapshot.supplyDemand, loading: false } : liveSupply
  const { places: dailyLifePlaces, fetching: nearbyLoading } = snapshot ? { places: snapshot.nearbyPlaces, fetching: false } : liveNearby
  const { stats: pricePerSqmStats, loading: pricePerSqmLoading } = snapshot ? { stats: snapshot.pricePerSqm, loading: false } : livePricePerSqm

  const averagePriceByYearParam = searchParams.get('averagePriceByYear')
  let averagePriceByYear: Record<string, number> | null = null
  if (averagePriceByYearParam && averagePriceByYearParam !== 'null') {
    try {
      averagePriceByYear = JSON.parse(averagePriceByYearParam)
    } catch (e) {
      averagePriceByYear = null
    }
  }

  const averagePriceFiveYearParam = searchParams.get('averagePriceFiveYear')
  const averagePriceFiveYear = averagePriceFiveYearParam && averagePriceFiveYearParam !== 'null'
    ? parseFloat(averagePriceFiveYearParam)
    : null

  // Fetched client-side after the report renders (see usePricePerSqm) — this used
  // to block report generation and was by far its slowest step.
  const averagePricePerSqm = pricePerSqmStats?.averagePricePerSqm ?? null

  // Parse price history from URL params
  let priceHistory: Array<{ price: string; year: string }> | null = null
  const priceHistoryParam = searchParams.get('priceHistory')
  if (priceHistoryParam && priceHistoryParam !== 'null') {
    try {
      priceHistory = JSON.parse(priceHistoryParam)
    } catch (e) {
      priceHistory = null
    }
  }

  // Same deferred-loading nearby places the §04 section above uses.
  const nearbyPlaces = hasNearbyPlacesContent(dailyLifePlaces) ? dailyLifePlaces : null

  // Format area to include unit if it's a number
  const formatArea = (area: string) => {
    if (area === 'N/A') return 'N/A'
    const num = parseFloat(area)
    if (!isNaN(num)) {
      return `${num} m²`
    }
    return area
  }

  // Parse price string to number (remove £ and commas)
  const parsePrice = (priceString: string): number | null => {
    if (!priceString || priceString === 'N/A') return null
    const cleaned = priceString.replace(/£/g, '').replace(/,/g, '').trim()
    const num = parseFloat(cleaned)
    return isNaN(num) ? null : num
  }

  const currencyFormatter = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 })

  const formatCurrency = (value: number | null): string => {
    if (value === null || Number.isNaN(value)) return 'N/A'
    return currencyFormatter.format(value)
  }

  const formatPricePerSqmValue = (value: number | null): string => {
    if (value === null || Number.isNaN(value)) return 'N/A'
    return `£${Math.round(value).toLocaleString()}/m²`
  }

  const getAveragePriceForYear = (year: number): string => {
    if (!averagePriceByYear) return 'N/A'
    const value = averagePriceByYear[String(year)]
    if (value === undefined || value === null || Number.isNaN(Number(value))) {
      return 'N/A'
    }
    return formatCurrency(Number(value))
  }

  const preferenceScores = {
    bedrooms: searchParams.get('preferredBedroomsScore'),
    bathrooms: searchParams.get('preferredBathroomsScore'),
    propertyType: searchParams.get('preferredPropertyTypeScore'),
    size: searchParams.get('preferredSizeScore'),
    garden: searchParams.get('preferredGardenScore'),
    parking: searchParams.get('preferredParkingScore'),
    location: searchParams.get('preferredLocationScore'),
    garage: searchParams.get('preferredGarageScore'),
  }

  const formatPreferenceScore = (value: string | null) => {
    if (value === null || value === 'null') return 'N/A'
    return `${value}/100`
  }

  // Get user selections
  const userSelections = {
    bedrooms: searchParams.get('userBedrooms'),
    bathrooms: searchParams.get('userBathrooms'),
    propertyType: searchParams.get('userPropertyType'),
    size: searchParams.get('userSize'),
  }

  // Helper function to parse bedroom/bathroom numbers
  const parseNumber = (value: string | null): number | null => {
    if (!value || value === 'null' || value === 'N/A') return null
    // Handle "6+" or "4+" format
    if (value.includes('+')) {
      return parseInt(value.replace('+', ''))
    }
    const num = parseInt(value)
    return isNaN(num) ? null : num
  }

  // Helper function to check if sizes match
  const checkSizeMatch = (userSize: string | null, propertyArea: string | null): boolean | null => {
    if (!userSize || !propertyArea || propertyArea === 'N/A') return null
    
    // Parse property area (assuming it's in sqm)
    const areaMatch = propertyArea.match(/(\d+)/)
    if (!areaMatch) return null
    const propertyAreaNum = parseInt(areaMatch[1])
    
    // Parse user size range (e.g., "50-70", "71-90", etc.)
    const sizeRangeMatch = userSize.match(/(\d+)-(\d+)/)
    if (sizeRangeMatch) {
      const min = parseInt(sizeRangeMatch[1])
      const max = parseInt(sizeRangeMatch[2])
      return propertyAreaNum >= min && propertyAreaNum <= max
    }
    
    // Handle "171+" case
    if (userSize.includes('+')) {
      const min = parseInt(userSize.replace('+', ''))
      return propertyAreaNum >= min
    }
    
    return null
  }

  // Helper function to normalize property type for comparison
  const normalizePropertyType = (type: string | null): string | null => {
    if (!type || type === 'N/A') return null
    const lower = type.toLowerCase()
    if (lower.includes('detached')) return 'detached'
    if (lower.includes('semi') || lower.includes('semi-detached')) return 'semi-detached'
    if (lower.includes('terraced')) return 'terraced'
    if (lower.includes('flat') || lower.includes('apartment')) return 'flat'
    if (lower.includes('bungalow')) return 'bungalow'
    return lower
  }

  // Categorize matches by comparing user selections with property data
  const categorizeMatches = () => {
    const strongMatches: Array<{ label: string; userValue: string; propertyValue: string }> = []
    const weakMatches: Array<{ label: string; userValue: string; propertyValue: string }> = []
    
    // Check bedrooms — objective: exact match is the only "Yes", anything else is "No".
    if (userSelections.bedrooms && propertyData.bedrooms !== 'N/A') {
      const userBedrooms = parseNumber(userSelections.bedrooms)
      const propertyBedrooms = parseNumber(propertyData.bedrooms)
      if (userBedrooms !== null && propertyBedrooms !== null) {
        if (userBedrooms === propertyBedrooms) {
          strongMatches.push({ label: 'Bedrooms', userValue: userSelections.bedrooms, propertyValue: propertyData.bedrooms })
        } else {
          weakMatches.push({ label: 'Bedrooms', userValue: userSelections.bedrooms, propertyValue: propertyData.bedrooms })
        }
      }
    }

    // Check bathrooms — objective: exact match is the only "Yes", anything else is "No".
    if (userSelections.bathrooms && propertyData.bathrooms !== 'N/A') {
      const userBathrooms = parseNumber(userSelections.bathrooms)
      const propertyBathrooms = parseNumber(propertyData.bathrooms)
      if (userBathrooms !== null && propertyBathrooms !== null) {
        if (userBathrooms === propertyBathrooms) {
          strongMatches.push({ label: 'Bathrooms', userValue: userSelections.bathrooms, propertyValue: propertyData.bathrooms })
        } else {
          weakMatches.push({ label: 'Bathrooms', userValue: userSelections.bathrooms, propertyValue: propertyData.bathrooms })
        }
      }
    }
    
    // Check property type
    if (userSelections.propertyType && propertyData.propertyType !== 'N/A') {
      const userType = normalizePropertyType(userSelections.propertyType)
      const propertyType = normalizePropertyType(propertyData.propertyType)
      if (userType && propertyType) {
        if (userType === propertyType) {
          strongMatches.push({ label: 'Property Type', userValue: userSelections.propertyType, propertyValue: propertyData.propertyType })
        } else {
          weakMatches.push({ label: 'Property Type', userValue: userSelections.propertyType, propertyValue: propertyData.propertyType })
        }
      }
    }
    
    // Check size
    if (userSelections.size && propertyData.area !== 'N/A') {
      const sizeMatch = checkSizeMatch(userSelections.size, propertyData.area)
      if (sizeMatch === true) {
        strongMatches.push({ label: 'Size', userValue: userSelections.size, propertyValue: propertyData.area })
      } else if (sizeMatch === false) {
        weakMatches.push({ label: 'Size', userValue: userSelections.size, propertyValue: propertyData.area })
      }
    }
    
    return { strongMatches, weakMatches }
  }

  const { strongMatches, weakMatches } = categorizeMatches()

  // Calculate match percentage for a category
  const calculateMatchPercentage = (category: { key: string; label: string; actual: string | null; preferred: string | null }): number => {
    if (!category.actual || category.actual === 'N/A') return 0
    
    // For categories with user preferences
    if (category.preferred) {
      if (category.key === 'bedrooms' || category.key === 'bathrooms') {
        const userNum = parseNumber(category.preferred)
        const propertyNum = parseNumber(category.actual)
        if (userNum !== null && propertyNum !== null) {
          if (userNum === propertyNum) return 100
          const diff = Math.abs(userNum - propertyNum)
          // Calculate percentage: 100% for exact match, decreasing by 25% per difference
          return Math.max(0, 100 - (diff * 25))
        }
      }
      
      if (category.key === 'propertyType') {
        const userType = normalizePropertyType(category.preferred)
        const propertyType = normalizePropertyType(category.actual)
        if (userType && propertyType && userType === propertyType) return 100
        return 0
      }
      
      if (category.key === 'size') {
        const sizeMatch = checkSizeMatch(category.preferred, category.actual)
        if (sizeMatch === true) return 100
        if (sizeMatch === false) {
          // Calculate approximate match based on how close the size is
          const areaMatch = category.actual.match(/(\d+)/)
          const sizeRangeMatch = category.preferred.match(/(\d+)-(\d+)/)
          if (areaMatch && sizeRangeMatch) {
            const propertyArea = parseInt(areaMatch[1])
            const min = parseInt(sizeRangeMatch[1])
            const max = parseInt(sizeRangeMatch[2])
            const mid = (min + max) / 2
            const diff = Math.abs(propertyArea - mid)
            const range = max - min
            // Calculate percentage based on how close to the range
            return Math.max(0, 100 - (diff / range) * 50)
          }
          return 0
        }
      }
    }
    
    // For Yes/No categories (Garden, Parking, Garage)
    // These are always 100% if they exist, 0% if not
    // We'll assume if the property has it, it's a match (since user preference isn't captured)
    if (category.key === 'garden' || category.key === 'parking' || category.key === 'garage') {
      return category.actual === 'Yes' || category.actual === 'yes' || category.actual === 'true' ? 100 : 0
    }
    
    // For location, if we have distance data, calculate based on distance
    if (category.key === 'location') {
      // If location matches or is close, return high percentage
      // For now, if we have the postcode, assume it's a match
      return category.actual && category.actual !== 'N/A' ? 100 : 0
    }
    
    return 0
  }

  // Generate preference cards data
  const getPreferenceCards = () => {
    const categories = [
      { key: 'garden', label: 'Garden', actual: propertyData.garden, preferred: null },
      { key: 'parking', label: 'Parking', actual: propertyData.parking, preferred: null },
      { key: 'location', label: 'Distance', actual: propertyData.distance && propertyData.distance !== 'null' && propertyData.distance !== 'N/A' ? `${parseFloat(propertyData.distance).toFixed(2)} km` : 'N/A', preferred: propertyData.houseFullPostcode || null },
      { key: 'garage', label: 'Garage', actual: propertyData.garage, preferred: null },
    ]

    return categories.map(category => {
      const matchPercentage = calculateMatchPercentage(category)
      const score = preferenceScores[category.key as keyof typeof preferenceScores]
      const importance = score && score !== 'null' ? parseInt(score) : 0
      
      // For garden, parking, and garage: determine color based on Yes/No
      const isYesNoCategory = category.key === 'garden' || category.key === 'parking' || category.key === 'garage'
      const isYes = isYesNoCategory && category.actual && (category.actual.toString().toLowerCase() === 'yes' || category.actual.toString().toLowerCase() === 'true')
      
      // For Distance: determine color based on distance value
      let backgroundColor = '#d1fae5' // Default green
      if (category.key === 'location') {
        const distanceStr = category.actual?.toString().replace(' km', '') || ''
        const distance = parseFloat(distanceStr)
        if (!isNaN(distance)) {
          if (distance < 10) {
            backgroundColor = '#d1fae5' // Green
          } else if (distance >= 10 && distance <= 50) {
            backgroundColor = '#fef3c7' // Yellow
          } else if (distance > 50) {
            backgroundColor = '#fee2e2' // Light red
          }
        }
      } else if (isYesNoCategory) {
        backgroundColor = isYes ? '#d1fae5' : '#fef3c7' // Green for Yes, yellow for No
      } else {
        // For other categories (not currently used)
        const isGoodMatch = matchPercentage >= 70
        const isWeakMatch = matchPercentage < 50
        backgroundColor = isGoodMatch ? '#d1fae5' : isWeakMatch ? '#fef3c7' : '#d1fae5'
      }
      
      // Determine card color based on match percentage (for progress colors)
      const isGoodMatch = matchPercentage >= 70
      const isWeakMatch = matchPercentage < 50
      
      return {
        ...category,
        matchPercentage,
        importance,
        backgroundColor,
        progressColor: isGoodMatch ? '#22c55e' : isWeakMatch ? '#f59e0b' : '#22c55e', // Green or orange
        matchBubbleColor: isGoodMatch ? '#22c55e' : isWeakMatch ? '#f59e0b' : '#22c55e',
        isYes: isYesNoCategory ? isYes : null,
      }
    })
  }

  const preferenceCards = getPreferenceCards()


  // Calculate price per square metre
  const calculatePricePerSqm = (): string => {
    const price = parsePrice(propertyData.price)
    if (!price) return 'N/A'
    
    // Parse area - remove "m²" if present and extract number
    const areaStr = propertyData.area
    if (!areaStr || areaStr === 'N/A') return 'N/A'
    
    const cleanedArea = areaStr.replace(/m²/g, '').replace(/m\^2/g, '').trim()
    const area = parseFloat(cleanedArea)
    
    if (!area || isNaN(area) || area <= 0) return 'N/A'
    
    const pricePerSqm = price / area
    return `£${Math.round(pricePerSqm).toLocaleString()}/m²`
  }

  // Calculate CAGR (Compound Annual Growth Rate)
  const calculateCAGR = (): string => {
    // If no price history, return N/A
    if (!priceHistory || priceHistory.length === 0) {
      return 'N/A'
    }

    const latestPrice = parsePrice(propertyData.price)
    const earliestPrice = parsePrice(priceHistory[0].price)
    const earliestYear = parseInt(priceHistory[0].year)

    // Check if we have valid prices and year
    if (!latestPrice || !earliestPrice || isNaN(earliestYear) || earliestPrice <= 0) {
      return 'N/A'
    }

    // Calculate n (number of years between earliest sale and 2025)
    const n = 2025 - earliestYear
    if (n <= 0) {
      return 'N/A'
    }

    // Calculate CAGR: (P_latest / P_earliest)^(1/n) - 1
    const ratio = latestPrice / earliestPrice
    const cagr = (Math.pow(ratio, 1 / n) - 1) * 100

    // Round to 1 decimal place
    return `${cagr.toFixed(1)}%`
  }

  // Calculate days on market
  // Get number of days on market as a number
  const getDaysOnMarketNumber = (): number | null => {
    if (!propertyData.timeOnMarket || propertyData.timeOnMarket === 'N/A') {
      return null
    }

    try {
      const marketDate = new Date(propertyData.timeOnMarket)
      const today = asOf
      
      if (isNaN(marketDate.getTime())) {
        return null
      }

      const diffTime = today.getTime() - marketDate.getTime()
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      
      return diffDays
    } catch (e) {
      return null
    }
  }

  // Calculate DOM score based on days on market
  const calculateDOMScore = (): number | null => {
    const days = getDaysOnMarketNumber()
    if (days === null) return null

    // Score mapping based on days
    if (days <= 30) return 100
    if (days >= 361) return 0

    // Map days to scores based on the provided ranges
    const ranges: Array<{ min: number; max: number; score: number }> = [
      { min: 31, max: 32, score: 99 },
      { min: 33, max: 34, score: 98 },
      { min: 35, max: 36, score: 98 },
      { min: 37, max: 38, score: 97 },
      { min: 39, max: 40, score: 97 },
      { min: 41, max: 42, score: 96 },
      { min: 43, max: 44, score: 95 },
      { min: 45, max: 46, score: 95 },
      { min: 47, max: 48, score: 94 },
      { min: 49, max: 50, score: 94 },
      { min: 51, max: 52, score: 93 },
      { min: 53, max: 54, score: 92 },
      { min: 55, max: 56, score: 92 },
      { min: 57, max: 58, score: 91 },
      { min: 59, max: 60, score: 91 },
      { min: 61, max: 62, score: 90 },
      { min: 63, max: 64, score: 89 },
      { min: 65, max: 66, score: 89 },
      { min: 67, max: 68, score: 88 },
      { min: 69, max: 70, score: 88 },
      { min: 71, max: 72, score: 87 },
      { min: 73, max: 74, score: 86 },
      { min: 75, max: 76, score: 86 },
      { min: 77, max: 78, score: 85 },
      { min: 79, max: 80, score: 85 },
      { min: 81, max: 82, score: 84 },
      { min: 83, max: 84, score: 83 },
      { min: 85, max: 86, score: 83 },
      { min: 87, max: 88, score: 82 },
      { min: 89, max: 90, score: 82 },
      { min: 91, max: 92, score: 81 },
      { min: 93, max: 94, score: 80 },
      { min: 95, max: 96, score: 80 },
      { min: 97, max: 98, score: 79 },
      { min: 99, max: 100, score: 79 },
      { min: 101, max: 102, score: 78 },
      { min: 103, max: 104, score: 77 },
      { min: 105, max: 106, score: 77 },
      { min: 107, max: 108, score: 76 },
      { min: 109, max: 110, score: 76 },
      { min: 111, max: 112, score: 75 },
      { min: 113, max: 114, score: 74 },
      { min: 115, max: 116, score: 74 },
      { min: 117, max: 118, score: 73 },
      { min: 119, max: 120, score: 73 },
      { min: 121, max: 122, score: 72 },
      { min: 123, max: 124, score: 71 },
      { min: 125, max: 126, score: 71 },
      { min: 127, max: 128, score: 70 },
      { min: 129, max: 130, score: 70 },
      { min: 131, max: 132, score: 69 },
      { min: 133, max: 134, score: 68 },
      { min: 135, max: 136, score: 68 },
      { min: 137, max: 138, score: 67 },
      { min: 139, max: 140, score: 67 },
      { min: 141, max: 142, score: 66 },
      { min: 143, max: 144, score: 65 },
      { min: 145, max: 146, score: 65 },
      { min: 147, max: 148, score: 64 },
      { min: 149, max: 150, score: 64 },
      { min: 151, max: 152, score: 63 },
      { min: 153, max: 154, score: 62 },
      { min: 155, max: 156, score: 62 },
      { min: 157, max: 158, score: 61 },
      { min: 159, max: 160, score: 61 },
      { min: 161, max: 162, score: 60 },
      { min: 163, max: 164, score: 59 },
      { min: 165, max: 166, score: 59 },
      { min: 167, max: 168, score: 58 },
      { min: 169, max: 170, score: 58 },
      { min: 171, max: 172, score: 57 },
      { min: 173, max: 174, score: 56 },
      { min: 175, max: 176, score: 56 },
      { min: 177, max: 178, score: 55 },
      { min: 179, max: 180, score: 55 },
      { min: 181, max: 182, score: 54 },
      { min: 183, max: 184, score: 53 },
      { min: 185, max: 186, score: 53 },
      { min: 187, max: 188, score: 52 },
      { min: 189, max: 190, score: 52 },
      { min: 191, max: 192, score: 51 },
      { min: 193, max: 194, score: 50 },
      { min: 195, max: 196, score: 50 },
      { min: 197, max: 198, score: 49 },
      { min: 199, max: 200, score: 49 },
      { min: 201, max: 202, score: 48 },
      { min: 203, max: 204, score: 47 },
      { min: 205, max: 206, score: 47 },
      { min: 207, max: 208, score: 46 },
      { min: 209, max: 210, score: 46 },
      { min: 211, max: 212, score: 45 },
      { min: 213, max: 214, score: 44 },
      { min: 215, max: 216, score: 44 },
      { min: 217, max: 218, score: 43 },
      { min: 219, max: 220, score: 43 },
      { min: 221, max: 222, score: 42 },
      { min: 223, max: 224, score: 41 },
      { min: 225, max: 226, score: 41 },
      { min: 227, max: 228, score: 40 },
      { min: 229, max: 230, score: 40 },
      { min: 231, max: 232, score: 39 },
      { min: 233, max: 234, score: 38 },
      { min: 235, max: 236, score: 38 },
      { min: 237, max: 238, score: 37 },
      { min: 239, max: 240, score: 37 },
      { min: 241, max: 242, score: 36 },
      { min: 243, max: 244, score: 35 },
      { min: 245, max: 246, score: 35 },
      { min: 247, max: 248, score: 34 },
      { min: 249, max: 250, score: 34 },
      { min: 251, max: 252, score: 33 },
      { min: 253, max: 254, score: 32 },
      { min: 255, max: 256, score: 32 },
      { min: 257, max: 258, score: 31 },
      { min: 259, max: 260, score: 31 },
      { min: 261, max: 262, score: 30 },
      { min: 263, max: 264, score: 29 },
      { min: 265, max: 266, score: 29 },
      { min: 267, max: 268, score: 28 },
      { min: 269, max: 270, score: 28 },
      { min: 271, max: 272, score: 27 },
      { min: 273, max: 274, score: 26 },
      { min: 275, max: 276, score: 26 },
      { min: 277, max: 278, score: 25 },
      { min: 279, max: 280, score: 25 },
      { min: 281, max: 282, score: 24 },
      { min: 283, max: 284, score: 23 },
      { min: 285, max: 286, score: 23 },
      { min: 287, max: 288, score: 22 },
      { min: 289, max: 290, score: 22 },
      { min: 291, max: 292, score: 21 },
      { min: 293, max: 294, score: 20 },
      { min: 295, max: 296, score: 20 },
      { min: 297, max: 298, score: 19 },
      { min: 299, max: 300, score: 19 },
      { min: 301, max: 302, score: 18 },
      { min: 303, max: 304, score: 17 },
      { min: 305, max: 306, score: 17 },
      { min: 307, max: 308, score: 16 },
      { min: 309, max: 310, score: 16 },
      { min: 311, max: 312, score: 15 },
      { min: 313, max: 314, score: 14 },
      { min: 315, max: 316, score: 14 },
      { min: 317, max: 318, score: 13 },
      { min: 319, max: 320, score: 13 },
      { min: 321, max: 322, score: 12 },
      { min: 323, max: 324, score: 11 },
      { min: 325, max: 326, score: 11 },
      { min: 327, max: 328, score: 10 },
      { min: 329, max: 330, score: 10 },
      { min: 331, max: 332, score: 9 },
      { min: 333, max: 334, score: 8 },
      { min: 335, max: 336, score: 8 },
      { min: 337, max: 338, score: 7 },
      { min: 339, max: 340, score: 7 },
      { min: 341, max: 342, score: 6 },
      { min: 343, max: 344, score: 5 },
      { min: 345, max: 346, score: 5 },
      { min: 347, max: 348, score: 4 },
      { min: 349, max: 350, score: 4 },
      { min: 351, max: 352, score: 3 },
      { min: 353, max: 354, score: 2 },
      { min: 355, max: 356, score: 2 },
      { min: 357, max: 360, score: 1 },
    ]

    for (const range of ranges) {
      if (days >= range.min && days <= range.max) {
        return range.score
      }
    }

    return 0
  }

  // Calculate NOS score based on number of sales in postcode over past year
  const calculateNOSScore = (): number | null => {
    if (propertyData.salesCountPast12Months === null || propertyData.salesCountPast12Months === 'N/A') {
      return null
    }

    const salesCount = parseInt(propertyData.salesCountPast12Months)
    if (isNaN(salesCount)) {
      return null
    }

    // Score mapping based on number of sales
    if (salesCount === 0) return 100
    if (salesCount === 1) return 85
    if (salesCount === 2) return 70
    if (salesCount === 3) return 55
    if (salesCount === 4) return 40
    if (salesCount === 5) return 25
    if (salesCount === 6) return 10
    if (salesCount >= 7) return 0

    return null
  }

  // Get CAGR as a number
  const getCAGRNumber = (): number | null => {
    const cagrString = calculateCAGR()
    if (cagrString === 'N/A') return null
    
    // Extract number from string like "5.2%"
    const match = cagrString.match(/(-?\d+\.?\d*)/)
    if (!match) return null
    
    const value = parseFloat(match[1])
    return isNaN(value) ? null : value
  }

  // Determine color for Average % growth/year based on growth percentage
  // Calculate PGPY score based on Average % growth/year
  const calculatePGPYScore = (): number | null => {
    const growthPercent = getCAGRNumber()
    if (growthPercent === null) return null

    // Score mapping based on percentage change
    // The mapping goes from -3.00% (score 0) to 10.0% (score 100)
    // Score 50 corresponds to 0.000%
    
    // Handle exact matches and ranges
    if (growthPercent < -3.00) return 0
    if (growthPercent >= 10.0) return 100

    // Create mapping array for percentage to score
    const percentageToScore: Array<{ percent: number; score: number }> = [
      { percent: -3.00, score: 0 },
      { percent: -2.94, score: 1 },
      { percent: -2.88, score: 2 },
      { percent: -2.82, score: 3 },
      { percent: -2.76, score: 4 },
      { percent: -2.70, score: 5 },
      { percent: -2.64, score: 6 },
      { percent: -2.58, score: 7 },
      { percent: -2.52, score: 8 },
      { percent: -2.46, score: 9 },
      { percent: -2.40, score: 10 },
      { percent: -2.34, score: 11 },
      { percent: -2.28, score: 12 },
      { percent: -2.22, score: 13 },
      { percent: -2.16, score: 14 },
      { percent: -2.10, score: 15 },
      { percent: -2.04, score: 16 },
      { percent: -1.98, score: 17 },
      { percent: -1.92, score: 18 },
      { percent: -1.86, score: 19 },
      { percent: -1.80, score: 20 },
      { percent: -1.74, score: 21 },
      { percent: -1.68, score: 22 },
      { percent: -1.62, score: 23 },
      { percent: -1.56, score: 24 },
      { percent: -1.50, score: 25 },
      { percent: -1.44, score: 26 },
      { percent: -1.38, score: 27 },
      { percent: -1.32, score: 28 },
      { percent: -1.26, score: 29 },
      { percent: -1.20, score: 30 },
      { percent: -1.14, score: 31 },
      { percent: -1.08, score: 32 },
      { percent: -1.02, score: 33 },
      { percent: -0.960, score: 34 },
      { percent: -0.900, score: 35 },
      { percent: -0.840, score: 36 },
      { percent: -0.780, score: 37 },
      { percent: -0.720, score: 38 },
      { percent: -0.660, score: 39 },
      { percent: -0.600, score: 40 },
      { percent: -0.540, score: 41 },
      { percent: -0.480, score: 42 },
      { percent: -0.420, score: 43 },
      { percent: -0.360, score: 44 },
      { percent: -0.300, score: 45 },
      { percent: -0.240, score: 46 },
      { percent: -0.180, score: 47 },
      { percent: -0.120, score: 48 },
      { percent: -0.0600, score: 49 },
      { percent: 0.000, score: 50 },
      { percent: 0.200, score: 51 },
      { percent: 0.400, score: 52 },
      { percent: 0.600, score: 53 },
      { percent: 0.800, score: 54 },
      { percent: 1.00, score: 55 },
      { percent: 1.20, score: 56 },
      { percent: 1.40, score: 57 },
      { percent: 1.60, score: 58 },
      { percent: 1.80, score: 59 },
      { percent: 2.00, score: 60 },
      { percent: 2.20, score: 61 },
      { percent: 2.40, score: 62 },
      { percent: 2.60, score: 63 },
      { percent: 2.80, score: 64 },
      { percent: 3.00, score: 65 },
      { percent: 3.20, score: 66 },
      { percent: 3.40, score: 67 },
      { percent: 3.60, score: 68 },
      { percent: 3.80, score: 69 },
      { percent: 4.00, score: 70 },
      { percent: 4.20, score: 71 },
      { percent: 4.40, score: 72 },
      { percent: 4.60, score: 73 },
      { percent: 4.80, score: 74 },
      { percent: 5.00, score: 75 },
      { percent: 5.20, score: 76 },
      { percent: 5.40, score: 77 },
      { percent: 5.60, score: 78 },
      { percent: 5.80, score: 79 },
      { percent: 6.00, score: 80 },
      { percent: 6.20, score: 81 },
      { percent: 6.40, score: 82 },
      { percent: 6.60, score: 83 },
      { percent: 6.80, score: 84 },
      { percent: 7.00, score: 85 },
      { percent: 7.20, score: 86 },
      { percent: 7.40, score: 87 },
      { percent: 7.60, score: 88 },
      { percent: 7.80, score: 89 },
      { percent: 8.00, score: 90 },
      { percent: 8.20, score: 91 },
      { percent: 8.40, score: 92 },
      { percent: 8.60, score: 93 },
      { percent: 8.80, score: 94 },
      { percent: 9.00, score: 95 },
      { percent: 9.20, score: 96 },
      { percent: 9.40, score: 97 },
      { percent: 9.60, score: 98 },
      { percent: 9.80, score: 99 },
      { percent: 10.0, score: 100 },
    ]

    // Find the closest match
    let closestScore = 0
    let minDiff = Infinity

    for (const mapping of percentageToScore) {
      const diff = Math.abs(growthPercent - mapping.percent)
      if (diff < minDiff) {
        minDiff = diff
        closestScore = mapping.score
      }
    }

    // For values between points, interpolate
    for (let i = 0; i < percentageToScore.length - 1; i++) {
      const current = percentageToScore[i]
      const next = percentageToScore[i + 1]
      
      if (growthPercent >= current.percent && growthPercent <= next.percent) {
        // Linear interpolation
        const range = next.percent - current.percent
        const position = (growthPercent - current.percent) / range
        const scoreRange = next.score - current.score
        return Math.round(current.score + (position * scoreRange))
      }
    }

    return closestScore
  }

  // Get property price per square metre as a number
  const getPropertyPricePerSqm = (): number | null => {
    const price = parsePrice(propertyData.price)
    if (!price) return null
    
    const areaStr = propertyData.area
    if (!areaStr || areaStr === 'N/A') return null
    
    const cleanedArea = areaStr.replace(/m²/g, '').replace(/m\^2/g, '').trim()
    const area = parseFloat(cleanedArea)
    
    if (!area || isNaN(area) || area <= 0) return null
    
    return price / area
  }

  // Calculate PPQM score based on difference: Average Price/sq m - Property Price/sq m
  const calculatePPQMScore = (): number | null => {
    const propertyPricePerSqm = getPropertyPricePerSqm()
    if (propertyPricePerSqm === null || averagePricePerSqm === null) {
      return null
    }

    // Calculate the difference: Average - Property
    const difference = averagePricePerSqm - propertyPricePerSqm

    // Map difference to score using reverse formula
    // If value ≤ 0: score = (value + 1000) / 20
    // If value > 0: score = 50 + (value / 20)
    
    let score: number
    if (difference <= 0) {
      score = (difference + 1000) / 20
    } else {
      score = 50 + (difference / 20)
    }

    // Clamp score between 0 and 100
    score = Math.max(0, Math.min(100, Math.round(score)))

    return score
  }

  // Get CAGR percentage for average price by year (for PCT calculation)
  const getAveragePriceCAGR = (): number | null => {
    if (!averagePriceByYear) return null

    const chartData = Object.entries(averagePriceByYear)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, price]) => ({
        year: year,
        price: Math.round(price),
      }))

    const firstPrice = chartData[0]?.price || 0
    const lastPrice = chartData[chartData.length - 1]?.price || 0
    const firstYear = parseInt(chartData[0]?.year || '0')
    const lastYear = parseInt(chartData[chartData.length - 1]?.year || '0')
    const yearsSpan = lastYear - firstYear

    if (firstPrice <= 0 || yearsSpan <= 0) return null

    // Calculate CAGR (per year growth rate)
    const ratio = lastPrice / firstPrice
    const cagr = (Math.pow(ratio, 1 / yearsSpan) - 1) * 100

    return cagr
  }

  // Calculate PCT score based on CAGR percentage from average price by year
  const calculatePCTScore = (): number | null => {
    const cagrPercent = getAveragePriceCAGR()
    if (cagrPercent === null) return null

    // Score mapping based on percentage
    // The mapping goes from -6.00% (score 0) to 6.00% (score 100), with 0.00% being score 50
    
    if (cagrPercent < -6.00) return 0
    if (cagrPercent >= 6.00) return 100

    // Create mapping array for percentage to score
    const percentageToScore: Array<{ percent: number; score: number }> = [
      { percent: -6.00, score: 0 },
      { percent: -5.88, score: 1 },
      { percent: -5.76, score: 2 },
      { percent: -5.64, score: 3 },
      { percent: -5.52, score: 4 },
      { percent: -5.40, score: 5 },
      { percent: -5.28, score: 6 },
      { percent: -5.16, score: 7 },
      { percent: -5.04, score: 8 },
      { percent: -4.92, score: 9 },
      { percent: -4.80, score: 10 },
      { percent: -4.68, score: 11 },
      { percent: -4.56, score: 12 },
      { percent: -4.44, score: 13 },
      { percent: -4.32, score: 14 },
      { percent: -4.20, score: 15 },
      { percent: -4.08, score: 16 },
      { percent: -3.96, score: 17 },
      { percent: -3.84, score: 18 },
      { percent: -3.72, score: 19 },
      { percent: -3.60, score: 20 },
      { percent: -3.48, score: 21 },
      { percent: -3.36, score: 22 },
      { percent: -3.24, score: 23 },
      { percent: -3.12, score: 24 },
      { percent: -3.00, score: 25 },
      { percent: -2.88, score: 26 },
      { percent: -2.76, score: 27 },
      { percent: -2.64, score: 28 },
      { percent: -2.52, score: 29 },
      { percent: -2.40, score: 30 },
      { percent: -2.28, score: 31 },
      { percent: -2.16, score: 32 },
      { percent: -2.04, score: 33 },
      { percent: -1.92, score: 34 },
      { percent: -1.80, score: 35 },
      { percent: -1.68, score: 36 },
      { percent: -1.56, score: 37 },
      { percent: -1.44, score: 38 },
      { percent: -1.32, score: 39 },
      { percent: -1.20, score: 40 },
      { percent: -1.08, score: 41 },
      { percent: -0.96, score: 42 },
      { percent: -0.84, score: 43 },
      { percent: -0.72, score: 44 },
      { percent: -0.60, score: 45 },
      { percent: -0.48, score: 46 },
      { percent: -0.36, score: 47 },
      { percent: -0.24, score: 48 },
      { percent: -0.12, score: 49 },
      { percent: 0.00, score: 50 },
      { percent: 0.12, score: 51 },
      { percent: 0.24, score: 52 },
      { percent: 0.36, score: 53 },
      { percent: 0.48, score: 54 },
      { percent: 0.60, score: 55 },
      { percent: 0.72, score: 56 },
      { percent: 0.84, score: 57 },
      { percent: 0.96, score: 58 },
      { percent: 1.08, score: 59 },
      { percent: 1.20, score: 60 },
      { percent: 1.32, score: 61 },
      { percent: 1.44, score: 62 },
      { percent: 1.56, score: 63 },
      { percent: 1.68, score: 64 },
      { percent: 1.80, score: 65 },
      { percent: 1.92, score: 66 },
      { percent: 2.04, score: 67 },
      { percent: 2.16, score: 68 },
      { percent: 2.28, score: 69 },
      { percent: 2.40, score: 70 },
      { percent: 2.52, score: 71 },
      { percent: 2.64, score: 72 },
      { percent: 2.76, score: 73 },
      { percent: 2.88, score: 74 },
      { percent: 3.00, score: 75 },
      { percent: 3.12, score: 76 },
      { percent: 3.24, score: 77 },
      { percent: 3.36, score: 78 },
      { percent: 3.48, score: 79 },
      { percent: 3.60, score: 80 },
      { percent: 3.72, score: 81 },
      { percent: 3.84, score: 82 },
      { percent: 3.96, score: 83 },
      { percent: 4.08, score: 84 },
      { percent: 4.20, score: 85 },
      { percent: 4.32, score: 86 },
      { percent: 4.44, score: 87 },
      { percent: 4.56, score: 88 },
      { percent: 4.68, score: 89 },
      { percent: 4.80, score: 90 },
      { percent: 4.92, score: 91 },
      { percent: 5.04, score: 92 },
      { percent: 5.16, score: 93 },
      { percent: 5.28, score: 94 },
      { percent: 5.40, score: 95 },
      { percent: 5.52, score: 96 },
      { percent: 5.64, score: 97 },
      { percent: 5.76, score: 98 },
      { percent: 5.88, score: 99 },
      { percent: 6.00, score: 100 },
    ]

    // Find the closest match using interpolation
    for (let i = 0; i < percentageToScore.length - 1; i++) {
      const current = percentageToScore[i]
      const next = percentageToScore[i + 1]
      
      if (cagrPercent >= current.percent && cagrPercent <= next.percent) {
        // Linear interpolation
        const range = next.percent - current.percent
        const position = (cagrPercent - current.percent) / range
        const scoreRange = next.score - current.score
        return Math.round(current.score + (position * scoreRange))
      }
    }

    // Fallback to closest match
    let closestScore = 50
    let minDiff = Infinity
    for (const mapping of percentageToScore) {
      const diff = Math.abs(cagrPercent - mapping.percent)
      if (diff < minDiff) {
        minDiff = diff
        closestScore = mapping.score
      }
    }

    return closestScore
  }

  // Calculate Total Score (Market Metrics) as sum of PPQM, DOM, PGPY, PCT, and NOS
  // If a value is missing, scale remaining scores from 100 to 125 (multiply by 1.25)
  const calculateTotalMarketMetricsScore = (): number | null => {
    const ppqmScore = calculatePPQMScore()
    const domScore = calculateDOMScore()
    const pgpyScore = calculatePGPYScore()
    const pctScore = calculatePCTScore()
    const nosScore = calculateNOSScore()

    const scores = [ppqmScore, domScore, pgpyScore, pctScore, nosScore]
    const availableScores = scores.filter(score => score !== null) as number[]
    const missingCount = scores.length - availableScores.length

    if (availableScores.length === 0) {
      return null
    }

    // If any value is missing, scale remaining scores from 100 to 125 (multiply by 1.25)
    const scaleFactor = missingCount > 0 ? 1.25 : 1.0
    const scaledSum = availableScores.reduce((sum, score) => sum + (score * scaleFactor), 0)

    return Math.round(scaledSum)
  }

  // Calculate weights total as sum of all available preference scores
  // Exclude missing preferences from the calculation
  const calculateWeightsTotal = (): number | null => {
    const scores = [
      preferenceScores.bedrooms,
      preferenceScores.bathrooms,
      preferenceScores.propertyType,
      preferenceScores.size,
      preferenceScores.garden,
      preferenceScores.parking,
      preferenceScores.location,
      preferenceScores.garage,
    ]

    let total = 0
    let hasValidScore = false

    for (const score of scores) {
      if (score && score !== 'null') {
        const numScore = parseInt(score)
        if (!isNaN(numScore)) {
          total += numScore
          hasValidScore = true
        }
      }
    }

    return hasValidScore ? total : null
  }

  // Calculate weighted preference (preference score / weights total)
  const calculateWeightedPreference = (preferenceScore: string | null): number | null => {
    const weightsTotal = calculateWeightsTotal()
    if (!weightsTotal || weightsTotal === 0) {
      return null
    }

    if (!preferenceScore || preferenceScore === 'null') {
      return null
    }

    const score = parseInt(preferenceScore)
    if (isNaN(score)) {
      return null
    }

    // Calculate the weighted value (score / weights total)
    const weighted = score / weightsTotal
    return weighted
  }

  // Calculate BDR (MS) = Preferred Number of bedrooms (W) * BDR (M)
  const calculateBDRMS = (): number | null => {
    const weightedBedrooms = calculateWeightedPreference(preferenceScores.bedrooms)
    const bdrScore = calculateBDRScore()

    if (weightedBedrooms === null || bdrScore === null) {
      return null
    }

    return weightedBedrooms * bdrScore
  }

  // Calculate BTR (MS) = BTR (M) * Preferred number of bathrooms (W)
  const calculateBTRMS = (): number | null => {
    const weightedBathrooms = calculateWeightedPreference(preferenceScores.bathrooms)
    const btrScore = calculateBTRScore()

    if (weightedBathrooms === null || btrScore === null) {
      return null
    }

    return weightedBathrooms * btrScore
  }

  // Calculate PT (MS) = PT (M) * Preferred property type (W)
  const calculatePTMS = (): number | null => {
    const weightedPropertyType = calculateWeightedPreference(preferenceScores.propertyType)
    const ptScore = calculatePTScore()

    if (weightedPropertyType === null || ptScore === null) {
      return null
    }

    return weightedPropertyType * ptScore
  }

  // Calculate A (MS) = A (M) * Preferred size (W)
  const calculateAMS = (): number | null => {
    const weightedSize = calculateWeightedPreference(preferenceScores.size)
    const aScore = calculateAScore()

    if (weightedSize === null || aScore === null) {
      return null
    }

    return weightedSize * aScore
  }

  // Calculate GG (MS) = GG (M) * Preferred garage (W)
  const calculateGGMS = (): number | null => {
    const weightedGarage = calculateWeightedPreference(preferenceScores.garage)
    const ggScore = calculateGGScore()

    if (weightedGarage === null || ggScore === null) {
      return null
    }

    return weightedGarage * ggScore
  }

  // Calculate GD (MS) = GD (M) * Preferred garden (W)
  const calculateGDMS = (): number | null => {
    const weightedGarden = calculateWeightedPreference(preferenceScores.garden)
    const gdScore = calculateGDScore()

    if (weightedGarden === null || gdScore === null) {
      return null
    }

    return weightedGarden * gdScore
  }

  // Calculate PK (MS) = PK (M) * Preferred parking (W)
  const calculatePKMS = (): number | null => {
    const weightedParking = calculateWeightedPreference(preferenceScores.parking)
    const pkScore = calculatePKScore()

    if (weightedParking === null || pkScore === null) {
      return null
    }

    return weightedParking * pkScore
  }

  // Calculate L (MS) = L (M) * Preferred location score (W)
  const calculateLMS = (): number | null => {
    const weightedLocation = calculateWeightedPreference(preferenceScores.location)
    const lScore = calculateLScore()

    if (weightedLocation === null || lScore === null) {
      return null
    }

    return weightedLocation * lScore
  }

  // Calculate MS Totals = sum of all available MS values
  // Exclude missing preferences from the calculation (don't include null values)
  const calculateMSTotals = (): number | null => {
    const bdrMS = calculateBDRMS()
    const btrMS = calculateBTRMS()
    const ptMS = calculatePTMS()
    const aMS = calculateAMS()
    const ggMS = calculateGGMS()
    const gdMS = calculateGDMS()
    const pkMS = calculatePKMS()
    const lMS = calculateLMS()

    // Only include non-null values in the sum
    const msValues = [bdrMS, btrMS, ptMS, aMS, ggMS, gdMS, pkMS, lMS]
    const availableValues = msValues.filter(val => val !== null) as number[]

    if (availableValues.length === 0) {
      return null
    }

    return availableValues.reduce((sum, val) => sum + val, 0)
  }

  // Calculate GG score based on garage value
  const calculateGGScore = (): number | null => {
    if (!propertyData.garage || propertyData.garage === 'N/A') {
      return null
    }

    // Check if garage is "Yes" (case insensitive)
    if (propertyData.garage.toLowerCase() === 'yes' || propertyData.garage === 'true') {
      return 100
    }

    return 0
  }

  // Calculate GD score based on garden value
  const calculateGDScore = (): number | null => {
    if (!propertyData.garden || propertyData.garden === 'N/A') {
      return null
    }

    // Check if garden is "Yes" (case insensitive)
    if (propertyData.garden.toLowerCase() === 'yes' || propertyData.garden === 'true') {
      return 100
    }

    return 0
  }

  // Calculate PK score based on parking value
  const calculatePKScore = (): number | null => {
    if (!propertyData.parking || propertyData.parking === 'N/A') {
      return null
    }

    // Check if parking is "Yes" (case insensitive)
    if (propertyData.parking.toLowerCase() === 'yes' || propertyData.parking === 'true') {
      return 100
    }

    return 0
  }

  // Calculate BDR (M) score based on bedrooms match
  const calculateBDRScore = (): number | null => {
    if (!userSelections.bedrooms || !propertyData.bedrooms || propertyData.bedrooms === 'N/A') {
      return null
    }

    const userBedrooms = parseNumber(userSelections.bedrooms)
    const propertyBedrooms = parseNumber(propertyData.bedrooms)

    if (userBedrooms === null || propertyBedrooms === null) {
      return null
    }

    // Calculate the difference
    const difference = Math.abs(userBedrooms - propertyBedrooms)

    // Map difference to score
    if (difference === 0) {
      return 100 // Exact match
    } else if (difference === 1) {
      return 60 // One above or below
    } else if (difference === 2) {
      return 20 // Two above or below
    } else {
      return 0 // Three or more above or below
    }
  }

  // Calculate BTR (M) score based on bathrooms match
  const calculateBTRScore = (): number | null => {
    if (!userSelections.bathrooms || !propertyData.bathrooms || propertyData.bathrooms === 'N/A') {
      return null
    }

    const userBathrooms = parseNumber(userSelections.bathrooms)
    const propertyBathrooms = parseNumber(propertyData.bathrooms)

    if (userBathrooms === null || propertyBathrooms === null) {
      return null
    }

    // Calculate the difference
    const difference = Math.abs(userBathrooms - propertyBathrooms)

    // Map difference to score
    if (difference === 0) {
      return 100 // Exact match
    } else if (difference === 1) {
      return 60 // One above or below
    } else if (difference === 2) {
      return 20 // Two above or below
    } else {
      return 0 // Three or more above or below
    }
  }

  // Map property type to numeric scale (1-5)
  const getPropertyTypeNumber = (type: string | null): number | null => {
    if (!type) return null
    
    const normalized = normalizePropertyType(type)
    if (!normalized) return null

    // Map to numeric scale: 1=Detached, 2=Semi-Detached, 3=Terraced, 4=Flat, 5=Bungalow
    const typeMap: Record<string, number> = {
      'detached': 1,
      'semi-detached': 2,
      'terraced': 3,
      'flat': 4,
      'bungalow': 5,
    }

    return typeMap[normalized] || null
  }

  // Calculate PT (M) score based on property type match
  const calculatePTScore = (): number | null => {
    if (!userSelections.propertyType || !propertyData.propertyType || propertyData.propertyType === 'N/A') {
      return null
    }

    const userTypeNumber = getPropertyTypeNumber(userSelections.propertyType)
    const propertyTypeNumber = getPropertyTypeNumber(propertyData.propertyType)

    if (userTypeNumber === null || propertyTypeNumber === null) {
      return null
    }

    // Calculate the difference
    const difference = Math.abs(userTypeNumber - propertyTypeNumber)

    // Map difference to score
    if (difference === 0) {
      return 100 // Exact match
    } else if (difference === 1) {
      return 60 // One above or below
    } else if (difference === 2) {
      return 20 // Two above or below
    } else {
      return 0 // Three or more above or below
    }
  }

  // Calculate L (M) score based on distance
  const calculateLScore = (): number | null => {
    if (!propertyData.distance || propertyData.distance === 'N/A' || propertyData.distance === 'null') {
      return null
    }

    // Parse distance (distance is stored in km, need to convert to miles)
    const distanceKm = parseFloat(propertyData.distance)
    if (isNaN(distanceKm)) {
      return null
    }

    // Convert km to miles (1 km = 0.621371 miles)
    const distanceMiles = distanceKm * 0.621371

    // Round to nearest integer
    const distanceMilesRounded = Math.round(distanceMiles)

    // Map distance to score
    if (distanceMilesRounded <= 5) {
      return 100 // 0-5 miles = 100
    } else if (distanceMilesRounded >= 105) {
      return 0 // 105+ miles = 0
    } else {
      // For 6-104 miles: score = 105 - distance
      return 105 - distanceMilesRounded
    }
  }

  // Calculate A (M) score based on area matching
  const calculateAScore = (): number | null => {
    if (!userSelections.size || !propertyData.area || propertyData.area === 'N/A') {
      return null
    }

    // Parse property area (remove "m²" if present and extract number)
    const areaStr = propertyData.area
    const cleanedArea = areaStr.replace(/m²/g, '').replace(/m\^2/g, '').trim()
    const propertyArea = parseFloat(cleanedArea)
    
    if (isNaN(propertyArea) || propertyArea <= 0) {
      return null
    }

    // Parse user size preference (e.g., "50-70", "71-90", "171+")
    const userSize = userSelections.size
    
    // Check if it's a range (e.g., "50-70")
    const sizeRangeMatch = userSize.match(/(\d+)-(\d+)/)
    if (sizeRangeMatch) {
      const min = parseFloat(sizeRangeMatch[1])
      const max = parseFloat(sizeRangeMatch[2])
      
      // Check if property area falls within the range
      if (propertyArea >= min && propertyArea <= max) {
        return 100 // Within range
      }
      
      // Calculate distance from boundaries
      const distanceFromMin = Math.abs(propertyArea - min)
      const distanceFromMax = Math.abs(propertyArea - max)
      
      // Use the closer boundary
      const difference = Math.min(distanceFromMin, distanceFromMax)
      
      // Calculate score: 100 - (difference * 3)
      const score = 100 - (difference * 3)
      
      // Clamp to 0 if negative
      return Math.max(0, Math.round(score))
    }
    
    // Handle "171+" case
    if (userSize.includes('+')) {
      const min = parseFloat(userSize.replace('+', '').trim())
      
      if (isNaN(min)) {
        return null
      }
      
      // Check if property area is greater than or equal to the minimum
      if (propertyArea >= min) {
        return 100 // Within range
      }
      
      // Calculate distance from lower limit (only if property is below minimum)
      const difference = min - propertyArea
      
      // Calculate score: 100 - (difference * 3)
      const score = 100 - (difference * 3)
      
      // Clamp to 0 if negative
      return Math.max(0, Math.round(score))
    }
    
    return null
  }

  // Check if debug mode is enabled
  const debugParam = searchParams.get('debug')
  const isDebugMode = debugParam === 'true' || debugParam === 'True' || debugParam === 'TRUE'

  // Header redesign: split "Street, Town, City, POSTCODE" into a street+town H1
  // line and a separate postcode, since Apify's displayAddress bundles them.
  const headerAddressParts = displayAddress.split(',').map(p => p.trim()).filter(Boolean)
  const postcodeForMatch = (propertyData.houseFullPostcode || '').toUpperCase()
  const headerAddressWithoutPostcode = postcodeForMatch
    ? headerAddressParts.filter(part => !part.toUpperCase().includes(postcodeForMatch))
    : headerAddressParts
  const headerStreetTown = headerAddressWithoutPostcode.slice(0, 2).join(', ') || displayAddress
  const headerFloorArea = propertyData.area !== 'N/A'
    ? formatArea(propertyData.area)
    : (propertyData.epcFloorArea ? formatArea(propertyData.epcFloorArea) : null)

  // Key points (rules engine): build a deterministic context from data we already have.
  const sortedPriceHistory = priceHistory
    ? [...priceHistory].sort((a, b) => a.year.localeCompare(b.year))
    : []
  const lastSaleEntry = sortedPriceHistory.length > 0 ? sortedPriceHistory[sortedPriceHistory.length - 1] : null
  const districtAverageYears = averagePriceByYear ? Object.keys(averagePriceByYear).sort() : []
  const latestDistrictAverageYear = districtAverageYears.length > 0 ? districtAverageYears[districtAverageYears.length - 1] : null
  const noiseLevels = riskData.environmentData.noiseLevels
  const maxNoiseDb = [noiseLevels.roadNoiseDb, noiseLevels.railNoiseDb, noiseLevels.airportNoiseDb]
    .filter((v): v is number => v !== null)
    .reduce((max, v) => Math.max(max, v), -Infinity)

  const ruleContext: RuleContext = {
    askingPrice: parsePrice(propertyData.price),
    propertyType: propertyData.propertyType !== 'N/A' ? propertyData.propertyType : null,
    outcode: propertyData.houseOutcode,
    districtAveragePrice: latestDistrictAverageYear ? averagePriceByYear![latestDistrictAverageYear] : null,
    districtAverageYear: latestDistrictAverageYear ? parseInt(latestDistrictAverageYear) : null,
    daysOnMarket: getDaysOnMarketNumber(),
    // Rightmove gives "5/12/2026" (month first); show UK readers "12 May 2026".
    listedDateLabel: (() => {
      if (!propertyData.timeOnMarket || propertyData.timeOnMarket === 'N/A') return null
      const listed = new Date(propertyData.timeOnMarket)
      return isNaN(listed.getTime())
        ? null
        : listed.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    })(),
    salesCountPast12Months: propertyData.salesCountPast12Months ? parseInt(propertyData.salesCountPast12Months) : null,
    lastSalePrice: lastSaleEntry ? parsePrice(lastSaleEntry.price) : null,
    lastSaleYear: lastSaleEntry ? parseInt(lastSaleEntry.year) : null,
    epcRating: propertyData.epcRating,
    constructionAgeBand: propertyData.constructionAgeBand,
    hasConservationArea: riskData.planningConstraints.conservationAreas.length > 0,
    hasArticle4: riskData.planningConstraints.article4Directions.length > 0,
    hasFloodRisk: riskData.planningConstraints.floodRiskZones.length > 0,
    maxNoiseDb: maxNoiseDb === -Infinity ? null : maxNoiseDb,
    bedrooms: propertyData.bedrooms !== 'N/A' ? propertyData.bedrooms : null,
    priceReduced: false,
  }
  const keyPoints = buildKeyPoints(ruleContext)


  // Section 01 (price fairness): raw price/m² for this home, and its sale history
  // plus today's asking price as the final point (so "latest" growth = last sale -> now).
  const rawPricePerSqm = (() => {
    const price = parsePrice(propertyData.price)
    const areaStr = propertyData.area
    if (!price || !areaStr || areaStr === 'N/A') return null
    const area = parseFloat(areaStr.replace(/m²/g, '').replace(/m\^2/g, '').trim())
    if (!area || isNaN(area) || area <= 0) return null
    return price / area
  })()
  // HomeLens score: one score per report section (§01–§04 out of 200, §05 out of 199),
  // 999 overall. See src/lib/scoring/homelens-score.ts for every rule.
  const homeLens = (() => {
    const yesNo = (value: string | undefined) =>
      !value || value === 'N/A' ? null : value.toLowerCase() === 'yes' || value === 'true'
    const importance = (value: string | null) => {
      const n = value && value !== 'null' ? parseInt(value) : NaN
      return Number.isFinite(n) ? n : null
    }
    const areaSqm = (() => {
      const raw = propertyData.area !== 'N/A' ? propertyData.area : propertyData.epcFloorArea
      const n = raw ? parseFloat(String(raw).replace(/m²|m\^2/g, '')) : NaN
      return Number.isFinite(n) && n > 0 ? n : null
    })()
    return homeLensScore({
      price: scorePrice({
        askingPrice: ruleContext.askingPrice,
        districtAveragePrice: ruleContext.districtAveragePrice,
        pricePerSqm: rawPricePerSqm,
        districtPricePerSqm: averagePricePerSqm,
        areaGrowthRatePercent: averagePriceByYear ? districtValueGrowth(averagePriceByYear)?.multiYearRatePercent ?? null : null,
      }),
      market: scoreMarket({
        supplyDemandLabel: supplyDemand?.label ?? null,
        daysOnMarket: ruleContext.daysOnMarket,
        salesTrendChangePercent: districtSalesTrend?.changePercent ?? null,
      }),
      risks: scoreRisks(riskDataLoading ? null : riskData),
      dailyLife: scoreDailyLife(nearbyLoading ? null : dailyLifePlaces),
      mustHaves: scoreMustHaves({
        wanted: userSelections,
        importance: {
          bedrooms: importance(preferenceScores.bedrooms),
          bathrooms: importance(preferenceScores.bathrooms),
          propertyType: importance(preferenceScores.propertyType),
          size: importance(preferenceScores.size),
          garden: importance(preferenceScores.garden),
          parking: importance(preferenceScores.parking),
          garage: importance(preferenceScores.garage),
        },
        home: {
          bedrooms: parseNumber(propertyData.bedrooms),
          bathrooms: parseNumber(propertyData.bathrooms),
          propertyType: propertyData.propertyType !== 'N/A' ? propertyData.propertyType : null,
          areaSqm,
          garden: yesNo(propertyData.garden),
          parking: yesNo(propertyData.parking),
          garage: yesNo(propertyData.garage),
        },
      }),
    })
  })()
  const totalScore = homeLens.total

  const priceFairnessSales: PricePoint[] = [
    ...sortedPriceHistory
      .map((entry) => ({ price: parsePrice(entry.price), year: parseInt(entry.year) }))
      .filter((p): p is PricePoint => p.price !== null && Number.isFinite(p.year)),
    ...(ruleContext.askingPrice !== null ? [{ price: ruleContext.askingPrice, year: asOf.getFullYear() }] : []),
  ]
  const pastSalesOnly: PricePoint[] = sortedPriceHistory
    .map((entry) => ({ price: parsePrice(entry.price), year: parseInt(entry.year) }))
    .filter((p): p is PricePoint => p.price !== null && Number.isFinite(p.year))
  const latestNeighbourYear = neighbourDistricts
    .flatMap((d) => d.yearly.map((y) => y.year))
    .sort((a, b) => b - a)[0]
  const rankingRows: RankingRow[] = latestNeighbourYear === undefined
    ? []
    : neighbourDistricts.flatMap((d) => {
        const price = d.yearly.find((y) => y.year === latestNeighbourYear)?.avgPrice
        if (price === undefined) return []
        return [{ label: d.outcode, price, isSubjectDistrict: d.outcode === propertyData.houseOutcode }]
      })

  const neighbourRankInsight = (() => {
    if (rankingRows.length < 2) return null
    const sortedDesc = [...rankingRows].sort((a, b) => b.price - a.price)
    const subjectIndex = sortedDesc.findIndex((r) => r.isSubjectDistrict)
    if (subjectIndex === -1) return null
    if (subjectIndex === 0) return `${propertyData.houseOutcode} is the most expensive of its neighbours.`
    if (subjectIndex === sortedDesc.length - 1) return `${propertyData.houseOutcode} is the least expensive of its neighbours.`
    return `${propertyData.houseOutcode} is the ${ordinalWord(subjectIndex + 1)} most expensive of its neighbours, behind ${sortedDesc[subjectIndex - 1].label}.`
  })()

  const homeGrowth = homeValueGrowth(priceFairnessSales)
  const priceHistoryInsight = homeGrowth
    ? homeGrowth.previous
      ? `Grew ${homeGrowth.previous.ratePercent.toFixed(1)}% a year to ${homeGrowth.previous.toYear}, then ${homeGrowth.latest.ratePercent.toFixed(1)}% a year to today's asking price.`
      : `Grew ${homeGrowth.latest.ratePercent.toFixed(1)}% a year to today's asking price.`
    : null

  const rankingInsight = (() => {
    if (rankingRows.length === 0 || ruleContext.askingPrice === null) return null
    const prices = rankingRows.map((r) => r.price)
    const maxPrice = Math.max(...prices)
    const minPrice = Math.min(...prices)
    const typeLabel = propertyData.propertyType !== 'N/A' ? propertyData.propertyType.toLowerCase() : 'home'
    if (ruleContext.askingPrice > maxPrice) {
      return `At ${formatCurrency(ruleContext.askingPrice)} it's asking more than the typical ${typeLabel} home in any nearby district.`
    }
    if (ruleContext.askingPrice < minPrice) {
      return `At ${formatCurrency(ruleContext.askingPrice)} it's asking less than the typical ${typeLabel} home in every nearby district.`
    }
    return `At ${formatCurrency(ruleContext.askingPrice)} it's asking more than some nearby districts and less than others.`
  })()

  // When there's no sale history, "Seller's gain at asking price" has nothing to show,
  // leaving empty space next to "Recommended offer" — and separately, "This home's
  // price history" (which needs that same sale history) also won't render, leaving
  // "How the asking price compares" alone with empty space next to it too. In that
  // case, move the ranking chart up next to "Recommended offer" instead of leaving it
  // in its usual spot, so neither gap appears.
  const hasSellersGain = sellersGain(ruleContext.askingPrice, ruleContext.lastSalePrice) !== null
  const showRankingNextToOffer = !hasSellersGain && rankingRows.length > 0
  const rankingChartBlock = rankingRows.length > 0 ? (
    <div>
      <div className="font-semibold">How the asking price compares, {latestNeighbourYear}</div>
      {rankingInsight && (
        <div className="mt-1" style={{ color: '#6B6B70' }}>{rankingInsight}</div>
      )}
      <div className="mt-4">
        <RankingBars rows={rankingRows} thisHomePrice={ruleContext.askingPrice} />
      </div>
      <p className="mt-1.5 text-[12px]" style={{ color: '#6B6B70' }}>
        Average {propertyData.propertyType?.toLowerCase()} sold price by district.
      </p>
    </div>
  ) : null

  // Must-haves (§05): derive Yes/No from the existing match-calculation + preference-card logic.
  const matchFlag = (label: string): boolean | null => {
    if (strongMatches.some((m) => m.label === label)) return true
    if (weakMatches.some((m) => m.label === label)) return false
    return null
  }
  const findPreferenceCard = (key: string) => preferenceCards.find((c) => c.key === key)
  const preferenceCardFlag = (key: string): boolean | null => {
    const value = findPreferenceCard(key)?.isYes
    return typeof value === 'boolean' ? value : null
  }
  const mustHaveItems: MustHaveItem[] = [
    { label: 'Garden', value: preferenceCardFlag('garden') },
    { label: 'Parking', value: preferenceCardFlag('parking') },
    { label: 'Garage', value: preferenceCardFlag('garage') },
    {
      label: propertyData.bedrooms !== 'N/A' ? `${propertyData.bedrooms} bedrooms` : 'Bedrooms',
      value: matchFlag('Bedrooms'),
    },
    {
      label: propertyData.bathrooms !== 'N/A' ? `${propertyData.bathrooms} bathrooms` : 'Bathrooms',
      value: matchFlag('Bathrooms'),
    },
    {
      label: propertyData.propertyType !== 'N/A' ? propertyData.propertyType : 'Property type',
      value: matchFlag('Property Type'),
    },
  ]

  // Key points (§00 tabs): written by the model from everything the report found, once
  // the background data has loaded; the rule-based points are the fallback and gap-filler.
  const keyPointFindings: ReportFindings = (() => {
    const offerPremium = percentVs(ruleContext.askingPrice, ruleContext.districtAveragePrice)
    const gain = sellersGain(ruleContext.askingPrice, ruleContext.lastSalePrice)
    const floorArea = parseFloat(String((propertyData.area !== 'N/A' ? propertyData.area : propertyData.epcFloorArea) ?? ''))
    return {
      property: {
        address: [headerStreetTown, propertyData.houseFullPostcode].filter(Boolean).join(', ') || null,
        askingPrice: ruleContext.askingPrice,
        propertyType: ruleContext.propertyType,
        bedrooms: parseNumber(propertyData.bedrooms),
        bathrooms: parseNumber(propertyData.bathrooms),
        floorAreaSqm: Number.isFinite(floorArea) && floorArea > 0 ? floorArea : null,
        epcRating: propertyData.epcRating ?? null,
        estimatedYearBuilt: propertyData.constructionAgeBand ?? null,
        tenure: propertyData.tenure ?? null,
      },
      price: {
        outcode: ruleContext.outcode,
        areaAveragePrice: ruleContext.districtAveragePrice === null ? null : Math.round(ruleContext.districtAveragePrice),
        areaAverageYear: ruleContext.districtAverageYear,
        askingVsAreaPercent: offerPremium,
        pricePerSqm: rawPricePerSqm === null ? null : Math.round(rawPricePerSqm),
        areaPricePerSqm: averagePricePerSqm === null ? null : Math.round(averagePricePerSqm),
        pricePerSqmVsAreaPercent: percentVs(rawPricePerSqm, averagePricePerSqm),
        areaGrowthPercentPerYear: (() => {
          const g = averagePriceByYear ? districtValueGrowth(averagePriceByYear)?.multiYearRatePercent : null
          return g === null || g === undefined ? null : Math.round(g * 10) / 10
        })(),
        lastSale: ruleContext.lastSalePrice !== null && ruleContext.lastSaleYear !== null
          ? { price: ruleContext.lastSalePrice, year: ruleContext.lastSaleYear }
          : null,
        sellersGainPercent: gain ? Math.round(gain.percent) : null,
        saleHistory: pastSalesOnly,
        recentSalesNearby: summariseRecentSales(nearestSales),
      },
      market: {
        daysOnMarket: ruleContext.daysOnMarket,
        firstListed: ruleContext.listedDateLabel,
        supplyDemand: supplyDemand
          ? { label: supplyDemand.label, forSaleNow: supplyDemand.forSaleCount, salesPerYear: supplyDemand.salesPerYear, monthsOfSupply: Math.round(supplyDemand.monthsOfSupply * 10) / 10 }
          : null,
        areaSalesLast12Months: districtSalesTrend?.currentCount ?? null,
        areaSalesPrevious12Months: districtSalesTrend?.previousCount ?? null,
        areaSalesChangePercent: districtSalesTrend?.changePercent === undefined || districtSalesTrend?.changePercent === null ? null : Math.round(districtSalesTrend.changePercent),
        postcodeSalesLast12Months: ruleContext.salesCountPast12Months,
        listingsForSaleNearby: summariseListings(nearestForSale),
      },
      risks: summariseRisks(riskDataLoading ? null : riskData),
      dailyLife: summariseDailyLife(nearbyLoading ? null : dailyLifePlaces),
      score: summariseScore(homeLens),
    }
  })()
  const backgroundDataLoaded =
    mounted && !riskDataLoading && !nearbyLoading && !districtLoading && !supplyDemandLoading && !pricePerSqmLoading
  const { keyPoints: displayedKeyPoints, offer: aiOffer, loading: keyPointsLoading } = useAiKeyPoints(
    keyPointFindings,
    backgroundDataLoaded,
    searchParams.get('savedReportId') ?? propertyData.rightmoveUrl ?? null,
    keyPoints,
    snapshot?.insights ?? null
  )

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FBFAF7', position: 'relative' }}>
      <Navbar isScrolled={isScrolled} />

      <div className={`${interBody.variable} ${interTight.variable}`}>
        <ReportHeader
          street={headerStreetTown}
          town={null}
          postcode={propertyData.houseFullPostcode}
          // The frozen sample has no outbound links: listings get taken down, so they'd go dead.
          rightmoveUrl={snapshot ? null : propertyData.rightmoveUrl}
          askingPrice={propertyData.price !== 'N/A' ? propertyData.price : null}
          propertyType={propertyData.propertyType !== 'N/A' ? propertyData.propertyType : null}
          bedrooms={propertyData.bedrooms !== 'N/A' ? propertyData.bedrooms : null}
          bathrooms={propertyData.bathrooms !== 'N/A' ? propertyData.bathrooms : null}
          floorArea={headerFloorArea}
          epcRating={propertyData.epcRating}
          constructionAgeBand={propertyData.constructionAgeBand}
          tenure={propertyData.tenure}
        />
        <section
          className="grid grid-cols-1 sm:grid-cols-12 gap-6 px-6 sm:px-12 py-[31px] border-t border-[#0B0B0C]"
          style={{ fontFamily: "var(--font-report-body)", fontSize: 14, color: "#0B0B0C" }}
        >
          {SHOW_HOMELENS_SCORE && mounted && totalScore !== null && (
            <div className="sm:col-span-3">
              <HomeLensScore score={totalScore} maxScore={homeLens.max} sections={scoreSectionRows(homeLens)} />
            </div>
          )}
          <div className={SHOW_HOMELENS_SCORE && mounted && totalScore !== null ? "sm:col-span-9 min-w-0" : "sm:col-span-12 min-w-0"}>
            <KeyPointsTabs keyPoints={displayedKeyPoints} loading={keyPointsLoading} />
          </div>
        </section>
      </div>

      <div className={`${interBody.variable} ${interTight.variable}`}>
        <ReportSection id="price" number="01" title="What is a fair price?" subtitle="Price">
          <PriceFairness
            askingPrice={ruleContext.askingPrice}
            districtAveragePrice={ruleContext.districtAveragePrice}
            districtAverageYear={ruleContext.districtAverageYear}
            propertyType={ruleContext.propertyType}
            outcode={ruleContext.outcode}
            pricePerSqm={rawPricePerSqm}
            districtPricePerSqm={averagePricePerSqm}
            daysOnMarket={ruleContext.daysOnMarket}
            recentSalesCount={ruleContext.salesCountPast12Months}
            lastSalePrice={ruleContext.lastSalePrice}
            lastSaleYear={ruleContext.lastSaleYear}
            priceHistorySales={priceFairnessSales}
            averagePriceByYear={averagePriceByYear}
            noGainFallback={showRankingNextToOffer ? rankingChartBlock : undefined}
            aiOffer={aiOffer}
            offerLoading={keyPointsLoading}
          />

          {neighbourDistricts.length > 0 && neighbourDistricts.some((d) => d.yearly.length > 0) && (
            <div className="mt-10 pt-4 border-t" style={{ borderColor: "#0B0B0C" }}>
              <div>
                <div className="font-semibold">
                  Average sold price, {propertyData.propertyType?.toLowerCase()} homes: {propertyData.houseOutcode} and its neighbours
                </div>
                {neighbourRankInsight && (
                  <div className="mt-1" style={{ color: '#6B6B70' }}>{neighbourRankInsight}</div>
                )}
              </div>
              <div className="mt-4">
                <NeighbourChart districts={neighbourDistricts} subjectOutcode={propertyData.houseOutcode || ''} />
              </div>
              <p className="mt-1.5 text-[12px]" style={{ color: '#6B6B70' }}>
                Average sold price, HM Land Registry.
              </p>
            </div>
          )}

          {(pastSalesOnly.length > 0 && ruleContext.askingPrice !== null) || (rankingRows.length > 0 && !showRankingNextToOffer) ? (
            <div className="mt-10 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-10" style={{ borderColor: '#0B0B0C' }}>
              {pastSalesOnly.length > 0 && ruleContext.askingPrice !== null && (
                <div>
                  <div className="font-semibold">This home&apos;s price history</div>
                  {priceHistoryInsight && (
                    <div className="mt-1" style={{ color: '#6B6B70' }}>{priceHistoryInsight}</div>
                  )}
                  <div className="mt-4">
                    <HomePriceHistoryChart
                      sales={pastSalesOnly}
                      askingPrice={ruleContext.askingPrice}
                      askingYear={asOf.getFullYear()}
                    />
                  </div>
                  <div className="flex gap-4 mt-1.5 text-[12px]" style={{ color: '#6B6B70' }}>
                    <span>● Sold</span>
                    <span>○ Asking price (not a sale)</span>
                  </div>
                </div>
              )}

              {!showRankingNextToOffer && rankingChartBlock}
            </div>
          ) : null}
        </ReportSection>
      </div>

      <div className={`${interBody.variable} ${interTight.variable}`}>
        <ReportSection id="market" number="02" title="How is the local market?" subtitle="Market">
          <MarketSpeed
            asOf={asOf}
            daysOnMarket={ruleContext.daysOnMarket}
            salesTrend={districtSalesTrend}
            outcode={ruleContext.outcode}
            propertyType={ruleContext.propertyType}
            postcodeSalesCount={ruleContext.salesCountPast12Months}
            postcode={propertyData.houseFullPostcode}
            nearestSales={nearestSales}
            askingPrice={ruleContext.askingPrice}
            askingPricePerSqm={rawPricePerSqm}
            extraContent={
              supplyDemand && (
                <SupplyDemand data={supplyDemand} propertyType={ruleContext.propertyType} outcode={ruleContext.outcode} />
              )
            }
          />
          {nearestForSale.length > 0 && (
            <div className="mt-10 pt-4 border-t" style={{ borderColor: "#0B0B0C" }}>
              <NearestForSale listings={nearestForSale} propertyType={ruleContext.propertyType} linkToListings={!snapshot} />
            </div>
          )}
        </ReportSection>
      </div>

      <div className={`${interBody.variable} ${interTight.variable}`}>
        <ReportSection id="risks" number="03" title="What to check before you offer" subtitle="Risks & restrictions">
          <RisksRestrictionsSection data={riskData} loading={riskDataLoading} linkDocuments={!snapshot} />
        </ReportSection>
      </div>

      <div className={`${interBody.variable} ${interTight.variable}`}>
        <ReportSection id="nearby" number="04" title="What daily life looks like here" subtitle="Nearby">
          <DailyLife
            schools={dailyLifePlaces.schools}
            nurseries={dailyLifePlaces.nurseries}
            dentists={dailyLifePlaces.dentists}
            gpSurgeries={dailyLifePlaces.gpSurgeries}
            hospitals={dailyLifePlaces.hospitals}
            parks={dailyLifePlaces.parks}
            stations={dailyLifePlaces.stations}
            censusTenure={censusTenure}
            englandCensusTenure={englandCensusTenure}
          />
        </ReportSection>
      </div>

      <div className="w-full max-w-full box-border container mx-auto px-4 sm:px-6 py-6 sm:py-12 overflow-x-hidden">
        <div className="mx-auto w-full max-w-[1357px] min-w-0">

          {/* Debug Tables - Only show when ?debug=true */}
          {isDebugMode && (
            <div className="w-full max-w-full overflow-x-auto mt-6">
          <table className="w-full min-w-[500px] bg-white rounded-lg shadow-md border border-gray-300" style={{ backgroundColor: '#FFFFFF' }}>
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Full Address</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{displayAddress}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Property Address (scraped)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{propertyData.propertyAddress}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Address Match Source</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>
                  {propertyData.fullAddress && propertyData.fullAddress !== propertyData.propertyAddress ? 'Land Registry SPARQL (Price Paid) match' : 'Fallback to scraped propertyAddress'}
                </td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Price</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{propertyData.price}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Property Type</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{propertyData.propertyType}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Number of Bathrooms</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{propertyData.bathrooms}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Number of Bedrooms</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{propertyData.bedrooms}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Area</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{formatArea(propertyData.area)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Time on Market</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{propertyData.timeOnMarket}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Garden</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{propertyData.garden}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Parking</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{propertyData.parking}</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Garage</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{propertyData.garage}</td>
              </tr>
            </tbody>
          </table>

          {/* Second Table */}
          <table className="w-full bg-white rounded-lg shadow-md overflow-hidden mt-8 border border-gray-300" style={{ backgroundColor: '#FFFFFF' }}>
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Property Price History</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>
                  {priceHistory && priceHistory.length > 0 ? 'see below' : 'None available'}
                </td>
              </tr>
              {priceHistory && priceHistory.length > 0 ? (
                priceHistory.map((entry, index) => (
                  <tr key={index} className="border-b border-gray-300">
                    <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>{entry.price}</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{entry.year}</td>
                  </tr>
                ))
              ) : (
                <>
                  <tr className="border-b border-gray-300">
                    <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Row 2</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{formatCurrency(averagePriceFiveYear)}</td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Row 3</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}></td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Row 4</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}></td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Row 5</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}></td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Row 6</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}></td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Row 7</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}></td>
                  </tr>
                </>
              )}
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Average YoY price growth (%)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateCAGR()}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Preferred address (latitude)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{propertyData.preferredLatitude || 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Preferred address (longitude)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{propertyData.preferredLongitude || 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>House Address (latitude)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{propertyData.latitude}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>House Address (longitude)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{propertyData.longitude}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Distance</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>
                  {propertyData.distance !== null ? `${propertyData.distance} km` : 'N/A'}
                </td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>House Full Post code</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{propertyData.houseFullPostcode || 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>House Post Code (outcode)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{propertyData.houseOutcode || 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>price per square metre</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculatePricePerSqm()}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>number of sales in post code in past 12m</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{propertyData.salesCountPast12Months !== null ? propertyData.salesCountPast12Months : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>average sold price for property type in outcode (last 5 years)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}></td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>2021</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{getAveragePriceForYear(2021)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>2022</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{getAveragePriceForYear(2022)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>2023</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{getAveragePriceForYear(2023)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>2024</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{getAveragePriceForYear(2024)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>2025</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{getAveragePriceForYear(2025)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>average Price/sqm for property type in outcode over past 12m</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{formatPricePerSqmValue(averagePricePerSqm)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Total score</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{totalScore ?? 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Total score (Market Metrics)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateTotalMarketMetricsScore() !== null ? calculateTotalMarketMetricsScore() : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>PPQM</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculatePPQMScore() !== null ? calculatePPQMScore() : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>DOM</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateDOMScore() !== null ? calculateDOMScore() : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>PGPY</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculatePGPYScore() !== null ? calculatePGPYScore() : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>PCT</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculatePCTScore() !== null ? calculatePCTScore() : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>NOS</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateNOSScore() !== null ? calculateNOSScore() : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Total score (custom criteria)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{homeLens.sections.mustHaves.score ?? 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>BDR (M)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateBDRScore() !== null ? calculateBDRScore() : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>BTR (M)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateBTRScore() !== null ? calculateBTRScore() : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>PT (M)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculatePTScore() !== null ? calculatePTScore() : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>A (M)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateAScore() !== null ? calculateAScore() : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>GG (M)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateGGScore() !== null ? calculateGGScore() : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>GD (M)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateGDScore() !== null ? calculateGDScore() : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>PK (M)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculatePKScore() !== null ? calculatePKScore() : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>L (M)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateLScore() !== null ? calculateLScore() : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>weights total</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateWeightsTotal() !== null ? calculateWeightsTotal() : 'N/A'}</td>
              </tr>
            </tbody>
          </table>

          {/* Nearby Places Table */}
          {nearbyPlaces && (
            <table className="w-full bg-white rounded-lg shadow-md overflow-hidden mt-8 border border-gray-300" style={{ backgroundColor: '#FFFFFF' }}>
              <thead>
                <tr>
                  <th className="px-6 py-4 text-left font-semibold" style={{ color: '#000000' }}>Category</th>
                  <th className="px-6 py-4 text-left font-semibold" style={{ color: '#000000' }}>Name</th>
                  <th className="px-6 py-4 text-left font-semibold" style={{ color: '#000000' }}>Distance</th>
                </tr>
              </thead>
              <tbody>
                {/* Schools */}
                {nearbyPlaces.schools?.length > 0 && nearbyPlaces.schools.map((place, index) => (
                  <tr key={`school-${index}`} className="border-b border-gray-300">
                    <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>School</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.name}</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.distance.toFixed(2)} km</td>
                  </tr>
                ))}
                {/* Stations */}
                {nearbyPlaces.stations?.length > 0 && nearbyPlaces.stations.map((place, index) => (
                  <tr key={`station-${index}`} className="border-b border-gray-300">
                    <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Station</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.name}</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.distance.toFixed(2)} km</td>
                  </tr>
                ))}
                {/* Parks */}
                {nearbyPlaces.parks?.length > 0 && nearbyPlaces.parks.map((place, index) => (
                  <tr key={`park-${index}`} className="border-b border-gray-300">
                    <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Park</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.name}</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.distance.toFixed(2)} km</td>
                  </tr>
                ))}
                {/* Supermarkets */}
                {nearbyPlaces.supermarkets?.length > 0 && nearbyPlaces.supermarkets.map((place, index) => (
                  <tr key={`supermarket-${index}`} className="border-b border-gray-300">
                    <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Supermarket</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.name}</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.distance.toFixed(2)} km</td>
                  </tr>
                ))}
                {/* Places of Worship */}
                {nearbyPlaces.placesOfWorship?.length > 0 && nearbyPlaces.placesOfWorship.map((place, index) => (
                  <tr key={`worship-${index}`} className="border-b border-gray-300">
                    <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Place of Worship</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.name}</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.distance.toFixed(2)} km</td>
                  </tr>
                ))}
                {/* Gyms */}
                {nearbyPlaces.gyms?.length > 0 && nearbyPlaces.gyms.map((place, index) => (
                  <tr key={`gym-${index}`} className="border-b border-gray-300">
                    <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Gym</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.name}</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.distance.toFixed(2)} km</td>
                  </tr>
                ))}
                {/* Hospitals */}
                {nearbyPlaces.hospitals?.length > 0 && nearbyPlaces.hospitals.map((place, index) => (
                  <tr key={`hospital-${index}`} className="border-b border-gray-300">
                    <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Hospital</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.name}</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.distance.toFixed(2)} km</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Preferred Preferences Table */}
          <table className="w-full bg-white rounded-lg shadow-md overflow-hidden mt-8 border border-gray-300" style={{ backgroundColor: '#FFFFFF' }}>
            <thead>
              <tr>
                <th className="px-6 py-4 text-left font-semibold" style={{ color: '#000000' }}>Preference</th>
                <th className="px-6 py-4 text-left font-semibold" style={{ color: '#000000' }}>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Preferred Number of bedrooms</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{formatPreferenceScore(preferenceScores.bedrooms)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Preferred number of bathrooms</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{formatPreferenceScore(preferenceScores.bathrooms)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Preferred property type</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{formatPreferenceScore(preferenceScores.propertyType)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Preferred size</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{formatPreferenceScore(preferenceScores.size)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Preferred garden</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{formatPreferenceScore(preferenceScores.garden)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Preferred parking</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{formatPreferenceScore(preferenceScores.parking)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Preferred garage</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{formatPreferenceScore(preferenceScores.garage)}</td>
              </tr>
              <tr>
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Preferred location score</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{formatPreferenceScore(preferenceScores.location)}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Preferred Number of bedrooms (W)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateWeightedPreference(preferenceScores.bedrooms) !== null ? calculateWeightedPreference(preferenceScores.bedrooms)?.toFixed(4) : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Preferred number of bathrooms (W)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateWeightedPreference(preferenceScores.bathrooms) !== null ? calculateWeightedPreference(preferenceScores.bathrooms)?.toFixed(4) : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Preferred property type (W)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateWeightedPreference(preferenceScores.propertyType) !== null ? calculateWeightedPreference(preferenceScores.propertyType)?.toFixed(4) : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Preferred size (W)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateWeightedPreference(preferenceScores.size) !== null ? calculateWeightedPreference(preferenceScores.size)?.toFixed(4) : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Preferred garden (W)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateWeightedPreference(preferenceScores.garden) !== null ? calculateWeightedPreference(preferenceScores.garden)?.toFixed(4) : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Preferred parking (W)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateWeightedPreference(preferenceScores.parking) !== null ? calculateWeightedPreference(preferenceScores.parking)?.toFixed(4) : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Preferred garage (W)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateWeightedPreference(preferenceScores.garage) !== null ? calculateWeightedPreference(preferenceScores.garage)?.toFixed(4) : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Preferred location score (W)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateWeightedPreference(preferenceScores.location) !== null ? calculateWeightedPreference(preferenceScores.location)?.toFixed(4) : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>BDR (MS)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateBDRMS() !== null ? calculateBDRMS()?.toFixed(4) : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>BTR (MS)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateBTRMS() !== null ? calculateBTRMS()?.toFixed(4) : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>PT (MS)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculatePTMS() !== null ? calculatePTMS()?.toFixed(4) : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>A (MS)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateAMS() !== null ? calculateAMS()?.toFixed(4) : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>GG (MS)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateGGMS() !== null ? calculateGGMS()?.toFixed(4) : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>GD (MS)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateGDMS() !== null ? calculateGDMS()?.toFixed(4) : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>PK (MS)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculatePKMS() !== null ? calculatePKMS()?.toFixed(4) : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>L (MS)</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateLMS() !== null ? calculateLMS()?.toFixed(4) : 'N/A'}</td>
              </tr>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>MS Totals</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateMSTotals() !== null ? calculateMSTotals()?.toFixed(4) : 'N/A'}</td>
              </tr>
            </tbody>
          </table>
            </div>
          )}

        </div>
      </div>

      <div className={`${interBody.variable} ${interTight.variable}`}>
        <ReportSection
          id="prefs"
          number="05"
          title="Does it tick your boxes?"
          subtitle={<Link href="/preferences" className="text-[#0A369D] no-underline hover:underline">Set your must-haves to personalise the score →</Link>}
        >
          <MustHavesGrid items={mustHaveItems} />
        </ReportSection>

        <section
          className="grid grid-cols-1 sm:grid-cols-12 gap-6 px-6 sm:px-12 py-10 border-t items-center"
          style={{ borderColor: '#0B0B0C', fontFamily: 'var(--font-report-body)', fontSize: 13, color: '#6B6B70' }}
        >
          <div className="sm:col-span-9">
            <ReportFeedback reportLabel={displayAddress} />
            <p className="m-0 mt-4 max-w-[560px]">
              Sources: HM Land Registry price paid data, EPC register, Rightmove listing data, Environment Agency flood
              mapping, planning.data.gov.uk, data.police.uk, Ofcom broadband coverage, DEFRA air quality and noise
              mapping. © {asOf.getFullYear()} HomeLens.
            </p>
          </div>
          <div className="sm:col-span-3 flex sm:justify-end">
            <div className="flex gap-3">
              <button
                onClick={handleShare}
                className="px-5 h-11 font-medium text-sm whitespace-nowrap"
                style={{ backgroundColor: 'transparent', color: '#0B0B0C', border: '1px solid #0B0B0C' }}
              >
                {shareFeedback === "copied" ? "Link copied!" : "Share"}
              </button>
              <Link
                href="/preferences"
                className="flex items-center px-5 h-11 font-medium text-sm whitespace-nowrap"
                style={{ backgroundColor: '#0B0B0C', color: '#FFFFFF' }}
              >
                Analyse another property →
              </Link>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}
