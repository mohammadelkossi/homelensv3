import { epcBandColor } from "@/lib/epc"
import { Locked } from "./locked"

type FactItem = {
  label: string
  value: string | null
}

export type ReportHeaderProps = {
  street: string
  town: string | null
  postcode: string | null
  rightmoveUrl: string | null
  askingPrice: string | null
  propertyType: string | null
  bedrooms: string | null
  bathrooms: string | null
  floorArea: string | null
  epcRating: string | null
  constructionAgeBand: string | null
  tenure: string | null
  /** Embedded preview (e.g. the homepage sample): tighter spacing and an h2, since the host page owns the h1. */
  compact?: boolean
  /** Blur the facts in a locked preview (they're the sample's, not this listing's). */
  lockFacts?: boolean
  /** Free preview: always show floor area, EPC, year built and tenure, blurred, even without data. */
  lockDetails?: boolean
  /** Free preview whose listing lacked part of the top row: blur asking, type, bedrooms and bathrooms. */
  lockSummary?: boolean
}

const DISPLAY_FONT = "var(--font-report-display)"
const BODY_FONT = "var(--font-report-body)"

function Fact({ label, value, chip, locked }: FactItem & { chip?: React.ReactNode; locked: boolean }) {
  return (
    <div>
      <div className="text-[12px]" style={{ color: "#6B6B70", fontFamily: BODY_FONT }}>
        {label}
      </div>
      {(() => {
        const fact = (
          <div
            className="mt-1.5 text-[22px] sm:text-[28px] lg:text-[30px]"
            style={{ fontFamily: DISPLAY_FONT, fontWeight: 300, letterSpacing: "-0.04em", lineHeight: 1, color: "#0B0B0C" }}
          >
            {value ?? "—"}
            {chip}
          </div>
        )
        return locked ? <Locked>{fact}</Locked> : fact
      })()}
    </div>
  )
}

export function ReportHeader({
  street,
  town,
  postcode,
  rightmoveUrl,
  askingPrice,
  propertyType,
  bedrooms,
  bathrooms,
  floorArea,
  epcRating,
  constructionAgeBand,
  tenure,
  compact = false,
  lockFacts = false,
  lockDetails = false,
  lockSummary = false,
}: ReportHeaderProps) {
  const Heading = compact ? "h2" : "h1"
  const chipColor = epcBandColor(epcRating)
  const addressLine = town ? `${street}, ${town}` : street

  return (
    <div
      className="w-full text-[#0B0B0C]"
      style={{ fontFamily: BODY_FONT, fontSize: 14, lineHeight: 1.5 }}
    >
      <section
        className={`grid grid-cols-12 gap-6 border-b border-[#0B0B0C] ${
          compact ? "pb-8" : "px-6 sm:px-12 pt-[93px] sm:pt-[130px] pb-[93px]"
        }`}
      >
        <div className="col-span-12 sm:col-span-3">
          <Locked>
          <p className="m-0 text-[13px]" style={{ color: "#6B6B70" }}>
            {postcode ?? "—"}
            <br />
            {rightmoveUrl ? (
              <a href={rightmoveUrl} target="_blank" rel="noreferrer" className="text-[#0A369D] no-underline hover:underline">
                View on Rightmove ↗
              </a>
            ) : null}
          </p>
          </Locked>
        </div>
        <div className="col-span-12 sm:col-span-9">
          {(() => {
            const heading = (
              <Heading
                className={compact ? "m-0 text-[32px] sm:text-[44px]" : "m-0 text-[40px] sm:text-[60px] lg:text-[84px]"}
                style={{ fontFamily: DISPLAY_FONT, fontWeight: 400, letterSpacing: "-0.045em", lineHeight: 0.95 }}
              >
                {lockDetails && !lockFacts && (
                  // Listings don't give the house number; the full report finds it from the EPC
                  // register. A blurred placeholder hints that it's there to unlock.
                  <span className="mr-[0.25em] inline-block select-none blur-[14px]" aria-hidden="true">
                    27,
                  </span>
                )}
                {addressLine}
              </Heading>
            )
            // In the fallback the address is the sample's, so it stays fully hidden.
            return lockFacts ? <Locked strong>{heading}</Locked> : heading
          })()}
          <div className={`grid grid-cols-2 sm:grid-cols-4 gap-x-6 ${compact ? "gap-y-8 mt-8" : "gap-y-[74px] mt-[93px]"}`}>
            <Fact locked={lockFacts || lockSummary} label="Asking" value={askingPrice} />
            <Fact locked={lockFacts || lockSummary} label="Type" value={propertyType} />
            <Fact locked={lockFacts || lockSummary} label="Bedrooms" value={bedrooms} />
            <Fact locked={lockFacts || lockSummary} label="Bathrooms" value={bathrooms} />
            <Fact locked={lockFacts || lockDetails} label="Floor area" value={floorArea} />
            {(epcRating || lockDetails) && (
              <Fact
                locked={lockFacts || lockDetails}
                label="EPC rating"
                value={epcRating}
                chip={
                  chipColor ? (
                    <span
                      className="inline-block align-middle ml-2"
                      style={{ width: 22, height: 8, backgroundColor: chipColor, verticalAlign: 3 }}
                    />
                  ) : null
                }
              />
            )}
            {(constructionAgeBand || lockDetails) && (
              <Fact locked={lockFacts || lockDetails} label="Estimated year built" value={constructionAgeBand} />
            )}
            {(tenure || lockDetails) && <Fact locked={lockFacts || lockDetails} label="Tenure" value={tenure} />}
          </div>
        </div>
      </section>
    </div>
  )
}
