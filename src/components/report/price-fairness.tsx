import {
  districtValueGrowth,
  homeValueGrowth,
  recommendedOfferRange,
  sellersGain,
  type PricePoint,
} from "@/lib/pricing/recommended-offer";
import type { AiOffer } from "@/lib/key-points/offer";

const DISPLAY_FONT = "var(--font-report-display)";

const currency = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});
function money(value: number): string {
  return currency.format(value);
}
function moneyShort(value: number): string {
  if (Math.abs(value) >= 1000) return `£${Math.round(value / 1000)}k`;
  return currency.format(value);
}
function moneyPerSqm(value: number): string {
  return `£${Math.round(value).toLocaleString()}/m²`;
}

export type PriceFairnessProps = {
  askingPrice: number | null;
  districtAveragePrice: number | null;
  districtAverageYear: number | null;
  propertyType: string | null;
  outcode: string | null;
  pricePerSqm: number | null;
  districtPricePerSqm: number | null;
  daysOnMarket: number | null;
  recentSalesCount: number | null;
  lastSalePrice: number | null;
  lastSaleYear: number | null;
  priceHistorySales: PricePoint[];
  averagePriceByYear: Record<string, number> | null;
  /** The model's recommended offer (already sanity-checked). When absent, the rule-based offer is shown. */
  aiOffer?: AiOffer | null;
  /** The model's offer is still on its way: show a placeholder rather than a number that's about to change. */
  offerLoading?: boolean;
  // Shown in place of "Seller's gain at asking price" when there's no sale history to
  // calculate a gain from — otherwise that slot next to "Recommended offer" is just
  // dead white space. Passed in by the caller (e.g. the "How the asking price
  // compares" chart) rather than owned here, since it's unrelated to pricing itself.
  noGainFallback?: React.ReactNode;
};

function MoneyBarRow({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="py-1.5 border-b" style={{ borderColor: "#E6E6E8" }}>
      <div className="flex justify-between">
        <span>{label}</span>
        <span>{money(value)}</span>
      </div>
      <div
        className="mt-1.5 h-[3px] w-full"
        style={{ backgroundColor: "#E6E6E8" }}
      >
        <div
          className="h-full"
          style={{ width: `${percent}%`, backgroundColor: "#0A369D" }}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  caption,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  caption?: string;
  color?: string;
}) {
  return (
    <div>
      <div className="text-[12px]" style={{ color: "#6B6B70" }}>
        {label}
      </div>
      <div
        className="mt-1.5 text-[36px] sm:text-[40px]"
        style={{
          fontFamily: DISPLAY_FONT,
          fontWeight: 300,
          color: color ?? "#0B0B0C",
        }}
      >
        {value}
      </div>
      {sub ? <div className="mt-1 text-[12px]">{sub}</div> : null}
      {caption ? (
        <div className="text-[12px]" style={{ color: "#6B6B70" }}>
          {caption}
        </div>
      ) : null}
    </div>
  );
}

