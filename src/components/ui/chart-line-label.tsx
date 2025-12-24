"use client"

import { TrendingUp } from "lucide-react"
import { CartesianGrid, LabelList, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface ChartLineLabelProps {
  chartData: Array<{ year: string; price: number }>
  propertyType: string
  outcode: string
  growth: string
  showHeading?: boolean
  headingText?: string
  descriptionText?: string
  growthPeriodText?: string
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const formatCurrencyCompact = (value: number): string => {
  if (value >= 1000000) return `£${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `£${(value / 1000).toFixed(0)}k`;
  return `£${value.toLocaleString()}`;
}

export function ChartLineLabel({ chartData, propertyType, outcode, growth, showHeading = true, headingText = 'Property Price History', descriptionText, growthPeriodText = 'over 5 years' }: ChartLineLabelProps) {
  const chartConfig = {
    price: {
      label: "Average Price",
      color: "#0A369D",
    },
  } satisfies ChartConfig

  return (
    <div className="flex-1 flex flex-col" style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
      <ChartContainer config={chartConfig} className="flex-1" style={{ height: '196px', minHeight: '196px', maxHeight: '196px' }}>
        <LineChart
          accessibilityLayer
          data={chartData}
          margin={{
            top: 20,
            left: 12,
            right: 50,
            bottom: 8,
          }}
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#92B4F4" />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 10, fill: '#0A369D' }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={2}
            tick={{ fontSize: 10, fill: '#0A369D' }}
            tickFormatter={(value) => formatCurrencyCompact(Number(value))}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent 
              hideLabel
              formatter={(value) => formatCurrency(Number(value))}
            />}
          />
          <Line
            dataKey="price"
            type="natural"
            stroke="var(--color-price)"
            strokeWidth={2}
            dot={{
              fill: "var(--color-price)",
            }}
            activeDot={{
              r: 6,
            }}
          >
            <LabelList
              position="top"
              offset={12}
              className="fill-foreground"
              fontSize={12}
              formatter={(value: number) => formatCurrencyCompact(value)}
              style={{ fill: '#0A369D' }}
            />
          </Line>
        </LineChart>
      </ChartContainer>
      <div className="flex flex-col items-start gap-1 text-xs mt-2">
        <div className="flex gap-2 leading-none font-medium" style={{ color: '#0A369D' }}>
          {parseFloat(growth) >= 0 ? 'Trending up' : 'Trending down'} by {Math.abs(parseFloat(growth))}% {growthPeriodText} <TrendingUp className="h-3 w-3" />
        </div>
        <div className="text-muted-foreground leading-none" style={{ color: '#4472CA', fontSize: '0.75rem' }}>
          {descriptionText || `Showing average sold prices for ${propertyType} properties in ${outcode}`}
        </div>
      </div>
      {showHeading && (
        <h2 className="text-2xl font-bold" style={{ color: '#0A369D', marginLeft: '3.5%', marginTop: '2rem', fontSize: 'calc(1.5rem * 1.04)' }}>{headingText}</h2>
      )}
    </div>
  )
}

