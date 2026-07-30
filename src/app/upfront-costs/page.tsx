"use client"

import { useMemo, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { calculateStampDuty, type BuyerType } from "@/lib/stamp-duty"
import { Calculator, Info } from "lucide-react"

function formatGbp(value: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(value)
}

function toNumber(value: string): number {
  const n = Number(value.replace(/,/g, ""))
  return Number.isFinite(n) ? n : 0
}

function FieldLabel({ htmlFor, label, help }: { htmlFor: string; label: string; help: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-gray-800">
        {label}
      </label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            tabIndex={-1}
            className="text-gray-400 hover:text-[#0A369D] transition-colors"
            aria-label={`What is ${label}?`}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{help}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
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
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar isScrolled />
      <main className="flex-1">
        <section className="border-b border-[#CFDEE7] bg-[#CFDEE7]/40">
          <div className="container mx-auto px-4 sm:px-6 py-12 md:py-16 max-w-3xl">
            <div className="flex items-center gap-3 mb-3">
              <Calculator className="h-8 w-8 text-[#0A369D]" />
              <p className="text-sm font-semibold uppercase tracking-wide text-[#4472CA]">
                Upfront costs
              </p>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#0A369D] mb-3">
              What will it cost to buy this home?
            </h1>
            <p className="text-base md:text-lg text-gray-700 max-w-2xl">
              Estimate the deposit, stamp duty, and fees you&apos;ll need before moving in.
            </p>
          </div>
        </section>

        <div className="container mx-auto px-4 sm:px-6 py-10 max-w-3xl space-y-8">
          <Card className="border-[#CFDEE7] shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-[#0A369D]">Your details</CardTitle>
              <CardDescription>Figures update as you type.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <TooltipProvider delayDuration={150}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <FieldLabel
                    htmlFor="house-price"
                    label="House price (£)"
                    help="The agreed purchase price of the property, before any fees or costs are added."
                  />
                  <Input
                    id="house-price"
                    inputMode="numeric"
                    value={housePrice}
                    onChange={(e) => setHousePrice(e.target.value)}
                    placeholder="350,000"
                  />
                </div>
                <div>
                  <FieldLabel
                    htmlFor="deposit-percent"
                    label="Deposit amount (%)"
                    help="The percentage of the house price you pay upfront in cash — the rest is covered by your mortgage. Most lenders require at least 5-10%."
                  />
                  <Input
                    id="deposit-percent"
                    inputMode="decimal"
                    value={depositPercent}
                    onChange={(e) => setDepositPercent(e.target.value)}
                    placeholder="10"
                  />
                </div>
                <div>
                  <FieldLabel
                    htmlFor="buyer-type"
                    label="Buyer type"
                    help="Determines which stamp duty rules apply: first-time buyers get relief up to £500,000, home movers replacing their main residence pay standard rates, and additional properties (kept alongside your current home) pay a 5% surcharge."
                  />
                  <select
                    id="buyer-type"
                    value={buyerType}
                    onChange={(e) => setBuyerType(e.target.value as BuyerType)}
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
                  >
                    <option value="first-time">First time buyer</option>
                    <option value="home-mover">Home mover (replacing main residence)</option>
                    <option value="additional">Additional property (keeping current home)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <FieldLabel
                    htmlFor="solicitor-fees"
                    label="Solicitor fees (£)"
                    help="Legal fees for conveyancing — searches, contracts, and registering the property in your name. Typically £800-£1,800."
                  />
                  <Input
                    id="solicitor-fees"
                    inputMode="numeric"
                    value={solicitorFees}
                    onChange={(e) => setSolicitorFees(e.target.value)}
                    placeholder="1,500"
                  />
                </div>
                <div>
                  <FieldLabel
                    htmlFor="survey-fees"
                    label="Survey fees (£)"
                    help="Cost of a property survey or valuation to check the property's condition and confirm it's worth what you're paying."
                  />
                  <Input
                    id="survey-fees"
                    inputMode="numeric"
                    value={surveyFees}
                    onChange={(e) => setSurveyFees(e.target.value)}
                    placeholder="500"
                  />
                </div>
                <div>
                  <FieldLabel
                    htmlFor="lender-fees"
                    label="Lender fees (£)"
                    help="Arrangement or product fees charged by your mortgage lender. Sometimes these can be added to the loan instead of paid upfront."
                  />
                  <Input
                    id="lender-fees"
                    inputMode="numeric"
                    value={lenderFees}
                    onChange={(e) => setLenderFees(e.target.value)}
                    placeholder="1,000"
                  />
                </div>
                <div>
                  <FieldLabel
                    htmlFor="broker-fees"
                    label="Broker fees (£)"
                    help="Fee charged by a mortgage broker for finding and arranging your mortgage, if you use one."
                  />
                  <Input
                    id="broker-fees"
                    inputMode="numeric"
                    value={brokerFees}
                    onChange={(e) => setBrokerFees(e.target.value)}
                    placeholder="400"
                  />
                </div>
                <div>
                  <FieldLabel
                    htmlFor="removal-fees"
                    label="Removal fees (£)"
                    help="Cost of moving your belongings to the new property — a removal company, van hire, or packing materials."
                  />
                  <Input
                    id="removal-fees"
                    inputMode="numeric"
                    value={removalFees}
                    onChange={(e) => setRemovalFees(e.target.value)}
                    placeholder="800"
                  />
                </div>
                <div>
                  <FieldLabel
                    htmlFor="renovation-fees"
                    label="Renovation/furniture fees (£)"
                    help="Budget for any immediate renovation work, or furniture and appliances needed before or after moving in."
                  />
                  <Input
                    id="renovation-fees"
                    inputMode="numeric"
                    value={renovationFees}
                    onChange={(e) => setRenovationFees(e.target.value)}
                    placeholder="2,000"
                  />
                </div>
              </div>
              </TooltipProvider>
            </CardContent>
          </Card>

          {hasResults && (
            <Card className="border-[#0A369D]/20 shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl text-[#0A369D]">Estimated upfront costs</CardTitle>
                <CardDescription>Cash you&apos;ll need on completion day</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-xl bg-[#0A369D] text-white px-6 py-5">
                  <p className="text-sm text-white/80 mb-1">Total cash needed upfront</p>
                  <p className="text-3xl md:text-4xl font-bold">{formatGbp(total)}</p>
                  <p className="text-xs text-white/70 mt-2">
                    House price {formatGbp(price)} · Deposit {formatGbp(deposit)} · Stamp duty {formatGbp(stampDuty)} · Fees{" "}
                    {formatGbp(feesTotal)}
                  </p>
                </div>

                <div className="space-y-4">
                  {costRows.map((row) => (
                    <div key={row.label} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                        <div>
                          <p className="font-semibold text-gray-900">{row.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5 max-w-md">{row.note}</p>
                        </div>
                        <p className="text-lg font-semibold text-[#0A369D] shrink-0">{formatGbp(row.value)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-500 leading-relaxed">
                  Estimates are indicative only. Stamp duty uses England &amp; Northern Ireland residential
                  rates. Scotland (LBTT) and Wales (LTT) use different bands and are not covered here.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
