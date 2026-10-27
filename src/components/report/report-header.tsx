import { epcBandColor } from "@/lib/epc"

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
}

const DISPLAY_FONT = "var(--font-report-display)"
const BODY_FONT = "var(--font-report-body)"

function Fact({ label, value, chip }: FactItem & { chip?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[12px]" style={{ color: "#6B6B70", fontFamily: BODY_FONT }}>
        {label}
      </div>
      <div
        className="mt-1.5 text-[22px] sm:text-[28px] lg:text-[30px]"
        style={{ fontFamily: DISPLAY_FONT, fontWeight: 300, letterSpacing: "-0.04em", lineHeight: 1, color: "#0B0B0C" }}
      >
        {value ?? "—"}
        {chip}
      </div>
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
          <p className="m-0 text-[13px]" style={{ color: "#6B6B70" }}>
            {postcode ?? "—"}
            <br />
            {rightmoveUrl ? (
              <a href={rightmoveUrl} target="_blank" rel="noreferrer" className="text-[#0A369D] no-underline hover:underline">
                View on Rightmove ↗
              </a>
            ) : null}
          </p>
        </div>
        <div className="col-span-12 sm:col-span-9">
          <Heading
            className={compact ? "m-0 text-[32px] sm:text-[44px]" : "m-0 text-[40px] sm:text-[60px] lg:text-[84px]"}
            style={{ fontFamily: DISPLAY_FONT, fontWeight: 400, letterSpacing: "-0.045em", lineHeight: 0.95 }}
          >
            {addressLine}
          </Heading>
          <div className={`grid grid-cols-2 sm:grid-cols-4 gap-x-6 ${compact ? "gap-y-8 mt-8" : "gap-y-[74px] mt-[93px]"}`}>
            <Fact label="Asking" value={askingPrice} />
            <Fact label="Type" value={propertyType} />
            <Fact label="Bedrooms" value={bedrooms} />
            <Fact label="Bathrooms" value={bathrooms} />
            <Fact label="Floor area" value={floorArea} />
            {epcRating && (
              <Fact
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
            {constructionAgeBand && <Fact label="Estimated year built" value={constructionAgeBand} />}
            {tenure && <Fact label="Tenure" value={tenure} />}
          </div>
        </div>
      </section>
    </div>
  )
}
