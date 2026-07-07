import type { HomedataEpc, HomedataProperty } from "@/lib/homedata"

/** England council tax multipliers relative to Band D. */
const COUNCIL_TAX_BAND_RATIOS: Record<string, number> = {
  A: 6 / 9,
  B: 7 / 9,
  C: 8 / 9,
  D: 1,
  E: 11 / 9,
  F: 13 / 9,
  G: 15 / 9,
  H: 18 / 9,
}

/** Typical UK unit rate used to convert EPC kWh/year to £/month (pence/kWh). */
const ENERGY_UNIT_RATE_PENCE = 24.5

/** OFWAT-style average annual water & sewerage bill, scaled lightly by bedrooms. */
const WATER_BASE_ANNUAL_GBP = 408

export const MORTGAGE_TERM_YEARS = 20
export const DEFAULT_MORTGAGE_RATE_PERCENT = 5

export type RunningCostBreakdown = {
  address: string
  mortgage: { monthly: number; loanAmount: number; ratePercent: number; note: string }
  councilTax: { monthly: number; band: string | null; note: string }
  energy: { monthly: number; note: string }
  water: { monthly: number; note: string }
  repairs: { monthly: number; note: string }
  totalMonthly: number
  purchasePrice: number
  deposit: number
}

function bandRatio(band: string | null | undefined): number {
  if (!band) return 1
  return COUNCIL_TAX_BAND_RATIOS[band.toUpperCase()] ?? 1
}

export function monthlyCouncilTax(
  band: string | null | undefined,
  bandDAnnualChargePence: number | null | undefined,
  usedFallbackCharge = false
): { monthly: number; note: string } {
  const chargePence = bandDAnnualChargePence && bandDAnnualChargePence > 0 ? bandDAnnualChargePence : 223_800
  const effectiveBand = band?.toUpperCase() ?? "D"
  const annualGbp = (chargePence / 100) * bandRatio(effectiveBand)

  return {
    monthly: Math.round((annualGbp / 12) * 100) / 100,
    note: band
      ? `Band ${effectiveBand} using ${usedFallbackCharge ? "UK average" : "local"} Band D charge (£${(chargePence / 100).toLocaleString()}/yr).`
      : `Band unavailable — estimated as Band D using ${usedFallbackCharge ? "UK average" : "local"} authority charge.`,
  }
}

export function monthlyEnergyBill(
  property: HomedataProperty,
  epc: HomedataEpc | null
): { monthly: number; note: string } {
  const kwh =
    epc?.energy_consumption_kwh ??
    property.energy_consumption_kwh ??
    estimateKwhFromProperty(property, epc)

  if (!kwh || kwh <= 0) {
    return {
      monthly: 95,
      note: "Approximate UK average used — no EPC energy consumption data for this property.",
    }
  }

  const annualGbp = (kwh * ENERGY_UNIT_RATE_PENCE) / 100
  return {
    monthly: Math.round((annualGbp / 12) * 100) / 100,
    note: `Based on EPC estimate of ${Math.round(kwh).toLocaleString()} kWh/year at ~${ENERGY_UNIT_RATE_PENCE}p/kWh.`,
  }
}

function estimateKwhFromProperty(
  property: HomedataProperty,
  epc: HomedataEpc | null
): number | null {
  const floorArea = epc?.epc_floor_area ?? property.epc_floor_area ?? property.internal_area_sqm
  const score = epc?.current_energy_efficiency ?? property.current_energy_efficiency
  if (!floorArea) return null
  const efficiencyFactor = score ? 1.4 - score / 200 : 1
  return floorArea * 45 * efficiencyFactor
}

export function monthlyWaterBill(bedrooms: number | null | undefined): { monthly: number; note: string } {
  const beds = bedrooms && bedrooms > 0 ? bedrooms : 2
  const annual = WATER_BASE_ANNUAL_GBP + (beds - 2) * 45
  return {
    monthly: Math.round((annual / 12) * 100) / 100,
    note: `Estimated from UK average water & sewerage costs (${beds} bed assumption). Homedata does not publish per-property water tariffs.`,
  }
}

export function monthlyRepairs(purchasePrice: number): { monthly: number; note: string } {
  const monthly = Math.round(((purchasePrice * 0.01) / 12) * 100) / 100
  return {
    monthly,
    note: "1% of purchase price per year set aside for maintenance and repairs.",
  }
}

export function monthlyMortgagePayment(
  purchasePrice: number,
  deposit: number,
  annualRatePercent: number,
  termYears = MORTGAGE_TERM_YEARS
): { monthly: number; loanAmount: number; note: string } {
  const loanAmount = Math.max(0, purchasePrice - deposit)
  if (loanAmount <= 0) {
    return {
      monthly: 0,
      loanAmount: 0,
      note: "No mortgage required — deposit covers the full purchase price.",
    }
  }

  const months = termYears * 12
  const monthlyRate = annualRatePercent / 100 / 12

  let monthly: number
  if (monthlyRate === 0) {
    monthly = loanAmount / months
  } else {
    const factor = Math.pow(1 + monthlyRate, months)
    monthly = (loanAmount * monthlyRate * factor) / (factor - 1)
  }

  return {
    monthly: Math.round(monthly * 100) / 100,
    loanAmount,
    note: `Repayment mortgage over ${termYears} years at ${annualRatePercent}% on ${formatLoanAmount(loanAmount)} borrowed.`,
  }
}

function formatLoanAmount(amount: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount)
}

export function buildRunningCostBreakdown(input: {
  address: string
  purchasePrice: number
  deposit: number
  mortgageRatePercent: number
  property: HomedataProperty
  epc: HomedataEpc | null
  councilTaxBand: string | null
  bandDAnnualChargePence: number | null
  councilTaxUsesFallbackCharge?: boolean
}): RunningCostBreakdown {
  const mortgage = monthlyMortgagePayment(
    input.purchasePrice,
    input.deposit,
    input.mortgageRatePercent
  )
  const councilTax = monthlyCouncilTax(
    input.councilTaxBand,
    input.bandDAnnualChargePence,
    input.councilTaxUsesFallbackCharge
  )
  const energy = monthlyEnergyBill(input.property, input.epc)
  const water = monthlyWaterBill(input.property.bedrooms)
  const repairs = monthlyRepairs(input.purchasePrice)

  const totalMonthly =
    Math.round(
      (mortgage.monthly + councilTax.monthly + energy.monthly + water.monthly + repairs.monthly) * 100
    ) / 100

  return {
    address: input.address,
    purchasePrice: input.purchasePrice,
    deposit: input.deposit,
    mortgage: {
      monthly: mortgage.monthly,
      loanAmount: mortgage.loanAmount,
      ratePercent: input.mortgageRatePercent,
      note: mortgage.note,
    },
    councilTax: { monthly: councilTax.monthly, band: input.councilTaxBand, note: councilTax.note },
    energy: { monthly: energy.monthly, note: energy.note },
    water: { monthly: water.monthly, note: water.note },
    repairs: { monthly: repairs.monthly, note: repairs.note },
    totalMonthly,
  }
}
