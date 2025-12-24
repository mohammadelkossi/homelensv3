"use client"

import { Bar, BarChart, XAxis, YAxis } from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface ChartBarPreferencesProps {
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

export function ChartBarPreferences({ preferenceScores }: ChartBarPreferencesProps) {
  // Prepare chart data with category labels
  const chartData = [
    { category: "Bathrooms", value: preferenceScores.bathrooms ? parseInt(preferenceScores.bathrooms) : 0 },
    { category: "Bedrooms", value: preferenceScores.bedrooms ? parseInt(preferenceScores.bedrooms) : 0 },
    { category: "Property Type", value: preferenceScores.propertyType ? parseInt(preferenceScores.propertyType) : 0 },
    { category: "Area", value: preferenceScores.size ? parseInt(preferenceScores.size) : 0 },
    { category: "Garden", value: preferenceScores.garden ? parseInt(preferenceScores.garden) : 0 },
    { category: "Parking", value: preferenceScores.parking ? parseInt(preferenceScores.parking) : 0 },
    { category: "Garage", value: preferenceScores.garage ? parseInt(preferenceScores.garage) : 0 },
    { category: "Location", value: preferenceScores.location ? parseInt(preferenceScores.location) : 0 },
  ]

  const chartConfig = {
    value: {
      label: "Preference Score",
      color: "#0A369D",
    },
  } satisfies ChartConfig

  return (
    <div className="w-full flex justify-center items-center mt-4" style={{ minHeight: '400px' }}>
      <ChartContainer config={chartConfig} style={{ width: '100%', maxWidth: '500px', height: '400px' }}>
        <BarChart
          accessibilityLayer
          data={chartData}
          layout="vertical"
          width={500}
          height={400}
          margin={{
            left: 20,
            right: 20,
            top: 20,
            bottom: 20,
          }}
        >
          <XAxis type="number" dataKey="value" domain={[0, 100]} tick={{ fill: '#0A369D', fontSize: 12 }} />
          <YAxis
            dataKey="category"
            type="category"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tick={{ fill: '#0A369D', fontSize: 12 }}
            width={120}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Bar dataKey="value" fill="#0A369D" radius={5} />
        </BarChart>
      </ChartContainer>
    </div>
  )
}


