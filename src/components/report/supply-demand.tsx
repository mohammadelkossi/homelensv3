import type { SupplyDemand as SupplyDemandData } from "@/lib/use-supply-demand"

const DISPLAY_FONT = "var(--font-report-display)"
const ACTIVE_COLOR = "#0A369D"
const INACTIVE_COLOR = "#D4D4D8"

const SEGMENTS: { label: SupplyDemandData["label"]; range: string }[] = [
  { label: "Seller's", range: "< 4 months" },
  { label: "Balanced", range: "4–6 months" },
  { label: "Buyer's", range: "> 6 months" },
]

export function SupplyDemand({
  data,
  propertyType,
  outcode,
}: {
  data: SupplyDemandData
  propertyType: string | null
  outcode: string | null
}) {
  const typeLabel = propertyType && propertyType !== "N/A" ? propertyType.toLowerCase() : "property"

  return (
    <div style={{ fontFamily: "var(--font-report-body)", fontSize: 14 }}>
      <div className="font-semibold">Supply & demand, {outcode ?? "this district"}</div>
      <div className="grid grid-cols-3 gap-1.5 mt-4">
        {SEGMENTS.map((segment) => {
          const active = segment.label === data.label
          return (
            <div key={segment.label}>
              <div className="h-2" style={{ backgroundColor: active ? ACTIVE_COLOR : INACTIVE_COLOR }} />
              <div
                className="mt-2 text-[13px]"
                style={{ fontFamily: DISPLAY_FONT, fontWeight: active ? 600 : 400, color: active ? ACTIVE_COLOR : "#0B0B0C" }}
              >
                {segment.label}
              </div>
              <div className="text-[12px]" style={{ color: "#6B6B70" }}>
                {segment.range}
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-[13px]">
        {data.forSaleCount} {data.widened ? "" : `${typeLabel} `}for sale now · about {Math.round(data.monthsOfSupply)} month
        {Math.round(data.monthsOfSupply) === 1 ? "" : "s"} of supply
      </p>
      <p className="mt-1.5 text-[12px]" style={{ color: "#6B6B70" }}>
        {data.widened
          ? `Too few recent ${typeLabel} sales to measure on their own, so this widens to all property types in ${outcode ?? "the district"}.`
          : `Current ${typeLabel} listings vs. sales over the past 12 months, HM Land Registry and Rightmove.`}
      </p>
    </div>
  )
}