export function PriceFairness(props: PriceFairnessProps) {
  const {
    askingPrice,
    districtAveragePrice,
    districtAverageYear,
    propertyType,
    outcode,
    pricePerSqm,
    districtPricePerSqm,
    daysOnMarket,
    recentSalesCount,
    lastSalePrice,
    lastSaleYear,
    priceHistorySales,
    averagePriceByYear,
    noGainFallback,
    aiOffer = null,
    offerLoading = false,
  } = props;

  const premiumPercent =
    askingPrice !== null && districtAveragePrice
      ? ((askingPrice - districtAveragePrice) / districtAveragePrice) * 100
      : null;
  const gain = sellersGain(askingPrice, lastSalePrice);

  const percentBelow = (value: number) =>
    Math.round(((askingPrice! - value) / askingPrice!) * 100);
  const offer =
    askingPrice !== null && aiOffer
      ? {
          low: aiOffer.low,
          high: aiOffer.high,
          percentBelowLow: percentBelow(aiOffer.low),
          percentBelowHigh: percentBelow(aiOffer.high),
          openingOffer: aiOffer.opening,
          reasons: aiOffer.reasons,
        }
      : askingPrice !== null
        ? recommendedOfferRange({
            askingPrice,
            daysOnMarket,
            premiumOverDistrictPercent: premiumPercent,
            sellersGainPercent: gain?.percent ?? null,
            recentSalesCount,
          })
        : null;

  const sqmPremiumPercent =
    pricePerSqm !== null && districtPricePerSqm
      ? ((pricePerSqm - districtPricePerSqm) / districtPricePerSqm) * 100
      : null;

  const homeGrowth = homeValueGrowth(priceHistorySales);
  const districtGrowth = averagePriceByYear
    ? districtValueGrowth(averagePriceByYear)
    : null;

  return (
    <div style={{ fontFamily: "var(--font-report-body)", fontSize: 14 }}>
      {offer && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-10">
          {offerLoading ? (
            <div aria-live="polite">
              <div className="text-[12px]" style={{ color: "#6B6B70" }}>
                Recommended offer
              </div>
              <div
                className="mt-2 h-[48px] w-4/5 animate-pulse sm:h-[72px]"
                style={{ backgroundColor: "#EFEFF1" }}
              />
              <p className="mt-2.5 text-[15px]" style={{ color: "#6B6B70" }}>
                Working out a fair offer from local sales and market signals…
              </p>
            </div>
          ) : (
            <div>
              <div className="text-[12px]" style={{ color: "#6B6B70" }}>
                Recommended offer
              </div>
              <div
                className="mt-2 text-[48px] sm:text-[72px]"
                style={{
                  fontFamily: DISPLAY_FONT,
                  fontWeight: 300,
                  color: "#0A369D",
                  lineHeight: 1,
                }}
              >
                {moneyShort(offer.low)} – {moneyShort(offer.high)}
              </div>
              <p className="mt-2.5 text-[15px]">
                {offer.percentBelowHigh}–{offer.percentBelowLow}% below the{" "}
                {money(askingPrice!)} asking price. Suggested opening offer:{" "}
                <b>{money(offer.openingOffer)}</b>
              </p>
              {offer.reasons.length > 0 && (
                <>
                  <div
                    className="mt-5 text-[12px]"
                    style={{ color: "#6B6B70" }}
                  >
                    Why this range
                  </div>
                  <div>
                    {offer.reasons.map((reason) => (
                      <div
                        key={reason}
                        className="flex justify-between py-1.5 border-b"
                        style={{ borderColor: "#E6E6E8" }}
                      >
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <p className="mt-2.5 text-[12px]" style={{ color: "#6B6B70" }}>
                A guide based on local sales and market signals, not a formal
                valuation. Doesn&apos;t account for condition or improvements.
              </p>
            </div>
          )}

          {gain ? (
            <div>
              <div className="text-[12px]" style={{ color: "#6B6B70" }}>
                Seller&apos;s gain at asking price
              </div>
              <div
                className="mt-2 text-[48px] sm:text-[72px]"
                style={{
                  fontFamily: DISPLAY_FONT,
                  fontWeight: 300,
                  color: gain.amount >= 0 ? "#0B0B0C" : "#C2410C",
                  lineHeight: 1,
                }}
              >
                {gain.amount >= 0 ? "+" : ""}
                {moneyShort(gain.amount)}
              </div>
              <p className="mt-2.5 text-[15px]">
                <b>
                  {gain.percent >= 0 ? "+" : ""}
                  {Math.round(gain.percent)}%
                </b>
                {lastSaleYear ? ` since they bought in ${lastSaleYear}` : ""}
              </p>
              <div className="mt-5">
                {lastSaleYear &&
                  lastSalePrice !== null &&
                  askingPrice !== null && (
                    <MoneyBarRow
                      label={`Paid in ${lastSaleYear}`}
                      value={lastSalePrice}
                      max={Math.max(lastSalePrice, askingPrice)}
                    />
                  )}
                {askingPrice !== null && lastSalePrice !== null && (
                  <MoneyBarRow
                    label="Asking now"
                    value={askingPrice}
                    max={Math.max(lastSalePrice, askingPrice)}
                  />
                )}
              </div>
            </div>
          ) : (
            (noGainFallback ?? null)
          )}
        </div>
      )}

      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-10 pt-4 border-t"
        style={{ borderColor: "#0B0B0C" }}
      >
        {premiumPercent !== null && districtAveragePrice && (
          <Stat
            label={`Asking price vs ${outcode ?? "district"} average`}
            value={`${premiumPercent >= 0 ? "+" : ""}${Math.round(premiumPercent)}%`}
            color={premiumPercent > 0 ? "#C2410C" : undefined}
            sub={`${moneyShort(askingPrice!)} vs ${moneyShort(districtAveragePrice)}`}
            caption={`${outcode ?? "District"} ${propertyType ?? "property"} sales${districtAverageYear ? `, ${districtAverageYear}` : ""}`}
          />
        )}
        {sqmPremiumPercent !== null && districtPricePerSqm && (
          <Stat
            label={`Price per m² vs ${outcode ?? "district"} average`}
            value={`${sqmPremiumPercent >= 0 ? "+" : ""}${Math.round(sqmPremiumPercent)}%`}
            color={sqmPremiumPercent > 0 ? "#C2410C" : undefined}
            sub={`${moneyPerSqm(pricePerSqm!)} vs ${moneyPerSqm(districtPricePerSqm)}`}
            caption={`${outcode ?? "District"} ${propertyType ?? "property"} sales with a known floor area, last 12 months`}
          />
        )}
        {homeGrowth && (
          <Stat
            label="This home's value growth"
            value={`${homeGrowth.latest.ratePercent.toFixed(1)}% / yr`}
            sub={`Since its ${homeGrowth.latest.fromYear} sale`}
            caption={
              homeGrowth.previous
                ? `${homeGrowth.previous.ratePercent.toFixed(1)}% / yr from ${homeGrowth.previous.fromYear} to ${homeGrowth.previous.toYear}`
                : undefined
            }
          />
        )}
        {districtGrowth && (
          <Stat
            label={`${outcode ?? "District"} value growth`}
            value={`${districtGrowth.multiYearRatePercent.toFixed(1)}% / yr`}
            sub={`${propertyType ?? "Property"} sales, over the last ${districtGrowth.spanYears} years`}
            caption={
              districtGrowth.lastYearPercent !== null
                ? `${districtGrowth.lastYearPercent >= 0 ? "+" : ""}${districtGrowth.lastYearPercent.toFixed(1)}% in the last year`
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
