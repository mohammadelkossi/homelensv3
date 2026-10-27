"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import type { RunningCostBreakdown } from "@/lib/running-costs"
import { DEFAULT_MORTGAGE_RATE_PERCENT } from "@/lib/running-costs"
import {
  estimateMonthlyRent,
  normalizePropertyTypeForRent,
  type RentEstimate,
} from "@/lib/rent-estimate"
import { Loader2 } from "lucide-react"
import posthog from "posthog-js"
import { interBody, interTight } from "@/app/results/report-fonts"
import {
  ToolIntro,
  ToolSectionLabel,
  ToolField,
  ToolSelect,
  ToolButton,
  ToolToggle,
  ResultHeadline,
  ResultRow,
  INK,
  MUTED,
  WARN,
  BODY_FONT,
} from "@/components/tools/tool-ui"

type OutputMode = "buy" | "rent"

function formatGbp(value: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value)
}

export default function CalculatorPage() {
  const [outputMode, setOutputMode] = useState<OutputMode>("buy")
  const [purchasePrice, setPurchasePrice] = useState("")
  const [deposit, setDeposit] = useState("")
  const [mortgageRate, setMortgageRate] = useState(String(DEFAULT_MORTGAGE_RATE_PERCENT))
  const [repaymentYears, setRepaymentYears] = useState("25")
  const [bedrooms, setBedrooms] = useState("3")
  const [occupants, setOccupants] = useState("2")
  const [propertyType, setPropertyType] = useState("semi-detached")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<RunningCostBreakdown | null>(null)
  const [rentResult, setRentResult] = useState<RentEstimate | null>(null)

  async function handleCalculate() {
    const price = Number(purchasePrice.replace(/,/g, ""))
    const dep = Number(deposit.replace(/,/g, "") || 0)
    const rate = Number(mortgageRate)
    const term = Number(repaymentYears)
    const beds = Number(bedrooms)
    const people = Number(occupants)
    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a valid purchase price.")
      return
    }
    if (!Number.isFinite(dep) || dep < 0 || dep > price) {
      setError("Enter a valid deposit.")
      return
    }
    if (!Number.isFinite(rate) || rate < 0 || rate > 25) {
      setError("Enter a mortgage rate between 0% and 25%.")
      return
    }
    if (!Number.isFinite(term) || term < 1 || term > 40) {
      setError("Enter a repayment period between 1 and 40 years.")
      return
    }
    if (!Number.isFinite(beds) || beds < 1 || beds > 10) {
      setError("Select the number of bedrooms.")
      return
    }
    if (!Number.isFinite(people) || people < 1 || people > 12) {
      setError("Select how many people live in the property.")
      return
    }

    setLoading(true)
    setError("")
    setResult(null)
    setRentResult(null)

    try {
      const response = await fetch("/api/calculator/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchasePrice: price,
          deposit: dep,
          mortgageRatePercent: rate,
          termYears: term,
          bedrooms: beds,
          occupants: people,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Calculation failed")

      const rent = estimateMonthlyRent(
        price,
        normalizePropertyTypeForRent(propertyType),
        beds
      )

      setResult(data.breakdown)
      setRentResult(rent)
      posthog.capture("running_cost_calculated", {
        purchase_price: price,
        bedrooms: beds,
        occupants: people,
        property_type: propertyType,
        total_monthly: data.breakdown.totalMonthly,
        rent_estimate: rent.low,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Calculation failed")
    } finally {
      setLoading(false)
    }
  }

  const costRows = result
    ? [
        { label: "Mortgage", value: result.mortgage.monthly, note: result.mortgage.note },
        { label: "Council tax", value: result.councilTax.monthly, note: result.councilTax.note },
        { label: "Energy", value: result.energy.monthly, note: result.energy.note },
        { label: "Water & sewerage", value: result.water.monthly, note: result.water.note },
        { label: "Repairs & maintenance", value: result.repairs.monthly, note: result.repairs.note },
      ]
    : []

  const hasResults = result !== null && rentResult !== null

  const rentCostRows =
    hasResults && result
      ? [
          {
            label: "Rent",
            value: rentResult.low,
            note: "Lower estimate from purchase price, property type, and bedrooms.",
          },
          { label: "Council tax", value: result.councilTax.monthly, note: result.councilTax.note },
          { label: "Energy", value: result.energy.monthly, note: result.energy.note },
          { label: "Water & sewerage", value: result.water.monthly, note: result.water.note },
        ]
      : []

  return (
    <div
      className={`min-h-screen bg-[#FBFAF7] flex flex-col ${interBody.variable} ${interTight.variable}`}
      style={{ color: INK, fontFamily: BODY_FONT }}
    >
      <Navbar isScrolled />
      <main className="flex-1">
        <ToolIntro
          label="Tools"
          title="What will this home really cost each month?"
          subtitle="Enter your details once, then switch between buying costs and estimated rent."
        />

        <div className="px-5 md:px-12 pb-16 space-y-10">
          <div className="pt-8" style={{ borderTop: `1px solid ${INK}` }}>
            <ToolSectionLabel>Your details — figures update once you calculate</ToolSectionLabel>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <ToolField
                id="purchase-price"
                label="Purchase price (£)"
                inputMode="numeric"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="350,000"
              />
              <ToolField
                id="deposit"
                label="Deposit (£)"
                inputMode="numeric"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                placeholder="35,000"
              />
              <ToolField
                id="mortgage-rate"
                label="Mortgage rate (%)"
                inputMode="decimal"
                value={mortgageRate}
                onChange={(e) => setMortgageRate(e.target.value)}
                placeholder="5"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
              <ToolField
                id="repayment-years"
                label="Repayment period (years)"
                inputMode="numeric"
                value={repaymentYears}
                onChange={(e) => setRepaymentYears(e.target.value)}
                placeholder="25"
              />
              <ToolSelect
                id="property-type"
                label="Property type"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
              >
                <option value="flat">Flat / apartment</option>
                <option value="terraced">Terraced</option>
                <option value="semi-detached">Semi-detached</option>
                <option value="detached">Detached</option>
              </ToolSelect>
              <ToolSelect
                id="bedrooms"
                label="Number of bedrooms"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "bedroom" : "bedrooms"}
                  </option>
                ))}
              </ToolSelect>
              <div>
                <ToolSelect
                  id="occupants"
                  label="People living in the property"
                  value={occupants}
                  onChange={(e) => setOccupants(e.target.value)}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "person" : "people"}
                    </option>
                  ))}
                </ToolSelect>
                <p className="text-[12px] mt-1.5" style={{ color: MUTED }}>
                  Used for energy and water estimates
                </p>
              </div>
            </div>

            {error && (
              <p className="text-[14px] mt-5" style={{ color: WARN, fontFamily: BODY_FONT }}>
                {error}
              </p>
            )}

            <div className="mt-6">
              <ToolButton onClick={() => void handleCalculate()} disabled={loading}>
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Calculating…
                  </span>
                ) : (
                  "Calculate"
                )}
              </ToolButton>
            </div>
          </div>

          {hasResults && result && rentResult && (
            <div className="pt-8" style={{ borderTop: `1px solid ${INK}` }}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 mb-6">
                <ResultHeadline
                  label={outputMode === "buy" ? "Estimated monthly running costs" : "Estimated monthly renting costs"}
                  value={
                    outputMode === "buy"
                      ? `${formatGbp(result.totalMonthly)}/mo`
                      : `${formatGbp(
                          Math.round(
                            (rentResult.low + result.councilTax.monthly + result.energy.monthly + result.water.monthly) * 100
                          ) / 100
                        )}/mo`
                  }
                  caption={
                    outputMode === "buy"
                      ? `Purchase price ${formatGbp(result.purchasePrice)}${result.deposit > 0 ? ` · Deposit ${formatGbp(result.deposit)}` : ""} · ${result.mortgage.ratePercent}% over ${result.mortgage.termYears ?? 25} years`
                      : "Rent plus council tax, energy, and water."
                  }
                />
                <ToolToggle
                  label="Output mode"
                  value={outputMode}
                  onChange={setOutputMode}
                  options={[
                    { value: "buy", label: "Buy" },
                    { value: "rent", label: "Rent" },
                  ]}
                />
              </div>

              {outputMode === "buy" ? (
                <>
                  <div>
                    {costRows.map((row) => (
                      <ResultRow
                        key={row.label}
                        label={row.label}
                        note={row.note}
                        value={row.value}
                        max={result.totalMonthly}
                        formatted={`${formatGbp(row.value)}/mo`}
                      />
                    ))}
                  </div>
                  <p className="text-[12px] mt-4 leading-relaxed" style={{ color: MUTED }}>
                    Estimates are indicative only. Council tax uses a UK Band D average. Energy and
                    water are estimated from UK averages using bedrooms and occupancy.
                  </p>
                </>
              ) : (
                <>
                  <div>
                    {rentCostRows.map((row) => (
                      <ResultRow
                        key={row.label}
                        label={row.label}
                        note={row.note}
                        value={row.value}
                        max={rentCostRows.reduce((sum, r) => sum + r.value, 0)}
                        formatted={`${formatGbp(row.value)}/mo`}
                      />
                    ))}
                  </div>
                  <p className="text-[12px] mt-4 leading-relaxed" style={{ color: MUTED }}>
                    Estimates are indicative only. Council tax, energy, and water use the same
                    figures as the buy side. Rent is modelled from purchase price with adjustments
                    for property type and bedrooms.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
