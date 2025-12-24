"use client"

import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts"

import { ChartConfig, ChartContainer } from "@/components/ui/chart"

interface ChartRadialTotalScoreProps {
  totalScore: number
}

export function ChartRadialTotalScore({ totalScore = 866 }: ChartRadialTotalScoreProps) {
  const chartData = [
    { score: totalScore, fill: "#0A369D" },
  ]

  const chartConfig = {
    score: {
      label: "Total Score",
      color: "#0A369D",
    },
  } satisfies ChartConfig

  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square"
      style={{ width: '260px', height: '260px' }}
    >
      <RadialBarChart
        data={chartData}
        startAngle={0}
        endAngle={250}
        innerRadius={104}
        outerRadius={143}
        barSize={39}
        width={260}
        height={260}
      >
        <PolarGrid
          gridType="circle"
          radialLines={false}
          stroke="none"
          className="first:fill-muted last:fill-background"
          polarRadius={[86, 74]}
        />
        <RadialBar dataKey="score" background cornerRadius={10} fill="#0A369D" />
        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
          <Label
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-foreground text-4xl font-bold"
                      style={{ fill: '#0A369D', fontSize: '2rem', fontWeight: 'bold' }}
                    >
                      {totalScore.toLocaleString()}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 24}
                      className="fill-muted-foreground"
                      style={{ fill: '#4472CA', fontSize: '0.875rem' }}
                    >
                      Total Score
                    </tspan>
                  </text>
                )
              }
            }}
          />
        </PolarRadiusAxis>
      </RadialBarChart>
    </ChartContainer>
  )
}

