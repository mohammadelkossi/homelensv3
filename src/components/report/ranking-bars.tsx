const SUBJECT_COLOR = "#B4530F"
const NEIGHBOUR_BAR_COLOR = "#C7CDD7"
const HIGHLIGHT_BAR_COLOR = "#0A369D"

function money(value: number): string {
  if (value >= 1000) return `£${Math.round(value / 1000)}k`
  return `£${Math.round(value)}`
}

export type RankingRow = { label: string; price: number; isSubjectDistrict?: boolean }

export function RankingBars({ rows, thisHomePrice }: { rows: RankingRow[]; thisHomePrice: number | null }) {
  const sorted = [...rows].sort((a, b) => b.price - a.price)
  const max = Math.max(...sorted.map((r) => r.price), thisHomePrice ?? 0)
  const barStart = 0.3 // bars visually "start" at 30% of max, like the reference, so differences are legible

  const widthPercent = (price: number) => barStart * 100 + ((price / max) * (1 - barStart)) * 100

  return (
    <div style={{ fontFamily: "var(--font-report-body)", fontSize: 13 }}>
      {sorted.map((row) => (
        <div key={row.label} className="grid items-center gap-3 py-2" style={{ gridTemplateColumns: "130px 1fr 70px" }}>
          <span className={row.isSubjectDistrict ? "font-semibold" : undefined} style={{ color: row.isSubjectDistrict ? "#0A369D" : undefined }}>
            {row.label}
          </span>
          <span className="h-2 block">
            <span
              className="block h-2"
              style={{ width: `${widthPercent(row.price)}%`, backgroundColor: row.isSubjectDistrict ? HIGHLIGHT_BAR_COLOR : NEIGHBOUR_BAR_COLOR }}
            />
          </span>
          <span className="text-right">{money(row.price)}</span>
        </div>
      ))}
      {thisHomePrice !== null && (
        <div className="grid items-center gap-3 py-2" style={{ gridTemplateColumns: "130px 1fr 70px", color: SUBJECT_COLOR, fontWeight: 600 }}>
          <span>This home</span>
          <span
            className="block h-0 border-t-2 border-dashed"
            style={{ width: `${widthPercent(thisHomePrice)}%`, borderColor: SUBJECT_COLOR }}
          />
          <span className="text-right">{money(thisHomePrice)}</span>
        </div>
      )}
    </div>
  )
}
