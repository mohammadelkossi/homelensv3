"use client"

import { useEffect, useState } from "react"

interface ScoreGaugeProps {
  score: number
  maxScore?: number
  animated?: boolean
}

const COLORS = ["#CFDEE7", "#92B4F4", "#5E7CE2", "#4472CA", "#0A369D"]

export function ScoreGauge({ score, maxScore = 999, animated = true }: ScoreGaugeProps) {
  const [displayScore, setDisplayScore] = useState(animated ? 0 : score)

  const clampedScore = Math.max(0, Math.min(score, maxScore))
  const percentage = clampedScore / maxScore

  // Animate the score counting up
  useEffect(() => {
    if (!animated) {
      setDisplayScore(clampedScore)
      return
    }

    const duration = 1500
    const startTime = Date.now()
    const startValue = 0

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(startValue + (clampedScore - startValue) * eased)

      setDisplayScore(current)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [clampedScore, animated])

  // Calculate which segment the score falls into
  const getScoreLabel = () => {
    if (percentage < 0.2) return "Poor"
    if (percentage < 0.4) return "Fair"
    if (percentage < 0.6) return "Good"
    if (percentage < 0.8) return "Very Good"
    return "Excellent"
  }

  // Get the color for the current score
  const getScoreColor = () => {
    const index = Math.min(Math.floor(percentage * 5), 4)
    return COLORS[index]
  }

  const size = 280
  const strokeWidth = 24
  const radius = (size - strokeWidth) / 2
  const innerRadius = radius - strokeWidth / 2
  const outerRadius = radius + strokeWidth / 2
  const centerX = size / 2
  const centerY = size / 2

  const createWedge = (startAngle: number, endAngle: number) => {
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180

    // Outer arc points
    const outerX1 = centerX + outerRadius * Math.cos(startRad)
    const outerY1 = centerY + outerRadius * Math.sin(startRad)
    const outerX2 = centerX + outerRadius * Math.cos(endRad)
    const outerY2 = centerY + outerRadius * Math.sin(endRad)

    // Inner arc points
    const innerX1 = centerX + innerRadius * Math.cos(startRad)
    const innerY1 = centerY + innerRadius * Math.sin(startRad)
    const innerX2 = centerX + innerRadius * Math.cos(endRad)
    const innerY2 = centerY + innerRadius * Math.sin(endRad)

    const largeArc = endAngle - startAngle > 180 ? 1 : 0

    return `
      M ${outerX1} ${outerY1}
      A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerX2} ${outerY2}
      L ${innerX2} ${innerY2}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerX1} ${innerY1}
      Z
    `
  }

  // 5 segments spanning 180 degrees (from 180° to 360°/0°)
  const segmentAngle = 180 / 5
  const segments = COLORS.map((color, index) => {
    const startAngle = 180 + index * segmentAngle
    const endAngle = 180 + (index + 1) * segmentAngle
    return { color, startAngle, endAngle }
  })

  return (
    <div className="relative" style={{ width: size, height: size / 2 + 40 }}>
      <svg width={size} height={size / 2 + 40} viewBox={`0 0 ${size} ${size / 2 + 40}`} className="overflow-visible">
        {segments.map((segment, index) => (
          <path
            key={index}
            d={createWedge(segment.startAngle, segment.endAngle)}
            fill={segment.color}
            className="transition-opacity duration-300"
            style={{
              opacity: percentage * 5 > index ? 1 : 0.3,
            }}
          />
        ))}
      </svg>

      {/* Score display */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
        <span className="text-6xl font-bold tabular-nums" style={{ color: getScoreColor() }}>
          {displayScore}
        </span>
        <span className="text-sm text-muted-foreground mt-1">{getScoreLabel()}</span>
      </div>
    </div>
  )
}

