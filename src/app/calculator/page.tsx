"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { RunningCostBreakdown } from "@/lib/running-costs"
import { DEFAULT_MORTGAGE_RATE_PERCENT } from "@/lib/running-costs"
import { Calculator, Home, Loader2 } from "lucide-react"
import posthog from "posthog-js"

type AddressSuggestion = {
  uprn: number
  address: string
  postcode: string
}

function formatGbp(value: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value)
}

export default function CalculatorPage() {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [selected, setSelected] = useState<AddressSuggestion | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searching, setSearching] = useState(false)
  const [purchasePrice, setPurchasePrice] = useState("")
  const [deposit, setDeposit] = useState("")
  const [mortgageRate, setMortgageRate] = useState(String(DEFAULT_MORTGAGE_RATE_PERCENT))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<RunningCostBreakdown | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fetchSuggestions = useCallback(async (value: string) => {
    if (value.trim().length < 3) {
      setSuggestions([])
      return
    }
    setSearching(true)
    try {
      const response = await fetch(`/api/calculator/addresses?q=${encodeURIComponent(value)}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Address search failed")
      setSuggestions(data.results ?? [])
      setShowSuggestions(true)
    } catch {
      setSuggestions([])
    } finally {
      setSearching(false)
    }
  }, [])

  function handleQueryChange(value: string) {
    setQuery(value)
    setSelected(null)
    setResult(null)
    setError("")
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => void fetchSuggestions(value), 300)
  }

  function selectAddress(item: AddressSuggestion) {
    setSelected(item)
    setQuery(`${item.address}, ${item.postcode}`)
    setShowSuggestions(false)
    setSuggestions([])
  }

  async function handleCalculate() {
    if (!selected) {
      setError("Select a property from the address suggestions.")
      return
    }
    const price = Number(purchasePrice.replace(/,/g, ""))
    const dep = Number(deposit.replace(/,/g, "") || 0)
    const rate = Number(mortgageRate)
    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a valid purchase price.")
      return
    }
    if (!Number.isFinite(rate) || rate < 0 || rate > 25) {
      setError("Enter a mortgage rate between 0% and 25%.")
      return
    }

    setLoading(true)
    setError("")
    setResult(null)

    try {
      const response = await fetch("/api/calculator/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uprn: selected.uprn,
          postcode: selected.postcode,
          address: `${selected.address}, ${selected.postcode}`,
          purchasePrice: price,
          deposit: dep,
          mortgageRatePercent: rate,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Calculation failed")

      setResult(data.breakdown)
      posthog.capture("running_cost_calculated", {
        uprn: selected.uprn,
        purchase_price: price,
        total_monthly: data.breakdown.totalMonthly,
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

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar isScrolled />
      <main className="flex-1">
        <section className="border-b border-[#CFDEE7] bg-[#CFDEE7]/40">
          <div className="container mx-auto px-4 sm:px-6 py-12 md:py-16 max-w-3xl">
            <div className="flex items-center gap-3 mb-3">
              <Calculator className="h-8 w-8 text-[#0A369D]" />
              <p className="text-sm font-semibold uppercase tracking-wide text-[#4472CA]">
                Running costs calculator
              </p>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#0A369D] mb-3">
              What will this home really cost each month?
            </h1>
            <p className="text-base md:text-lg text-gray-700 max-w-2xl">
              Search a UK address, enter your purchase price and deposit, and see an estimate of
              council tax, energy, water, maintenance, and mortgage — powered by Homedata.
            </p>
          </div>
        </section>

        <div className="container mx-auto px-4 sm:px-6 py-10 max-w-3xl space-y-8">
          <Card className="border-[#CFDEE7] shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl text-[#0A369D]">Your property</CardTitle>
              <CardDescription>Start typing an address to search UK properties.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div ref={wrapperRef} className="relative">
                <label htmlFor="address" className="text-sm font-medium text-gray-800 mb-1.5 block">
                  Property address
                </label>
                <div className="relative">
                  <Home className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="address"
                    value={query}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="e.g. 10 Downing Street, London"
                    className="pl-10"
                    autoComplete="off"
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                  )}
                </div>
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-60 overflow-auto">
                    {suggestions.map((item) => (
                      <li key={item.uprn}>
                        <button
                          type="button"
                          className="w-full text-left px-4 py-3 text-sm hover:bg-[#CFDEE7]/50 border-b border-gray-100 last:border-0"
                          onClick={() => selectAddress(item)}
                        >
                          <span className="font-medium text-gray-900">{item.address}</span>
                          <span className="text-gray-500">, {item.postcode}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

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
                  <p className="text-xs text-gray-500 mt-1">20-year repayment term</p>
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
                  "Calculate running costs"
                )}
              </Button>
            </CardContent>
          </Card>

          {result && (
            <Card className="border-[#0A369D]/20 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl text-[#0A369D]">Estimated monthly running costs</CardTitle>
                <CardDescription>{result.address}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-xl bg-[#0A369D] text-white px-6 py-5">
                  <p className="text-sm text-white/80 mb-1">Total estimated running costs</p>
                  <p className="text-3xl md:text-4xl font-bold">
                    {formatGbp(result.totalMonthly)}
                    <span className="text-lg font-medium">/month</span>
                  </p>
                  <p className="text-xs text-white/70 mt-2">
                    Includes mortgage, bills, and maintenance. Purchase price {formatGbp(result.purchasePrice)}
                    {result.deposit > 0 ? ` · Deposit ${formatGbp(result.deposit)}` : ""}
                    {` · ${result.mortgage.ratePercent}% over 20 years`}
                  </p>
                </div>

                <div className="space-y-4">
                  {costRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 border-b border-gray-100 pb-4 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{row.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5 max-w-md">{row.note}</p>
                      </div>
                      <p className="text-lg font-semibold text-[#0A369D] shrink-0">
                        {formatGbp(row.value)}/mo
                      </p>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-500 leading-relaxed">
                  Estimates are indicative only. Council tax uses Homedata band and local authority
                  Band D charges. Energy uses EPC consumption where available. Water is estimated
                  from UK averages as provider tariffs are not available via the API.
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
