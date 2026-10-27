import type { PricePoint } from "@/lib/pricing/recommended-offer"

const SOLD_COLOR = "#0A369D"
const LABEL_COLOR = "#6B6B70"

const WIDTH = 460
const HEIGHT = 230
const PAD_LEFT = 40
const PAD_RIGHT = 55
const PAD_TOP = 28
const PAD_BOTTOM = 22
const EDGE_ZONE = 45

function moneyShort(value: number): string {
  return `£${Math.round(value / 1000)}k`
}

export type HomePriceHistoryChartProps = {
  /** Past sales only (not the asking price), sorted or not. */
  sales: PricePoint[]
  askingPrice: number
  askingYear: number
}

export function HomePriceHistoryChart({ sales, askingPrice, askingYear }: HomePriceHistoryChartProps) {
  const sorted = [...sales].sort((a, b) => a.year - b.year)
  const allPoints = [...sorted, { price: askingPrice, year: askingYear }]
  if (allPoints.length < 2) return null

  const allPrices = allPoints.map((p) => p.price)
  const minPrice = Math.min(...allPrices)
  const maxPrice = Math.max(...allPrices)
  const yMin = minPrice * 0.9
  const yMax = maxPrice * 1.1

  const minYear = allPoints[0].year
  const maxYear = allPoints[allPoints.length - 1].year
  const chartWidth = WIDTH - PAD_LEFT - PAD_RIGHT
  const chartHeight = HEIGHT - PAD_TOP - PAD_BOTTOM

  const xFor = (year: number) => PAD_LEFT + (maxYear === minYear ? 0 : ((year - minYear) / (maxYear - minYear)) * chartWidth)
  const yFor = (price: number) => PAD_TOP + chartHeight - ((price - yMin) / (yMax - yMin)) * chartHeight
  // Points near either edge anchor outward so labels never clip the viewBox.
  const anchorFor = (x: number): "start" | "middle" | "end" =>
    x < PAD_LEFT + EDGE_ZONE ? "start" : x > WIDTH - PAD_RIGHT - EDGE_ZONE ? "end" : "middle"

  const gridValues = Array.from({ length: 5 }, (_, i) => yMin + ((yMax - yMin) * i) / 4)
  const yearTicks = [...new Set(allPoints.map((p) => p.year))]

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      role="img"
      aria-label={`Sale history leading up to an asking price of ${moneyShort(askingPrice)} in ${askingYear}.`}
    >
      <g fontFamily="var(--font-report-body)" fontSize={11} fill={LABEL_COLOR}>
        {gridValues.map((value) => (
          <g key={value}>
            <line x1={PAD_LEFT} y1={yFor(value)} x2={WIDTH - PAD_RIGHT} y2={yFor(value)} stroke="#EFEFF1" />
            <text x={0} y={yFor(value) + 4}>{moneyShort(value)}</text>
          </g>
        ))}
        {yearTicks.map((year) => (
          <text key={year} x={xFor(year)} y={HEIGHT - 4} textAnchor={anchorFor(xFor(year))}>{year}</text>
        ))}
      </g>

      {sorted.map((point, i) => {
        if (i === 0) return null
        const prev = sorted[i - 1]
        return (
          <line
            key={`sold-${point.year}`}
            x1={xFor(prev.year)}
            y1={yFor(prev.price)}
            x2={xFor(point.year)}
            y2={yFor(point.price)}
            stroke={SOLD_COLOR}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        )
      })}
      {sorted.length > 0 && (
        <line
          x1={xFor(sorted[sorted.length - 1].year)}
          y1={yFor(sorted[sorted.length - 1].price)}
          x2={xFor(askingYear)}
          y2={yFor(askingPrice)}
          stroke={SOLD_COLOR}
          strokeWidth={2}
          strokeDasharray="5 5"
          strokeLinecap="round"
        />
      )}
      {sorted.map((point) => (
        <circle key={point.year} cx={xFor(point.year)} cy={yFor(point.price)} r={4.5} fill={SOLD_COLOR} />
      ))}
      <circle cx={xFor(askingYear)} cy={yFor(askingPrice)} r={5.5} fill="#FFFFFF" stroke={SOLD_COLOR} strokeWidth={2.5} />

      <g fontFamily="var(--font-report-body)" fontSize={12} fontWeight={600} fill="#0B0B0C">
        {sorted.map((point) => (
          <text key={point.year} x={xFor(point.year)} y={yFor(point.price) - 10} textAnchor={anchorFor(xFor(point.year))}>
            {moneyShort(point.price)}
          </text>
        ))}
        <text x={xFor(askingYear)} y={yFor(askingPrice) - 10} textAnchor={anchorFor(xFor(askingYear))}>
          Asking {moneyShort(askingPrice)}
        </text>
      </g>
    </svg>
  )
}
