"use client"

import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface ChartRadarPreferencesProps {
  propertyData: {
    bathrooms: string | null
    bedrooms: string | null
    propertyType: string | null
    area: string | null
    garden: string | null
    parking: string | null
    garage: string | null
    location: number | null // distance or location score
  }
  preferenceScores: {
    bathrooms: string | null
    bedrooms: string | null
    propertyType: string | null
    size: string | null
    garden: string | null
    parking: string | null
    garage: string | null
    location: string | null
  }
}

// Normalize property values to 0-100 scale
const normalizeValue = (value: any, type: string): number => {
  if (value === null || value === 'N/A' || value === 'null') return 0

  switch (type) {
    case 'bathrooms':
      const bathrooms = parseInt(value)
      if (isNaN(bathrooms)) return 0
      // Normalize 1-4+ to 0-100 (1=25, 2=50, 3=75, 4+=100)
      return Math.min(bathrooms * 25, 100)
    
    case 'bedrooms':
      const bedrooms = parseInt(value)
      if (isNaN(bedrooms)) return 0
      // Normalize 1-6+ to 0-100 (1=16.67, 2=33.33, 3=50, 4=66.67, 5=83.33, 6+=100)
      return Math.min((bedrooms / 6) * 100, 100)
    
    case 'propertyType':
      // Map property types to scores (categorical)
      const typeMap: Record<string, number> = {
        'Flat': 20,
        'Apartment': 20,
        'Terraced': 40,
        'Semi-Detached': 60,
        'Detached': 80,
        'Bungalow': 70,
        'Cottage': 75,
      }
      return typeMap[value as string] || 50
    
    case 'area':
      const area = parseFloat(value)
      if (isNaN(area)) return 0
      // Normalize area (assuming range 30-200 sqm, adjust as needed)
      // 30 sqm = 0, 200 sqm = 100
      return Math.min(Math.max(((area - 30) / 170) * 100, 0), 100)
    
    case 'garden':
    case 'parking':
    case 'garage':
      // Yes = 100, No = 0
      return value === 'Yes' ? 100 : 0
    
    case 'location':
      // If location is a distance, invert it (closer = higher score)
      // If it's already a score, use it directly
      if (typeof value === 'number') {
        // Assuming distance in miles, closer is better
        // 0 miles = 100, 10+ miles = 0
        return Math.max(100 - (value * 10), 0)
      }
      return 0
    
    default:
      return 0
  }
}

export function ChartRadarPreferences({ propertyData, preferenceScores }: ChartRadarPreferencesProps) {
  // Prepare chart data
  const chartData = [
    {
      category: "Bathrooms",
      property: normalizeValue(propertyData.bathrooms, 'bathrooms'),
    },
    {
      category: "Bedrooms",
      property: normalizeValue(propertyData.bedrooms, 'bedrooms'),
    },
    {
      category: "Property Type",
      property: normalizeValue(propertyData.propertyType, 'propertyType'),
    },
    {
      category: "Area",
      property: normalizeValue(propertyData.area, 'area'),
    },
    {
      category: "Garden",
      property: normalizeValue(propertyData.garden, 'garden'),
    },
    {
      category: "Parking",
      property: normalizeValue(propertyData.parking, 'parking'),
    },
    {
      category: "Garage",
      property: normalizeValue(propertyData.garage, 'garage'),
    },
    {
      category: "Location",
      property: normalizeValue(propertyData.location, 'location'),
    },
  ]

  const chartConfig = {
    property: {
      label: "Property Values",
      color: "#0A369D",
    },
  } satisfies ChartConfig

  return (
    <div className="w-full flex justify-center items-center mt-4" style={{ minHeight: '420px', transform: 'translateX(-5%)' }}>
      <ChartContainer
        config={chartConfig}
        className="w-full"
        style={{ width: '100%', maxWidth: '525px', height: '420px' }}
      >
        <RadarChart data={chartData} width={525} height={420} outerRadius={157.5}>
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="line" />}
          />
          <PolarAngleAxis dataKey="category" tick={{ fill: '#0A369D', fontSize: 12 }} />
          <PolarGrid radialLines={false} stroke="#92B4F4" />
          <Radar
            name="Property Values"
            dataKey="property"
            fill="#0A369D"
            fillOpacity={0.1}
            stroke="#0A369D"
            strokeWidth={2}
            dot={{ fill: "#0A369D", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </RadarChart>
      </ChartContainer>
    </div>
  )
}

