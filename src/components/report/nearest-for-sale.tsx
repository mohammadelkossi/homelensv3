import type { NearestForSaleListing } from "@/lib/use-supply-demand"
import { TABLE_COL_WIDTHS } from "./table-column-widths"

const DISPLAY_FONT = "var(--font-report-display)"

const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })
function money(value: number): string {
  return currency.format(value)
}
function formatDistance(km: number): string {
  const miles = km * 0.621371
  return `${miles.toFixed(1)} mi`
}
function formatBedsBaths(listing: NearestForSaleListing): string {
  const parts: string[] = []
  if (listing.bedrooms !== null) parts.push(`${listing.bedrooms} bed`)
  if (listing.bathrooms !== null) parts.push(`${listing.bathrooms} bath`)
  return parts.length > 0 ? parts.join(" · ") : "—"
}
function formatPricePerSqm(listing: NearestForSaleListing): string {
  if (!listing.areaSqm || listing.areaSqm <= 0) return "—"
  return `£${Math.round(listing.price / listing.areaSqm).toLocaleString()}`
}

export function NearestForSale({
  listings,
  propertyType,
  linkToListings = true,
}: {
  listings: NearestForSaleListing[]
  propertyType: string | null
  linkToListings?: boolean
}) {
  if (listings.length === 0) return null
  const typeLabel = propertyType && propertyType !== "N/A" ? propertyType.toLowerCase() : "property"

  return (
    <div style={{ fontFamily: "var(--font-report-body)", fontSize: 14 }}>
      <div className="font-semibold">{listings.length} closest for sale now</div>
      <p className="mt-1 mb-2" style={{ color: "#6B6B70" }}>
        Closest {typeLabel} listings currently on Rightmove.
      </p>
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
              {["Address", "Beds / baths", "£ / m²", "Price", "Distance"].map((heading, i) => (
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
            {listings.map((listing) => (
              <tr key={listing.id}>
                <td className="py-2.5 pr-3" style={{ borderBottom: "1px solid #E6E6E8" }}>
                  {linkToListings ? (
                    <a href={listing.url} target="_blank" rel="noopener noreferrer" style={{ color: "#0A369D" }}>
                      {listing.address}
                    </a>
                  ) : (
                    listing.address
                  )}
                </td>
                <td className="py-2.5 pr-3" style={{ borderBottom: "1px solid #E6E6E8" }}>{formatBedsBaths(listing)}</td>
                <td className="py-2.5 pr-3 text-right" style={{ borderBottom: "1px solid #E6E6E8" }}>{formatPricePerSqm(listing)}</td>
                <td className="py-2.5 pr-3 text-right font-semibold" style={{ borderBottom: "1px solid #E6E6E8" }}>{money(listing.price)}</td>
                <td className="py-2.5 text-right" style={{ borderBottom: "1px solid #E6E6E8" }}>{formatDistance(listing.distanceKm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2.5 text-[12px]" style={{ color: "#6B6B70" }}>
        Rightmove, current listings. Distance from this property.
      </p>
    </div>
  )
}
