import type { DistrictYearlyData } from "@/lib/district-comparison"

const SUBJECT_COLOR = "#0A369D"
const NEIGHBOUR_COLOR = "#D4D4D8"
const NEIGHBOUR_LABEL_COLOR = "#6B6B70"

const WIDTH = 900
const HEIGHT = 330
const PAD_LEFT = 56
const PAD_RIGHT = 150
const PAD_TOP = 24
const PAD_BOTTOM = 36

function moneyShort(value: number): string {
  return `£${Math.round(value / 1000)}k`
}

export function NeighbourChart({
  districts,
  subjectOutcode,
}: {
  districts: DistrictYearlyData[]
  subjectOutcode: string
}) {
  const years = [...new Set(districts.flatMap((d) => d.yearly.map((y) => y.year)))].sort((a, b) => a - b)
  if (years.length === 0) return null

  const allPrices = districts.flatMap((d) => d.yearly.map((y) => y.avgPrice))
  if (allPrices.length === 0) return null
  const minPrice = Math.min(...allPrices)
  const maxPrice = Math.max(...allPrices)
  const niceStep = Math.pow(10, Math.floor(Math.log10(Math.max(maxPrice - minPrice, 1) / 4)))
  const yMin = Math.floor((minPrice * 0.95) / niceStep) * niceStep
  const yMax = Math.ceil((maxPrice * 1.05) / niceStep) * niceStep

  const chartWidth = WIDTH - PAD_LEFT - PAD_RIGHT
  const chartHeight = HEIGHT - PAD_TOP - PAD_BOTTOM

  const xFor = (year: number) =>
    PAD_LEFT + (years.length === 1 ? 0 : ((year - years[0]) / (years[years.length - 1] - years[0])) * chartWidth)
  const yFor = (price: number) => PAD_TOP + chartHeight - ((price - yMin) / (yMax - yMin)) * chartHeight

  const gridLines = 4
  const gridValues = Array.from({ length: gridLines + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / gridLines)

  // Sort so the subject district's end-label doesn't collide with neighbours — draw subject last (on top).
  const ordered = [...districts].sort((a, b) =>
    a.outcode === subjectOutcode ? 1 : b.outcode === subjectOutcode ? -1 : 0
  )

  // End-of-line labels sit at each district's own latest price, so when two districts
  // land on similar prices (common for close neighbours) their labels can overlap. One
  // top-to-bottom declutter pass nudges later labels down just enough to clear the one
  // above, so they always stay legible instead of stacking on top of each other.
  const MIN_LABEL_GAP = 16
  const labelY = new Map<string, number>()
  const labelItems = ordered
    .map((d) => {
      const points = d.yearly.filter((y) => years.includes(y.year))
      if (points.length === 0) return null
      const last = points[points.length - 1]
      return { outcode: d.outcode, naturalY: yFor(last.avgPrice) }
    })
    .filter((item): item is { outcode: string; naturalY: number } => item !== null)
    .sort((a, b) => a.naturalY - b.naturalY)

  let previousY = -Infinity
  for (const item of labelItems) {
    const y = Math.max(item.naturalY, previousY + MIN_LABEL_GAP)
    labelY.set(item.outcode, y)
    previousY = y
  }
  const overflow = previousY - (HEIGHT - 10)
  if (overflow > 0) {
    for (const [outcode, y] of labelY) labelY.set(outcode, y - overflow)
  }

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" role="img" aria-label={`Average sold prices by year for ${subjectOutcode} and its neighbouring districts.`}>
      <g fontFamily="var(--font-report-body)" fontSize={12} fill={NEIGHBOUR_LABEL_COLOR}>
        {gridValues.map((value) => (
          <g key={value}>
            <line x1={PAD_LEFT} y1={yFor(value)} x2={PAD_LEFT + chartWidth} y2={yFor(value)} stroke="#EFEFF1" />
            <text x={0} y={yFor(value) + 4}>{moneyShort(value)}</text>
          </g>
        ))}
        {years.map((year) => (
          <text key={year} x={xFor(year)} y={HEIGHT - 8} textAnchor="middle">{year}</text>
        ))}
      </g>
      {ordered.map((district) => {
        const points = district.yearly.filter((y) => years.includes(y.year))
        if (points.length === 0) return null
        const isSubject = district.outcode === subjectOutcode
        const color = isSubject ? SUBJECT_COLOR : NEIGHBOUR_COLOR
        const path = points.map((p) => `${xFor(p.year)},${yFor(p.avgPrice)}`).join(" ")
        const last = points[points.length - 1]
        return (
          <g key={district.outcode}>
            <polyline
              points={path}
              fill="none"
              stroke={color}
              strokeWidth={isSubject ? 3 : 1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {points.map((p) => (
              <circle key={p.year} cx={xFor(p.year)} cy={yFor(p.avgPrice)} r={isSubject ? 4 : 3} fill={color} />
            ))}
            {(() => {
              const naturalY = yFor(last.avgPrice)
              const nudgedY = labelY.get(district.outcode) ?? naturalY
              const labelColor = isSubject ? SUBJECT_COLOR : NEIGHBOUR_LABEL_COLOR
              return (
                <>
                  {Math.abs(nudgedY - naturalY) > 2 && (
                    <line
                      x1={xFor(last.year) + 6}
                      y1={naturalY}
                      x2={xFor(last.year) + 14}
                      y2={nudgedY}
                      stroke={labelColor}
                      strokeWidth={1}
                      opacity={0.5}
                    />
                  )}
                  <text
                    x={xFor(last.year) + 16}
                    y={nudgedY + 4}
                    fontFamily="var(--font-report-body)"
                    fontSize={13}
                    fontWeight={isSubject ? 700 : 400}
                    fill={labelColor}
                  >
                    {district.outcode} · {moneyShort(last.avgPrice)}
                  </text>
                </>
              )
            })()}
          </g>
        )
      })}
    </svg>
  )
}
