"use client"

import { useMemo, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { TooltipProvider } from "@/components/ui/tooltip"
import { calculateStampDuty, type BuyerType } from "@/lib/stamp-duty"
import { interBody, interTight } from "@/app/results/report-fonts"
import {
  ToolIntro,
  ToolSectionLabel,
  ToolField,
  ToolSelect,
  ResultHeadline,
  ResultRow,
  INK,
  MUTED,
  BODY_FONT,
} from "@/components/tools/tool-ui"

function formatGbp(value: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value)
}

function toNumber(value: string): number {
  const n = Number(value.replace(/,/g, ""))
  return Number.isFinite(n) ? n : 0
}

export default function UpfrontCostsPage() {
  const [housePrice, setHousePrice] = useState("")
  const [depositPercent, setDepositPercent] = useState("10")
  const [buyerType, setBuyerType] = useState<BuyerType>("first-time")
  const [solicitorFees, setSolicitorFees] = useState("1500")
  const [surveyFees, setSurveyFees] = useState("")
  const [lenderFees, setLenderFees] = useState("")
  const [brokerFees, setBrokerFees] = useState("")
  const [removalFees, setRemovalFees] = useState("")
  const [renovationFees, setRenovationFees] = useState("")

  const price = toNumber(housePrice)
  const depositPct = toNumber(depositPercent)

  const { deposit, stampDuty, feesTotal, total } = useMemo(() => {
    const deposit = price > 0 ? (price * depositPct) / 100 : 0
    const stampDuty = calculateStampDuty(price, buyerType).total
    const fees = [solicitorFees, surveyFees, lenderFees, brokerFees, removalFees, renovationFees].reduce(
      (sum, fee) => sum + toNumber(fee),
      0
    )
    return { deposit, stampDuty, feesTotal: fees, total: deposit + stampDuty + fees }
  }, [price, depositPct, buyerType, solicitorFees, surveyFees, lenderFees, brokerFees, removalFees, renovationFees])

  const hasResults = price > 0

  const costRows = [
    { label: "Deposit", value: deposit, note: `${depositPct || 0}% of the purchase price` },
    {
      label: "Stamp duty",
      value: stampDuty,
      note:
        buyerType === "first-time"
          ? "First-time buyer relief applied where eligible"
          : buyerType === "additional"
            ? "Includes 5% additional property surcharge"
            : "Standard rates — no surcharge when replacing your main residence",
    },
    { label: "Solicitor fees", value: toNumber(solicitorFees), note: "Conveyancing and legal work" },
    { label: "Survey fees", value: toNumber(surveyFees), note: "Property survey or valuation" },
    { label: "Lender fees", value: toNumber(lenderFees), note: "Mortgage arrangement and valuation fees" },
    { label: "Broker fees", value: toNumber(brokerFees), note: "Mortgage broker fee" },
    { label: "Removal fees", value: toNumber(removalFees), note: "Moving costs and initial upkeep" },
    { label: "Renovation/furniture fees", value: toNumber(renovationFees), note: "Furnishing and any initial renovation work" },
  ]

  return (
    <div
      className={`min-h-screen bg-[#FBFAF7] flex flex-col ${interBody.variable} ${interTight.variable}`}
      style={{ color: INK, fontFamily: BODY_FONT }}
    >
      <Navbar isScrolled />
      <main className="flex-1">
        <ToolIntro
          label="Tools"
          title="What will it cost to buy this home?"
          subtitle="Estimate the deposit, stamp duty, and fees you'll need before moving in."
        />

        <div className="px-5 md:px-12 pb-16 space-y-10">
          <TooltipProvider delayDuration={150}>
            <div className="pt-8" style={{ borderTop: `1px solid ${INK}` }}>
              <ToolSectionLabel>Your details — figures update as you type</ToolSectionLabel>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <ToolField
                  id="house-price"
                  label="House price (£)"
                  help="The agreed purchase price of the property, before any fees or costs are added."
                  inputMode="numeric"
                  value={housePrice}
                  onChange={(e) => setHousePrice(e.target.value)}
                  placeholder="350,000"
                />
                <ToolField
                  id="deposit-percent"
                  label="Deposit amount (%)"
                  help="The percentage of the house price you pay upfront in cash — the rest is covered by your mortgage. Most lenders require at least 5-10%."
                  inputMode="decimal"
                  value={depositPercent}
                  onChange={(e) => setDepositPercent(e.target.value)}
                  placeholder="10"
                />
                <ToolSelect
                  id="buyer-type"
                  label="Buyer type"
                  help="Determines which stamp duty rules apply: first-time buyers get relief up to £500,000, home movers replacing their main residence pay standard rates, and additional properties (kept alongside your current home) pay a 5% surcharge."
                  value={buyerType}
                  onChange={(e) => setBuyerType(e.target.value as BuyerType)}
                >
                  <option value="first-time">First time buyer</option>
                  <option value="home-mover">Home mover (replacing main residence)</option>
                  <option value="additional">Additional property (keeping current home)</option>
                </ToolSelect>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-5">
                <ToolField
                  id="solicitor-fees"
                  label="Solicitor fees (£)"
                  help="Legal fees for conveyancing — searches, contracts, and registering the property in your name. Typically £800-£1,800."
                  inputMode="numeric"
                  value={solicitorFees}
                  onChange={(e) => setSolicitorFees(e.target.value)}
                  placeholder="1,500"
                />
                <ToolField
                  id="survey-fees"
                  label="Survey fees (£)"
                  help="Cost of a property survey or valuation to check the property's condition and confirm it's worth what you're paying."
                  inputMode="numeric"
                  value={surveyFees}
                  onChange={(e) => setSurveyFees(e.target.value)}
                  placeholder="500"
                />
                <ToolField
                  id="lender-fees"
                  label="Lender fees (£)"
                  help="Arrangement or product fees charged by your mortgage lender. Sometimes these can be added to the loan instead of paid upfront."
                  inputMode="numeric"
                  value={lenderFees}
                  onChange={(e) => setLenderFees(e.target.value)}
                  placeholder="1,000"
                />
                <ToolField
                  id="broker-fees"
                  label="Broker fees (£)"
                  help="Fee charged by a mortgage broker for finding and arranging your mortgage, if you use one."
                  inputMode="numeric"
                  value={brokerFees}
                  onChange={(e) => setBrokerFees(e.target.value)}
                  placeholder="400"
                />
                <ToolField
                  id="removal-fees"
                  label="Removal fees (£)"
                  help="Cost of moving your belongings to the new property — a removal company, van hire, or packing materials."
                  inputMode="numeric"
                  value={removalFees}
                  onChange={(e) => setRemovalFees(e.target.value)}
                  placeholder="800"
                />
                <ToolField
                  id="renovation-fees"
                  label="Renovation/furniture fees (£)"
                  help="Budget for any immediate renovation work, or furniture and appliances needed before or after moving in."
                  inputMode="numeric"
                  value={renovationFees}
                  onChange={(e) => setRenovationFees(e.target.value)}
                  placeholder="2,000"
                />
              </div>
            </div>
          </TooltipProvider>

          {hasResults && (
            <div className="pt-8" style={{ borderTop: `1px solid ${INK}` }}>
              <ResultHeadline
                label="Total cash needed upfront"
                value={formatGbp(total)}
                caption={`House price ${formatGbp(price)} · Deposit ${formatGbp(deposit)} · Stamp duty ${formatGbp(stampDuty)} · Fees ${formatGbp(feesTotal)}`}
              />

              <div className="mt-6">
                {costRows.map((row) => (
                  <ResultRow
                    key={row.label}
                    label={row.label}
                    note={row.note}
                    value={row.value}
                    max={total}
                    formatted={formatGbp(row.value)}
                  />
                ))}
              </div>

              <p className="text-[12px] mt-4 leading-relaxed" style={{ color: MUTED }}>
                Estimates are indicative only. Stamp duty uses England &amp; Northern Ireland residential
                rates. Scotland (LBTT) and Wales (LTT) use different bands and are not covered here.
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
