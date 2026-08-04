"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { RunningCostBreakdown } from "@/lib/running-costs"
import { DEFAULT_MORTGAGE_RATE_PERCENT } from "@/lib/running-costs"
import {
  estimateMonthlyRent,
  normalizePropertyTypeForRent,
  type RentEstimate,
} from "@/lib/rent-estimate"
import { Calculator, Loader2 } from "lucide-react"
import posthog from "posthog-js"

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

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar isScrolled />
      <main className="flex-1">
        <section className="border-b border-[#CFDEE7] bg-[#CFDEE7]/40">
          <div className="container mx-auto px-4 sm:px-6 py-12 md:py-16 max-w-3xl">
            <div className="flex items-center gap-3 mb-3">
              <Calculator className="h-8 w-8 text-[#0A369D]" />
              <p className="text-sm font-semibold uppercase tracking-wide text-[#4472CA]">
                Property cost calculator
              </p>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#0A369D] mb-3">
              What will this home really cost each month?
            </h1>
            <p className="text-base md:text-lg text-gray-700 max-w-2xl">
              Enter your details once, then switch between buying costs and estimated rent.
            </p>
          </div>
        </section>

        <div className="container mx-auto px-4 sm:px-6 py-10 max-w-3xl space-y-8">
          <Card className="border-[#CFDEE7] shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-[#0A369D]">Your details</CardTitle>
              <CardDescription>
                Same inputs for both buy and rent. Estimates use UK averages for bills.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="purchase-price" className="text-sm font-medium text-gray-800 mb-1.5 block">
                    Purchase price (£)
                  </label>
                  <Input
                    id="purchase-price"
                    inputMode="numeric"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    placeholder="350,000"
                  />
                </div>
                <div>
                  <label htmlFor="deposit" className="text-sm font-medium text-gray-800 mb-1.5 block">
                    Deposit (£)
                  </label>
                  <Input
                    id="deposit"
                    inputMode="numeric"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                    placeholder="35,000"
                  />
                </div>
                <div>
                  <label htmlFor="mortgage-rate" className="text-sm font-medium text-gray-800 mb-1.5 block">
                    Mortgage rate (%)
                  </label>
                  <Input
                    id="mortgage-rate"
                    inputMode="decimal"
                    value={mortgageRate}
                    onChange={(e) => setMortgageRate(e.target.value)}
                    placeholder="5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="repayment-years" className="text-sm font-medium text-gray-800 mb-1.5 block">
                    Repayment period (years)
                  </label>
                  <Input
                    id="repayment-years"
                    inputMode="numeric"
                    value={repaymentYears}
                    onChange={(e) => setRepaymentYears(e.target.value)}
                    placeholder="25"
                  />
                </div>
                <div>
                  <label htmlFor="property-type" className="text-sm font-medium text-gray-800 mb-1.5 block">
                    Property type
                  </label>
                  <select
                    id="property-type"
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
                  >
                    <option value="flat">Flat / apartment</option>
                    <option value="terraced">Terraced</option>
                    <option value="semi-detached">Semi-detached</option>
                    <option value="detached">Detached</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="bedrooms" className="text-sm font-medium text-gray-800 mb-1.5 block">
                    Number of bedrooms
                  </label>
                  <select
                    id="bedrooms"
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "bedroom" : "bedrooms"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="occupants" className="text-sm font-medium text-gray-800 mb-1.5 block">
                    People living in the property
                  </label>
                  <select
                    id="occupants"
                    value={occupants}
                    onChange={(e) => setOccupants(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "person" : "people"}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Used for energy and water estimates</p>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                className="w-full sm:w-auto bg-[#0A369D] hover:bg-[#082e83] h-11 px-8"
                onClick={() => void handleCalculate()}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Calculating…
                  </>
                ) : (
                  "Calculate"
                )}
              </Button>
            </CardContent>
          </Card>

          {hasResults && result && rentResult && (
            <Card className="border-[#0A369D]/20 shadow-md">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl text-[#0A369D]">
                      {outputMode === "buy" ? "Estimated monthly running costs" : "Estimated monthly renting costs"}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {outputMode === "buy"
                        ? "Based on your purchase price, deposit, bedrooms, and household size"
                        : "Rent plus the same council tax, energy, and water figures as buy"}
                    </CardDescription>
                  </div>
                  <div
                    className="inline-flex shrink-0 rounded-full border border-[#CFDEE7] bg-white p-1"
                    role="tablist"
                    aria-label="Output mode"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={outputMode === "buy"}
                      onClick={() => setOutputMode("buy")}
                      className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                        outputMode === "buy"
                          ? "bg-[#0A369D] text-white"
                          : "text-[#0A369D] hover:bg-[#CFDEE7]/50"
                      }`}
                    >
                      Buy
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={outputMode === "rent"}
                      onClick={() => setOutputMode("rent")}
                      className={`rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                        outputMode === "rent"
                          ? "bg-[#0A369D] text-white"
                          : "text-[#0A369D] hover:bg-[#CFDEE7]/50"
                      }`}
                    >
                      Rent
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {outputMode === "buy" ? (
                  <>
                    <div className="rounded-xl bg-[#0A369D] text-white px-6 py-5">
                      <p className="text-sm text-white/80 mb-1">Total estimated running costs</p>
                      <p className="text-3xl md:text-4xl font-bold">
                        {formatGbp(result.totalMonthly)}
                        <span className="text-lg font-medium">/month</span>
                      </p>
                      <p className="text-xs text-white/70 mt-2">
                        Includes mortgage, bills, and maintenance. Purchase price{" "}
                        {formatGbp(result.purchasePrice)}
                        {result.deposit > 0 ? ` · Deposit ${formatGbp(result.deposit)}` : ""}
                        {` · ${result.mortgage.ratePercent}% over ${result.mortgage.termYears ?? 25} years`}
                      </p>
                    </div>

                    <div className="space-y-4">
                      {costRows.map((row) => (
                        <div
                          key={row.label}
                          className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                            <div>
                              <p className="font-semibold text-gray-900">{row.label}</p>
                              <p className="text-xs text-gray-500 mt-0.5 max-w-md">{row.note}</p>
                            </div>
                            <p className="text-lg font-semibold text-[#0A369D] shrink-0">
                              {formatGbp(row.value)}/mo
                            </p>
                          </div>
                          {row.label === "Mortgage" && result.mortgage.monthly > 0 && (
                            <div className="mt-3 ml-0 sm:ml-1 rounded-lg bg-[#CFDEE7]/50 px-4 py-3 space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-[#4472CA]">
                                Approx year-one payment split
                              </p>
                              <div className="flex items-start justify-between gap-3 text-sm">
                                <p className="font-medium text-gray-900">Interest</p>
                                <p className="font-semibold text-[#0A369D] shrink-0">
                                  {formatGbp(result.mortgage.yearOneInterestMonthly)}/mo
                                </p>
                              </div>
                              <div className="flex items-start justify-between gap-3 text-sm">
                                <p className="font-medium text-gray-900">Principal</p>
                                <p className="font-semibold text-[#0A369D] shrink-0">
                                  {formatGbp(result.mortgage.yearOnePrincipalMonthly)}/mo
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-gray-500 leading-relaxed">
                      Estimates are indicative only. Council tax uses a UK Band D average. Energy and
                      water are estimated from UK averages using bedrooms and occupancy.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl bg-[#0A369D] text-white px-6 py-5">
                      <p className="text-sm text-white/80 mb-1">Total estimated renting costs</p>
                      <p className="text-3xl md:text-4xl font-bold">
                        {formatGbp(
                          Math.round(
                            (rentResult.low +
                              result.councilTax.monthly +
                              result.energy.monthly +
                              result.water.monthly) *
                              100
                          ) / 100
                        )}
                        <span className="text-lg font-medium">/month</span>
                      </p>
                      <p className="text-xs text-white/70 mt-2">
                        Rent plus council tax, energy, and water.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {[
                        {
                          label: "Rent",
                          value: rentResult.low,
                          note: "Lower estimate from purchase price, property type, and bedrooms.",
                        },
                        {
                          label: "Council tax",
                          value: result.councilTax.monthly,
                          note: result.councilTax.note,
                        },
                        {
                          label: "Energy",
                          value: result.energy.monthly,
                          note: result.energy.note,
                        },
                        {
                          label: "Water & sewerage",
                          value: result.water.monthly,
                          note: result.water.note,
                        },
                      ].map((row) => (
                        <div
                          key={row.label}
                          className="border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                            <div>
                              <p className="font-semibold text-gray-900">{row.label}</p>
                              <p className="text-xs text-gray-500 mt-0.5 max-w-md">{row.note}</p>
                            </div>
                            <p className="text-lg font-semibold text-[#0A369D] shrink-0">
                              {formatGbp(row.value)}/mo
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-gray-500 leading-relaxed">
                      Estimates are indicative only. Council tax, energy, and water use the same
                      figures as the buy side. Rent is modelled from purchase price with adjustments
                      for property type and bedrooms.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
