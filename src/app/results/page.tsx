"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChartLineLabel } from "@/components/ui/chart-line-label"
import { ChartRadarPreferences } from "@/components/ui/chart-radar-preferences"
import { ChartBarPreferences } from "@/components/ui/chart-bar-preferences"
import { NearbyAmenities } from "@/components/nearby-amenities"
import { ScoreGauge } from "@/components/ui/score-gauge"
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"

export default function ResultsPage() {
  const searchParams = useSearchParams()
  const [isScrolled, setIsScrolled] = useState(false)
  const [mounted, setMounted] = useState(false)

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
  }

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

  const averagePricePerSqmParam = searchParams.get('averagePricePerSqm')
  const averagePricePerSqm = averagePricePerSqmParam && averagePricePerSqmParam !== 'null'
    ? parseFloat(averagePricePerSqmParam)
    : null

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

  // Parse nearby places from URL params
  let nearbyPlaces: {
    schools: Array<{ name: string; distance: number; address: string; rating?: number }>;
    stations: Array<{ name: string; distance: number; address: string; rating?: number }>;
    parks: Array<{ name: string; distance: number; address: string; rating?: number }>;
    supermarkets: Array<{ name: string; distance: number; address: string; rating?: number }>;
    placesOfWorship: Array<{ name: string; distance: number; address: string; rating?: number }>;
    gyms: Array<{ name: string; distance: number; address: string; rating?: number }>;
    hospitals: Array<{ name: string; distance: number; address: string; rating?: number }>;
  } | null = null
  const nearbyPlacesParam = searchParams.get('nearbyPlaces')
  if (nearbyPlacesParam && nearbyPlacesParam !== 'null') {
    try {
      nearbyPlaces = JSON.parse(nearbyPlacesParam)
    } catch (e) {
      nearbyPlaces = null
    }
  }

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
    
    // Check bedrooms
    if (userSelections.bedrooms && propertyData.bedrooms !== 'N/A') {
      const userBedrooms = parseNumber(userSelections.bedrooms)
      const propertyBedrooms = parseNumber(propertyData.bedrooms)
      if (userBedrooms !== null && propertyBedrooms !== null) {
        if (userBedrooms === propertyBedrooms) {
          strongMatches.push({ label: 'Bedrooms', userValue: userSelections.bedrooms, propertyValue: propertyData.bedrooms })
        } else if (Math.abs(userBedrooms - propertyBedrooms) >= 2) {
          weakMatches.push({ label: 'Bedrooms', userValue: userSelections.bedrooms, propertyValue: propertyData.bedrooms })
        }
      }
    }
    
    // Check bathrooms
    if (userSelections.bathrooms && propertyData.bathrooms !== 'N/A') {
      const userBathrooms = parseNumber(userSelections.bathrooms)
      const propertyBathrooms = parseNumber(propertyData.bathrooms)
      if (userBathrooms !== null && propertyBathrooms !== null) {
        if (userBathrooms === propertyBathrooms) {
          strongMatches.push({ label: 'Bathrooms', userValue: userSelections.bathrooms, propertyValue: propertyData.bathrooms })
        } else if (Math.abs(userBathrooms - propertyBathrooms) >= 2) {
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

  // Helper function to format property values for display
  const formatPropertyValue = (category: string, value: string | null): string => {
    if (!value || value === 'N/A' || value === 'null') return 'N/A'
    
    if (category === 'Size') {
      // Extract number from area string (e.g., "233.37 sqm" -> "233.37 sq ft")
      const match = value.match(/(\d+\.?\d*)/)
      if (match) {
        return `${match[1]} sq ft`
      }
    }
    
    if (category === 'Garden' || category === 'Parking' || category === 'Garage') {
      return value === 'Yes' || value === 'yes' || value === 'true' ? 'Yes' : 'No'
    }
    
    return value
  }

  // Helper function to format user preference values
  const formatUserValue = (category: string, value: string | null): string => {
    if (!value || value === 'N/A' || value === 'null') return 'N/A'
    
    if (category === 'Size') {
      // Format size range (e.g., "50-70" -> "50-70 sq ft")
      return `${value} sq ft`
    }
    
    return value
  }

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
      { key: 'bedrooms', label: 'Bedrooms', actual: propertyData.bedrooms, preferred: userSelections.bedrooms },
      { key: 'bathrooms', label: 'Bathrooms', actual: propertyData.bathrooms, preferred: userSelections.bathrooms },
      { key: 'propertyType', label: 'Property Type', actual: propertyData.propertyType, preferred: userSelections.propertyType },
      { key: 'size', label: 'Size', actual: propertyData.area, preferred: userSelections.size },
      { key: 'garden', label: 'Garden', actual: propertyData.garden, preferred: null },
      { key: 'parking', label: 'Parking', actual: propertyData.parking, preferred: null },
      { key: 'location', label: 'Location', actual: propertyData.houseFullPostcode || propertyData.houseOutcode, preferred: propertyData.houseFullPostcode || null },
      { key: 'garage', label: 'Garage', actual: propertyData.garage, preferred: null },
    ]

    return categories.map(category => {
      const matchPercentage = calculateMatchPercentage(category)
      const score = preferenceScores[category.key as keyof typeof preferenceScores]
      const importance = score && score !== 'null' ? parseInt(score) : 0
      
      // Determine card color based on match percentage
      const isGoodMatch = matchPercentage >= 70
      const isWeakMatch = matchPercentage < 50
      
      return {
        ...category,
        matchPercentage,
        importance,
        backgroundColor: isGoodMatch ? '#d1fae5' : isWeakMatch ? '#fef3c7' : '#d1fae5', // Light green or light yellow
        progressColor: isGoodMatch ? '#22c55e' : isWeakMatch ? '#f59e0b' : '#22c55e', // Green or orange
        matchBubbleColor: isGoodMatch ? '#22c55e' : isWeakMatch ? '#f59e0b' : '#22c55e',
      }
    })
  }

  const preferenceCards = getPreferenceCards()

  // Transform nearbyPlaces data to match NearbyAmenities component format
  const transformNearbyPlaces = () => {
    if (!nearbyPlaces) return []
    
    const amenities: Array<{ category: string; name: string; distance: number; address: string }> = []
    
    // Convert miles to km (1 mile = 1.60934 km)
    const milesToKm = (miles: number) => miles * 1.60934
    
    if (nearbyPlaces.schools) {
      nearbyPlaces.schools.forEach(school => {
        amenities.push({
          category: 'School',
          name: school.name,
          distance: milesToKm(school.distance),
          address: school.address
        })
      })
    }
    
    if (nearbyPlaces.stations) {
      nearbyPlaces.stations.forEach(station => {
        amenities.push({
          category: 'Station',
          name: station.name,
          distance: milesToKm(station.distance),
          address: station.address
        })
      })
    }
    
    if (nearbyPlaces.parks) {
      nearbyPlaces.parks.forEach(park => {
        amenities.push({
          category: 'Park',
          name: park.name,
          distance: milesToKm(park.distance),
          address: park.address
        })
      })
    }
    
    if (nearbyPlaces.supermarkets) {
      nearbyPlaces.supermarkets.forEach(supermarket => {
        amenities.push({
          category: 'Supermarket',
          name: supermarket.name,
          distance: milesToKm(supermarket.distance),
          address: supermarket.address
        })
      })
    }
    
    if (nearbyPlaces.placesOfWorship) {
      nearbyPlaces.placesOfWorship.forEach(place => {
        amenities.push({
          category: 'Place of Worship',
          name: place.name,
          distance: milesToKm(place.distance),
          address: place.address
        })
      })
    }
    
    if (nearbyPlaces.gyms) {
      nearbyPlaces.gyms.forEach(gym => {
        amenities.push({
          category: 'Gym',
          name: gym.name,
          distance: milesToKm(gym.distance),
          address: gym.address
        })
      })
    }
    
    if (nearbyPlaces.hospitals) {
      nearbyPlaces.hospitals.forEach(hospital => {
        amenities.push({
          category: 'Hospital',
          name: hospital.name,
          distance: milesToKm(hospital.distance),
          address: hospital.address
        })
      })
    }
    
    return amenities
  }

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

  // Get numeric price per sqm value
  const getPricePerSqmNumber = (): number | null => {
    const price = parsePrice(propertyData.price)
    if (!price) return null
    
    const areaStr = propertyData.area
    if (!areaStr || areaStr === 'N/A') return null
    
    const cleanedArea = areaStr.replace(/m²/g, '').replace(/m\^2/g, '').trim()
    const area = parseFloat(cleanedArea)
    
    if (!area || isNaN(area) || area <= 0) return null
    
    return price / area
  }

  // Determine color for Price/square metre based on comparison with Average
  const getPricePerSqmColor = (): string => {
    const propertyPricePerSqm = getPricePerSqmNumber()
    if (propertyPricePerSqm === null || averagePricePerSqm === null) {
      return '#0A369D' // Default color
    }

    const difference = propertyPricePerSqm - averagePricePerSqm

    // More than £50 higher than average: red
    if (difference > 50) {
      return '#B80C09'
    }
    // More than £150 lower than average: dark green
    if (difference < -150) {
      return '#38943e'
    }
    // Between £50-150 lower than average: light green
    if (difference >= -150 && difference < -50) {
      return '#9BC53D'
    }
    // Within £50 (higher or lower): yellow
    return '#FAF33E'
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
  const calculateDaysOnMarket = (): string => {
    if (!propertyData.timeOnMarket || propertyData.timeOnMarket === 'N/A') {
      return 'N/A days'
    }

    try {
      // Try to parse the timeOnMarket as a date
      const marketDate = new Date(propertyData.timeOnMarket)
      const today = new Date()
      
      // Check if the date is valid
      if (isNaN(marketDate.getTime())) {
        return 'N/A days'
      }

      // Calculate the difference in milliseconds
      const diffTime = today.getTime() - marketDate.getTime()
      
      // Convert to days
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      
      return `${diffDays} days`
    } catch (e) {
      return 'N/A days'
    }
  }

  // Get number of days on market as a number
  const getDaysOnMarketNumber = (): number | null => {
    if (!propertyData.timeOnMarket || propertyData.timeOnMarket === 'N/A') {
      return null
    }

    try {
      const marketDate = new Date(propertyData.timeOnMarket)
      const today = new Date()
      
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

  // Determine color for Days on market based on number of days
  const getDaysOnMarketColor = (): string => {
    const days = getDaysOnMarketNumber()
    if (days === null) {
      return '#0A369D' // Default color
    }

    // 0-30 days: dark green
    if (days >= 0 && days <= 30) {
      return '#38943e'
    }
    // 31-44 days: light green
    if (days >= 31 && days <= 44) {
      return '#9BC53D'
    }
    // 45-60 days: yellow
    if (days >= 45 && days <= 60) {
      return '#FAF33E'
    }
    // 60+ days: red
    if (days > 60) {
      return '#B80C09'
    }
    return '#0A369D' // Default fallback
  }

  // Get number of sales as a number
  const getSalesCountNumber = (): number | null => {
    if (propertyData.salesCountPast12Months === null || propertyData.salesCountPast12Months === 'N/A') {
      return null
    }
    const salesCount = parseInt(propertyData.salesCountPast12Months)
    return isNaN(salesCount) ? null : salesCount
  }

  // Determine color for Number of sales based on sales count
  const getSalesCountColor = (): string => {
    const salesCount = getSalesCountNumber()
    if (salesCount === null) {
      return '#0A369D' // Default color
    }

    // 0 sales: dark green
    if (salesCount === 0) {
      return '#38943e'
    }
    // 1 sale: light green
    if (salesCount === 1) {
      return '#9BC53D'
    }
    // 2 sales: yellow
    if (salesCount === 2) {
      return '#FAF33E'
    }
    // 3+ sales: red
    if (salesCount >= 3) {
      return '#B80C09'
    }
    return '#0A369D' // Default fallback
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
  const getCAGRColor = (): string => {
    const growthPercent = getCAGRNumber()
    if (growthPercent === null) {
      return '#0A369D' // Default color
    }

    // Negative growth: red
    if (growthPercent < 0) {
      return '#B80C09'
    }
    // 4.00001% and above: dark green
    if (growthPercent > 4.00001) {
      return '#38943e'
    }
    // 2.00001-4%: light green
    if (growthPercent >= 2.00001 && growthPercent <= 4) {
      return '#9BC53D'
    }
    // 0-2%: yellow
    return '#FAF33E'
  }

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
  const calculateTotalMarketMetricsScore = (): number | null => {
    const ppqmScore = calculatePPQMScore()
    const domScore = calculateDOMScore()
    const pgpyScore = calculatePGPYScore()
    const pctScore = calculatePCTScore()
    const nosScore = calculateNOSScore()

    // If any score is null, return null (can't calculate total)
    if (ppqmScore === null || domScore === null || pgpyScore === null || pctScore === null || nosScore === null) {
      return null
    }

    return ppqmScore + domScore + pgpyScore + pctScore + nosScore
  }

  // Calculate weights total as sum of all 8 preference scores
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

  // Calculate MS Totals = sum of all MS values
  const calculateMSTotals = (): number | null => {
    const bdrMS = calculateBDRMS()
    const btrMS = calculateBTRMS()
    const ptMS = calculatePTMS()
    const aMS = calculateAMS()
    const ggMS = calculateGGMS()
    const gdMS = calculateGDMS()
    const pkMS = calculatePKMS()
    const lMS = calculateLMS()

    // If any value is null, return null
    if (bdrMS === null || btrMS === null || ptMS === null || aMS === null || 
        ggMS === null || gdMS === null || pkMS === null || lMS === null) {
      return null
    }

    return bdrMS + btrMS + ptMS + aMS + ggMS + gdMS + pkMS + lMS
  }

  // Calculate Total score (custom criteria) = MS Totals * 5
  const calculateTotalScoreCustomCriteria = (): number | null => {
    const msTotals = calculateMSTotals()
    if (msTotals === null) {
      return null
    }
    return msTotals * 5
  }

  // Calculate Total score = Total score (custom criteria) + Total score (Market Metrics)
  const calculateTotalScore = (): number | null => {
    const customCriteriaScore = calculateTotalScoreCustomCriteria()
    const marketMetricsScore = calculateTotalMarketMetricsScore()

    if (customCriteriaScore === null || marketMetricsScore === null) {
      return null
    }

    return customCriteriaScore + marketMetricsScore
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

  // Get total score for the gauge
  const totalScore = calculateTotalScore()

  // Score Gauge rendered via portal to document.body to ensure fixed positioning
  const scoreGaugeElement = mounted && typeof window !== 'undefined' && totalScore !== null ? (
    createPortal(
      <div 
        style={{ 
          position: 'fixed', 
          zIndex: 9999, 
          right: '21rem', 
          top: '5.67rem',
          pointerEvents: 'auto'
        }}
      >
        <ScoreGauge 
          score={totalScore} 
          maxScore={999} 
          animated={true} 
        />
      </div>,
      document.body
    )
  ) : null

  return (
    <div className="min-h-screen bg-white" style={{ backgroundColor: '#FFFFFF' }}>
      <Navbar isScrolled={isScrolled} />
      {scoreGaugeElement}

      <div className="container mx-auto px-6 py-12">
        <div className="mx-auto" style={{ maxWidth: '1357px' }}>
          <h1 className="text-3xl font-bold" style={{ color: '#0A369D', marginLeft: '3%', marginTop: '5%', marginBottom: '0.84rem' }}>
            {propertyData.propertyAddress}
          </h1>
          <h2 className="text-lg mb-8" style={{ color: '#4472CA', marginLeft: '3%', fontSize: 'calc(1em * 0.88)' }}>
            {propertyData.houseFullPostcode || 'N/A'} | {propertyData.price} | {formatArea(propertyData.area)} | {propertyData.bedrooms} {String(propertyData.bedrooms) === '1' ? 'bedroom' : 'bedrooms'} | {propertyData.bathrooms} {String(propertyData.bathrooms) === '1' ? 'bathroom' : 'bathrooms'} | {propertyData.propertyType}
          </h2>
          <div className="flex mb-8 w-full" style={{ marginTop: 'calc(1rem + 5%)', gap: '1rem', marginLeft: '3%' }}>
            <div className="rounded-lg px-6 py-4 flex flex-col justify-center" style={{ backgroundColor: '#CFDEE7', borderRadius: '0.5rem', minHeight: '129.6px', flex: '0 0 17.97%', maxWidth: '17.97%', gap: '0.3rem' }}>
              <div className="text-sm" style={{ color: '#0A369D', marginBottom: '0.3rem' }}>Price/square metre</div>
              <div className="text-3xl font-black" style={{ color: getPricePerSqmColor(), fontWeight: '900', marginTop: '0.3rem', marginBottom: '0.3rem', fontSize: 'calc(1.875rem * 1.17)' }}>{calculatePricePerSqm()}</div>
              <div className="text-sm" style={{ color: '#0A369D', marginTop: '0.3rem' }}>{propertyData.propertyAddress}</div>
            </div>
            <div className="rounded-lg px-6 py-4 flex flex-col justify-center" style={{ backgroundColor: '#CFDEE7', borderRadius: '0.5rem', minHeight: '129.6px', flex: '0 0 17.97%', maxWidth: '17.97%', gap: '0.3rem' }}>
              <div className="text-sm" style={{ color: '#0A369D', marginBottom: '0.3rem' }}>Average Price/square metre</div>
              <div className="text-3xl font-black" style={{ color: '#0A369D', fontWeight: '900', marginTop: '0.3rem', marginBottom: '0.3rem', fontSize: 'calc(1.875rem * 1.17)' }}>{formatPricePerSqmValue(averagePricePerSqm)}</div>
              <div className="text-sm" style={{ color: '#0A369D', marginTop: '0.3rem' }}>For {propertyData.propertyType} in {propertyData.houseOutcode || 'N/A'} over past year</div>
            </div>
            <div className="rounded-lg px-6 py-4 flex flex-col justify-center" style={{ backgroundColor: '#CFDEE7', borderRadius: '0.5rem', minHeight: '129.6px', flex: '0 0 17.97%', maxWidth: '17.97%', gap: '0.3rem' }}>
              <div className="text-sm" style={{ color: '#0A369D', marginBottom: '0.3rem' }}>Average % growth/year</div>
              <div className="text-3xl font-black" style={{ color: getCAGRColor(), fontWeight: '900', marginTop: '0.3rem', marginBottom: '0.3rem', fontSize: 'calc(1.875rem * 1.17)' }}>{calculateCAGR()}</div>
              <div className="text-sm" style={{ color: '#0A369D', marginTop: '0.3rem' }}>{propertyData.propertyAddress}</div>
            </div>
            <div className="rounded-lg px-6 py-4 flex flex-col justify-center" style={{ backgroundColor: '#CFDEE7', borderRadius: '0.5rem', minHeight: '129.6px', flex: '0 0 17.97%', maxWidth: '17.97%', gap: '0.3rem' }}>
              <div className="text-sm" style={{ color: '#0A369D', marginBottom: '0.3rem', height: '1.25rem', lineHeight: '1.25rem', opacity: '0' }}>&nbsp;</div>
              <div className="text-3xl font-black" style={{ color: getDaysOnMarketColor(), fontWeight: '900', marginTop: 'calc(0.3rem + 0.5%)', marginBottom: '0.3rem', fontSize: 'calc(1.875rem * 1.17)' }}>{calculateDaysOnMarket()}</div>
              <div className="text-sm" style={{ color: '#0A369D', marginTop: '0.3rem' }}>Days on market</div>
            </div>
            <div className="rounded-lg px-6 py-4 flex flex-col justify-center" style={{ backgroundColor: '#CFDEE7', borderRadius: '0.5rem', minHeight: '129.6px', flex: '0 0 17.97%', maxWidth: '17.97%', gap: '0.3rem' }}>
              <div className="text-sm" style={{ color: '#0A369D', marginBottom: '0.3rem', minHeight: '1.25rem' }}>&nbsp;</div>
              <div className="text-3xl font-black" style={{ color: getSalesCountColor(), fontWeight: '900', marginTop: '0.3rem', marginBottom: '0.3rem', fontSize: 'calc(1.875rem * 1.17)' }}>{propertyData.salesCountPast12Months !== null ? propertyData.salesCountPast12Months : 'N/A'}</div>
              <div className="text-sm" style={{ color: '#0A369D', marginTop: '0.3rem' }}>Number of sales in {propertyData.houseFullPostcode || 'N/A'} over past year</div>
            </div>
          </div>
          <div className="rounded-lg px-6 py-4 mb-8 flex flex-col" style={{ backgroundColor: '#CFDEE7', borderRadius: '0.5rem', minHeight: '424.732896px', marginLeft: '3%', width: 'calc(5 * 17.97% + 4 * 1rem)', marginTop: '2rem', display: 'flex' }}>
            <h2 className="text-2xl font-bold" style={{ color: '#0A369D', marginLeft: '3.5%', marginTop: '2rem', paddingTop: '1rem', fontSize: 'calc(1.5rem * 1.04)' }}>Average sold price for {propertyData.propertyType} properties in {propertyData.houseOutcode || 'N/A'} over the past 5 years</h2>
            {averagePriceByYear && (() => {
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
              
              // Calculate CAGR (per year growth rate)
              let growthPerYear = '0'
              if (firstPrice > 0 && yearsSpan > 0) {
                const ratio = lastPrice / firstPrice
                const cagr = (Math.pow(ratio, 1 / yearsSpan) - 1) * 100
                growthPerYear = cagr.toFixed(1)
              }

              return (
                <ChartLineLabel
                  chartData={chartData}
                  propertyType={propertyData.propertyType}
                  outcode={propertyData.houseOutcode || 'N/A'}
                  growth={growthPerYear}
                  showHeading={false}
                  growthPeriodText="per year over the past 5 years"
                />
              )
            })()}
            {!averagePriceByYear && (
              <h2 className="text-2xl font-bold" style={{ color: '#0A369D', marginLeft: '3.5%', marginTop: 'auto', marginBottom: 'auto', fontSize: 'calc(1.5rem * 1.04)' }}>Property Price History</h2>
            )}
          </div>
          {priceHistory && priceHistory.length > 0 && averagePriceByYear && (() => {
            // Process price history data and add current price as 2025
            const currentPrice = parsePrice(propertyData.price)
            const priceHistoryChartData = priceHistory
              .map((item) => ({
                year: item.year,
                price: parsePrice(item.price) || 0,
              }))
              .filter((item) => item.price > 0)
              .sort((a, b) => a.year.localeCompare(b.year))

            // Add current price as 2025 if available and 2025 doesn't already exist
            if (currentPrice) {
              const has2025 = priceHistoryChartData.some((item) => item.year === '2025')
              if (!has2025) {
                priceHistoryChartData.push({
                  year: '2025',
                  price: Math.round(currentPrice),
                })
              } else {
                // Update existing 2025 entry with current price
                const index2025 = priceHistoryChartData.findIndex((item) => item.year === '2025')
                if (index2025 !== -1) {
                  priceHistoryChartData[index2025].price = Math.round(currentPrice)
                }
              }
            }

            const firstPrice = priceHistoryChartData[0]?.price || 0
            const lastPrice = priceHistoryChartData[priceHistoryChartData.length - 1]?.price || 0
            const priceHistoryGrowth = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice * 100).toFixed(1) : '0'

            const yearsSpan = priceHistoryChartData.length > 0 
              ? parseInt(priceHistoryChartData[priceHistoryChartData.length - 1].year) - parseInt(priceHistoryChartData[0].year)
              : 0
            const growthPeriodText = yearsSpan > 0 ? `over ${yearsSpan} years` : 'over time'

            return (
              <div className="rounded-lg px-6 py-4 mb-8 flex flex-col" style={{ backgroundColor: '#CFDEE7', borderRadius: '0.5rem', minHeight: '424.732896px', marginLeft: '3%', width: 'calc(5 * 17.97% + 4 * 1rem)', marginTop: '2rem', display: 'flex' }}>
                <h2 className="text-2xl font-bold" style={{ color: '#0A369D', marginLeft: '3.5%', marginTop: '2rem', paddingTop: '1rem', fontSize: 'calc(1.5rem * 1.04)' }}>Property Price History</h2>
                <ChartLineLabel
                  chartData={priceHistoryChartData}
                  propertyType={propertyData.propertyType}
                  outcode={propertyData.houseOutcode || 'N/A'}
                  growth={priceHistoryGrowth}
                  showHeading={false}
                  descriptionText={`Showing price history for ${propertyData.propertyAddress}`}
                  growthPeriodText={growthPeriodText}
                />
              </div>
            )
          })()}
          <div className="rounded-lg px-6 py-4 mb-8" style={{ backgroundColor: '#CFDEE7', borderRadius: '0.5rem', minHeight: '587.8656px', marginLeft: '3%', width: 'calc(5 * 17.97% + 4 * 1rem)', marginTop: '2rem', display: 'flex', flexDirection: 'column', paddingBottom: '2rem' }}>
            <h2 className="text-2xl font-bold" style={{ color: '#0A369D', marginLeft: '3.5%', marginTop: '2rem', paddingTop: '1rem', fontSize: 'calc(1.5rem * 1.04)' }}>Preferences</h2>
            
            {/* Strong Matches Section */}
            {strongMatches.length > 0 && (
              <div style={{ marginLeft: '3.5%', marginTop: '1.5rem', marginBottom: '1rem' }}>
                <h3 className="text-lg font-semibold" style={{ color: '#000000', marginBottom: '0.5rem' }}>Strong Matches</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {strongMatches.map((match, index) => {
                    let displayText = ''
                    if (match.label === 'Size') {
                      displayText = `Property size: ${match.propertyValue}`
                    } else if (match.label === 'Property Type') {
                      displayText = `Property Type: ${match.propertyValue}`
                    } else if (match.label === 'Bathrooms') {
                      displayText = `Property Number of Bathrooms: ${match.propertyValue}`
                    } else {
                      displayText = `Property: ${match.propertyValue}`
                    }
                    return (
                      <span
                        key={index}
                        style={{
                          backgroundColor: '#22c55e',
                          color: '#FFFFFF',
                          padding: '0.5rem 1rem',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}
                      >
                        {displayText}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Weak Matches Section */}
            {weakMatches.length > 0 && (
              <div style={{ marginLeft: '3.5%', marginTop: '1rem', marginBottom: '1rem' }}>
                <h3 className="text-lg font-semibold" style={{ color: '#000000', marginBottom: '0.5rem' }}>Weak Matches</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {weakMatches.map((match, index) => {
                    let displayText = ''
                    if (match.label === 'Size') {
                      displayText = `Property size: ${match.propertyValue}`
                    } else if (match.label === 'Property Type') {
                      displayText = `Property Type: ${match.propertyValue}`
                    } else if (match.label === 'Bathrooms') {
                      displayText = `Property Number of Bathrooms: ${match.propertyValue}`
                    } else {
                      displayText = `Property: ${match.propertyValue}`
                    }
                    return (
                      <span
                        key={index}
                        style={{
                          backgroundColor: '#ef4444',
                          color: '#FFFFFF',
                          padding: '0.5rem 1rem',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}
                      >
                        {displayText}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ width: '100%', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1rem', gap: '2rem' }}>
              <div style={{ flex: '1', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <ChartRadarPreferences
                  propertyData={{
                    bathrooms: propertyData.bathrooms,
                    bedrooms: propertyData.bedrooms,
                    propertyType: propertyData.propertyType,
                    area: propertyData.area,
                    garden: propertyData.garden,
                    parking: propertyData.parking,
                    garage: propertyData.garage,
                    location: propertyData.distance ? parseFloat(propertyData.distance) : null,
                  }}
                  preferenceScores={preferenceScores}
                />
              </div>
              <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '-17%' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  {preferenceCards.map((card, index) => (
                    <div
                      key={index}
                      style={{
                        backgroundColor: card.backgroundColor,
                        borderRadius: '0.5rem',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                    >
                      <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#000000' }}>
                        {card.label}
              </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <div style={{ flex: '1', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${card.matchPercentage}%`,
                              backgroundColor: card.progressColor,
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                        <div
                          style={{
                            backgroundColor: card.matchBubbleColor,
                            color: '#FFFFFF',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            minWidth: '3rem',
                            textAlign: 'center'
                          }}
                        >
                          {card.matchPercentage}%
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#000000' }}>
                          <strong>Actual:</strong> {formatPropertyValue(card.label, card.actual)}
                        </div>
                        {card.preferred && (
                          <div style={{ fontSize: '0.75rem', color: '#000000' }}>
                            <strong>Preferred:</strong> {formatUserValue(card.label, card.preferred)}
                          </div>
                        )}
                        <div style={{ fontSize: '0.75rem', color: '#000000', marginTop: '0.25rem' }}>
                          <strong>Importance:</strong> {card.importance}/100
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-lg px-6 py-4 mb-8" style={{ backgroundColor: '#CFDEE7', borderRadius: '0.5rem', minHeight: '653.184px', marginLeft: '3%', width: 'calc(5 * 17.97% + 4 * 1rem)', marginTop: '2rem', display: 'flex', flexDirection: 'column', paddingBottom: '2rem' }}>
            <NearbyAmenities amenities={transformNearbyPlaces()} />
          </div>
          <table className="w-full bg-white rounded-lg shadow-md overflow-hidden border border-gray-300" style={{ backgroundColor: '#FFFFFF', marginTop: '2rem' }}>
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Property Address</td>
                <td className="px-6 py-4" style={{ color: '#000000' }}>{propertyData.propertyAddress}</td>
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
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateTotalScore() !== null ? Math.round(calculateTotalScore()!) : 'N/A'}</td>
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
                <td className="px-6 py-4" style={{ color: '#000000' }}>{calculateTotalScoreCustomCriteria() !== null ? Math.round(calculateTotalScoreCustomCriteria()!) : 'N/A'}</td>
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
                  <th className="px-6 py-4 text-left font-semibold" style={{ color: '#000000' }}>Address</th>
                </tr>
              </thead>
              <tbody>
                {/* Schools */}
                {nearbyPlaces.schools?.length > 0 && nearbyPlaces.schools.map((place, index) => (
                  <tr key={`school-${index}`} className="border-b border-gray-300">
                    <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>School</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.name}</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.distance.toFixed(2)} km</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.address}</td>
                  </tr>
                ))}
                {/* Stations */}
                {nearbyPlaces.stations?.length > 0 && nearbyPlaces.stations.map((place, index) => (
                  <tr key={`station-${index}`} className="border-b border-gray-300">
                    <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Station</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.name}</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.distance.toFixed(2)} km</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.address}</td>
                  </tr>
                ))}
                {/* Parks */}
                {nearbyPlaces.parks?.length > 0 && nearbyPlaces.parks.map((place, index) => (
                  <tr key={`park-${index}`} className="border-b border-gray-300">
                    <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Park</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.name}</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.distance.toFixed(2)} km</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.address}</td>
                  </tr>
                ))}
                {/* Supermarkets */}
                {nearbyPlaces.supermarkets?.length > 0 && nearbyPlaces.supermarkets.map((place, index) => (
                  <tr key={`supermarket-${index}`} className="border-b border-gray-300">
                    <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Supermarket</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.name}</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.distance.toFixed(2)} km</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.address}</td>
                  </tr>
                ))}
                {/* Places of Worship */}
                {nearbyPlaces.placesOfWorship?.length > 0 && nearbyPlaces.placesOfWorship.map((place, index) => (
                  <tr key={`worship-${index}`} className="border-b border-gray-300">
                    <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Place of Worship</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.name}</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.distance.toFixed(2)} km</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.address}</td>
                  </tr>
                ))}
                {/* Gyms */}
                {nearbyPlaces.gyms?.length > 0 && nearbyPlaces.gyms.map((place, index) => (
                  <tr key={`gym-${index}`} className="border-b border-gray-300">
                    <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Gym</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.name}</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.distance.toFixed(2)} km</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.address}</td>
                  </tr>
                ))}
                {/* Hospitals */}
                {nearbyPlaces.hospitals?.length > 0 && nearbyPlaces.hospitals.map((place, index) => (
                  <tr key={`hospital-${index}`} className="border-b border-gray-300">
                    <td className="px-6 py-4 font-semibold" style={{ color: '#000000' }}>Hospital</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.name}</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.distance.toFixed(2)} km</td>
                    <td className="px-6 py-4" style={{ color: '#000000' }}>{place.address}</td>
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
      </div>
      
      <Footer />
    </div>
  )
}
