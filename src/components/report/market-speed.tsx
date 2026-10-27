import type { DistrictSalesTrend, NearbySale } from "@/lib/district-comparison"
import { TABLE_COL_WIDTHS } from "./table-column-widths"
import { Locked } from "./locked"

const DISPLAY_FONT = "var(--font-report-display)"

const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })
function money(value: number): string {
  return currency.format(value)
}
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
}
// Approximates the original listing date from today minus the days-on-market count,
// since that's all this component is given — not the real listed-date string.
function formatFirstListedDate(daysOnMarket: number, asOf: Date): string {
  const date = new Date(asOf)
  date.setDate(date.getDate() - daysOnMarket)
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}
function formatDistance(km: number | null): string {
  if (km === null) return "—"
  const miles = km * 0.621371
  return `${miles.toFixed(1)} mi`
}
function formatPricePerSqm(price: number, areaSqm: number | null): string {
  if (!areaSqm || areaSqm <= 0) return "—"
  return `£${Math.round(price / areaSqm).toLocaleString()}`
}
// For a value that's already price-per-sqm (e.g. the subject property's own
// askingPrice / area, computed once in page.tsx), not a raw area to divide by.
function formatAlreadyComputedPricePerSqm(pricePerSqm: number | null): string {
  if (!pricePerSqm || pricePerSqm <= 0) return "—"
  return `£${Math.round(pricePerSqm).toLocaleString()}`
}

function Stat({ label, value, sub, caption }: { label: string; value: string; sub?: string; caption?: string }) {
  return (
    <div>
      <div className="text-[12px]" style={{ color: "#6B6B70" }}>
        {label}
      </div>
      <Locked>
        <div className="mt-1.5 text-[36px] sm:text-[44px]" style={{ fontFamily: DISPLAY_FONT, fontWeight: 300 }}>
          {value}
        </div>
        {sub ? <div className="mt-1 text-[12px]">{sub}</div> : null}
        {caption ? (
          <div className="text-[12px]" style={{ color: "#6B6B70" }}>
            {caption}
          </div>
        ) : null}
      </Locked>
    </div>
  )
}

export type MarketSpeedProps = {
  daysOnMarket: number | null
  salesTrend: DistrictSalesTrend | null
  outcode: string | null
  propertyType: string | null
  postcodeSalesCount: number | null
  postcode: string | null
  nearestSales: NearbySale[]
  askingPrice: number | null
  askingPricePerSqm: number | null
  // Rendered as a third tile alongside "On the market" and "sold in the past 12
  // months" — e.g. the Supply & demand widget, when trialling it in this row
  // instead of its own separate block below.
  extraContent?: React.ReactNode
  /** The date the report is as of (fixed for snapshots); defaults to now. */
  asOf?: Date
}

export function MarketSpeed({
  daysOnMarket,
  salesTrend,
  outcode,
  propertyType,
  postcodeSalesCount,
  postcode,
  nearestSales,
  askingPrice,
  askingPricePerSqm,
  extraContent,
  asOf,
}: MarketSpeedProps) {
  const typeLabel = propertyType ? propertyType.toLowerCase() : "property"

  return (
    <div style={{ fontFamily: "var(--font-report-body)", fontSize: 14 }}>
      <div className={`grid grid-cols-1 gap-6 ${extraContent ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {daysOnMarket !== null && (
          <Stat label="On the market" value={`${daysOnMarket} days`} caption={`First listed on ${formatFirstListedDate(daysOnMarket, asOf ?? new Date())}`} />
        )}
        {salesTrend && (
          <Stat
            label={`${propertyType ?? "Homes"} sold in ${outcode ?? "the district"}, past 12 months`}
            value={String(salesTrend.currentCount)}
            sub={
              salesTrend.changePercent !== null
                ? `${salesTrend.changePercent >= 0 ? "↑" : "↓"} ${Math.abs(Math.round(salesTrend.changePercent))}% vs the previous 12 months`
                : undefined
            }
            caption={postcodeSalesCount !== null ? `${postcode ?? "This postcode"} itself: ${postcodeSalesCount} sale${postcodeSalesCount === 1 ? "" : "s"} in the past year` : undefined}
          />
        )}
        {extraContent}
      </div>

      {nearestSales.length > 0 && (
        <div className="mt-10 pt-4 border-t" style={{ borderColor: "#0B0B0C" }}>
          <div className="font-semibold">5 most recent sales nearby</div>
          <p className="mt-1 mb-2" style={{ color: "#6B6B70" }}>
            Closest {typeLabel} sales in the last 2 years.
          </p>
          <Locked>
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse" style={{ fontSize: 13 }}>
              <colgroup>
                <col />
                <col style={{ width: TABLE_COL_WIDTHS.second }} />
                <col style={{ width: TABLE_COL_WIDTHS.pricePerSqm }} />
                <col style={{ width: TABLE_COL_WIDTHS.price }} />
                <col style={{ width: TABLE_COL_WIDTHS.distance }} />
              </colgroup>
              <thead>
                <tr>
                  {["Address", "Sold", "£ / m²", "Price", "Distance"].map((heading, i) => (
                    <th
                      key={heading}
                      className={i >= 2 ? "text-right" : "text-left"}
                      style={{
                        fontFamily: DISPLAY_FONT,
                        fontWeight: 500,
                        fontSize: 12,
                        color: "#6B6B70",
                        padding: "6px 12px 6px 0",
                        borderBottom: "1px solid #0B0B0C",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {askingPrice !== null && (
                  <tr style={{ color: "#0A369D", fontWeight: 600 }}>
                    <td className="py-2.5 pr-3" style={{ borderBottom: "1px solid #E6E6E8" }}>This home (asking)</td>
                    <td className="py-2.5 pr-3" style={{ borderBottom: "1px solid #E6E6E8" }}>Now</td>
                    <td className="py-2.5 pr-3 text-right" style={{ borderBottom: "1px solid #E6E6E8" }}>{formatAlreadyComputedPricePerSqm(askingPricePerSqm)}</td>
                    <td className="py-2.5 pr-3 text-right" style={{ borderBottom: "1px solid #E6E6E8" }}>{money(askingPrice)}</td>
                    <td className="py-2.5 text-right" style={{ borderBottom: "1px solid #E6E6E8" }}></td>
                  </tr>
                )}
                {nearestSales.map((sale) => (
                  <tr key={`${sale.postcode}-${sale.dateOfTransfer}-${sale.address}`}>
                    <td className="py-2.5 pr-3" style={{ borderBottom: "1px solid #E6E6E8" }}>
                      {sale.address}, {sale.postcode}
                    </td>
                    <td className="py-2.5 pr-3" style={{ borderBottom: "1px solid #E6E6E8" }}>{formatDate(sale.dateOfTransfer)}</td>
                    <td className="py-2.5 pr-3 text-right" style={{ borderBottom: "1px solid #E6E6E8" }}>{formatPricePerSqm(sale.price, sale.areaSqm)}</td>
                    <td className="py-2.5 pr-3 text-right font-semibold" style={{ borderBottom: "1px solid #E6E6E8" }}>{money(sale.price)}</td>
                    <td className="py-2.5 text-right" style={{ borderBottom: "1px solid #E6E6E8" }}>{formatDistance(sale.distanceKm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </Locked>
          <p className="mt-2.5 text-[12px] italic" style={{ color: "#6B6B70" }}>
            HM Land Registry sold prices. There&apos;s typically a lag of a few months before a completed
            sale appears in HM Land Registry data, so the most recent sales may not show here yet.
          </p>
        </div>
      )}
    </div>
  )
}
