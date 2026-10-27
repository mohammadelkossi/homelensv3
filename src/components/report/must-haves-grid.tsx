const DISPLAY_FONT = "var(--font-report-display)"
const BODY_FONT = "var(--font-report-body)"

export type MustHaveItem = {
  label: string
  value: boolean | null
}

function Tile({ label, value }: MustHaveItem) {
  const text = value === null ? "—" : value ? "Yes" : "No"
  const color = value === null ? "#6B6B70" : value ? "#15803D" : "#6B6B70"
  return (
    <div>
      <div className="text-[12px]" style={{ color: "#6B6B70", fontFamily: BODY_FONT }}>
        {label}
      </div>
      <div
        className="mt-1 text-[24px] sm:text-[28px]"
        style={{ fontFamily: DISPLAY_FONT, fontWeight: 300, color }}
      >
        {text}
      </div>
    </div>
  )
}

export function MustHavesGrid({ items }: { items: MustHaveItem[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-6" style={{ fontFamily: BODY_FONT }}>
      {items.map((item) => (
        <Tile key={item.label} {...item} />
      ))}
    </div>
  )
}
