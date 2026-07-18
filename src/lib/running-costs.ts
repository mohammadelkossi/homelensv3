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

// England average Band D 2025/26 (£2,280/yr). Update annually — rises ~5%/yr.
const COUNCIL_TAX_BAND_D_ANNUAL_GBP = 2280

/** 1991 band thresholds (England). */
const COUNCIL_TAX_BAND_THRESHOLDS_1991: [number, string][] = [
  [40_000, "A"],
  [52_000, "B"],
  [68_000, "C"],
  [88_000, "D"],
  [120_000, "E"],
  [160_000, "F"],
  [320_000, "G"],
  [Infinity, "H"],
]

/** Average England house price growth since 1991 ≈ 4.5x. */
const COUNCIL_TAX_PRICE_DEFLATOR = 4.5

/** Ofgem price cap rates for July–September 2026. Update quarterly. */
const ENERGY_PRICE_CAP = {
  elecUnitRate: 0.2611,
  gasUnitRate: 0.0733,
  elecStandingDaily: 0.5719,
  gasStandingDaily: 0.2904,
}

/** Annual electricity and gas consumption by bedroom count (kWh). */
const ENERGY_CONSUMPTION_BY_BEDROOMS: Record<number, { elec: number; gas: number }> = {
  1: { elec: 1_800, gas: 7_000 },
  2: { elec: 2_200, gas: 8_500 },
  3: { elec: 2_500, gas: 9_500 },
  4: { elec: 3_100, gas: 12_000 },
  5: { elec: 3_800, gas: 15_000 },
}

/** England and Wales water and sewerage rates for 2026/27. Update each April. */
const WATER_RATES = {
  standingAnnual: 130,
  combinedRatePerM3: 4.05,
  litresPerPersonDay: 145,
}

export const MORTGAGE_TERM_YEARS = 25
export const DEFAULT_MORTGAGE_RATE_PERCENT = 5

export type RunningCostBreakdown = {
  address: string
  mortgage: {
    monthly: number
    loanAmount: number
    ratePercent: number
    termYears: number
    note: string
    /** Year-one split of the monthly payment (interest ≈ 2/3, principal ≈ 1/3). */
    yearOneInterestMonthly: number
    yearOnePrincipalMonthly: number
    yearOneInterestAnnual: number
    yearOnePrincipalAnnual: number
  }
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

/**
 * Estimates council tax from calculator inputs: deflates the purchase price to
 * an approximate 1991 value, maps it to a band, and applies the England
 * average Band D charge with the statutory band ratio.
 */
export function estimateCouncilTax(
  purchasePrice: number,
  bedrooms: number | null | undefined,
  occupants: number | null | undefined
): { band: string; monthly: number; annual: number; note: string } {
  // 1. Deflate to approximate 1991 value
  let value1991 = purchasePrice / COUNCIL_TAX_PRICE_DEFLATOR

  // 2. Bedroom nudge: price alone misjudges flats vs houses at the
  //    same price point; small properties skew a band lower
  if (bedrooms != null && bedrooms <= 1) value1991 *= 0.9
  if (bedrooms != null && bedrooms >= 5) value1991 *= 1.1

  // 3. Map to band
  const band = COUNCIL_TAX_BAND_THRESHOLDS_1991.find(([max]) => value1991 <= max)![1]

  // 4. Annual charge
  let annual = COUNCIL_TAX_BAND_D_ANNUAL_GBP * bandRatio(band)

  // 5. Single-person discount
  const singlePerson = occupants === 1
  if (singlePerson) annual *= 0.75

  return {
    band,
    annual: Math.round(annual),
    monthly: Math.round(annual / 12),
    note: `Estimated Band ${band} from the purchase price using the England average Band D charge (£${COUNCIL_TAX_BAND_D_ANNUAL_GBP.toLocaleString()}/yr)${singlePerson ? ", with 25% single-person discount" : ""}.`,
  }
}

export function estimateEnergyCost(
  bedrooms: number,
  occupants?: number | null
): { monthly: number; annual: number; note: string } {
  const bedroomBand = Math.min(Math.max(bedrooms, 1), 5)
  const usage = ENERGY_CONSUMPTION_BY_BEDROOMS[bedroomBand]

  // Adjust usage by ±8% per person away from two, capped at ±20%.
  const occupancyAdjustment = occupants
    ? Math.min(Math.max(1 + (occupants - 2) * 0.08, 0.8), 1.2)
    : 1

  const annual =
    usage.elec * occupancyAdjustment * ENERGY_PRICE_CAP.elecUnitRate +
    usage.gas * occupancyAdjustment * ENERGY_PRICE_CAP.gasUnitRate +
    365 * (ENERGY_PRICE_CAP.elecStandingDaily + ENERGY_PRICE_CAP.gasStandingDaily)

  return {
    annual: Math.round(annual),
    monthly: Math.round(annual / 12),
    note: `Estimated from ${bedroomBand === 5 ? "5+" : bedroomBand}-bed consumption and Ofgem Jul–Sep 2026 electricity and gas price-cap rates${occupants ? `, adjusted for ${occupants} ${occupants === 1 ? "person" : "people"}` : ""}.`,
  }
}

export function estimateWaterCost(
  occupants: number
): { monthly: number; annual: number; note: string } {
  // Per-person annual usage in m³ (145 L/day ≈ 53 m³/year).
  const m3PerPerson = (WATER_RATES.litresPerPersonDay * 365) / 1000

  // Shared appliance loads give each additional person a 10% usage reduction.
  const effectivePeople = 1 + (occupants - 1) * 0.9

  const annual =
    WATER_RATES.standingAnnual +
    effectivePeople * m3PerPerson * WATER_RATES.combinedRatePerM3

  return {
    annual: Math.round(annual),
    monthly: Math.round(annual / 12),
    note: `Estimated from 2026/27 England and Wales water and sewerage rates for ${occupants} ${occupants === 1 ? "person" : "people"}.`,
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
): {
  monthly: number
  loanAmount: number
  note: string
  yearOneInterestMonthly: number
  yearOnePrincipalMonthly: number
  yearOneInterestAnnual: number
  yearOnePrincipalAnnual: number
} {
  const loanAmount = Math.max(0, purchasePrice - deposit)
  if (loanAmount <= 0) {
    return {
      monthly: 0,
      loanAmount: 0,
      note: "No mortgage required — deposit covers the full purchase price.",
      yearOneInterestMonthly: 0,
      yearOnePrincipalMonthly: 0,
      yearOneInterestAnnual: 0,
      yearOnePrincipalAnnual: 0,
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

  const roundedMonthly = Math.round(monthly * 100) / 100
  // Year-one approximation: interest is two-thirds of the payment, principal one-third.
  const yearOneInterestMonthly = Math.round(roundedMonthly * (2 / 3) * 100) / 100
  const yearOnePrincipalMonthly =
    Math.round((roundedMonthly - yearOneInterestMonthly) * 100) / 100

  return {
    monthly: roundedMonthly,
    loanAmount,
    note: `Repayment mortgage over ${termYears} years at ${annualRatePercent}% on ${formatLoanAmount(loanAmount)} borrowed.`,
    yearOneInterestMonthly,
    yearOnePrincipalMonthly,
    yearOneInterestAnnual: Math.round(yearOneInterestMonthly * 12 * 100) / 100,
    yearOnePrincipalAnnual: Math.round(yearOnePrincipalMonthly * 12 * 100) / 100,
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
  bedrooms?: number | null
  occupants?: number | null
  termYears?: number | null
}): RunningCostBreakdown {
  const bedrooms = input.bedrooms && input.bedrooms > 0 ? input.bedrooms : 2
  const occupants = input.occupants && input.occupants > 0 ? input.occupants : null
  const termYears =
    input.termYears && input.termYears > 0 ? input.termYears : MORTGAGE_TERM_YEARS

  const mortgage = monthlyMortgagePayment(
    input.purchasePrice,
    input.deposit,
    input.mortgageRatePercent,
    termYears
  )
  const councilTax = estimateCouncilTax(input.purchasePrice, bedrooms, occupants)
  const energy = estimateEnergyCost(bedrooms, occupants)
  const water = estimateWaterCost(occupants ?? 1)
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
      termYears,
      note: mortgage.note,
      yearOneInterestMonthly: mortgage.yearOneInterestMonthly,
      yearOnePrincipalMonthly: mortgage.yearOnePrincipalMonthly,
      yearOneInterestAnnual: mortgage.yearOneInterestAnnual,
      yearOnePrincipalAnnual: mortgage.yearOnePrincipalAnnual,
    },
    councilTax: { monthly: councilTax.monthly, band: councilTax.band, note: councilTax.note },
    energy: { monthly: energy.monthly, note: energy.note },
    water: { monthly: water.monthly, note: water.note },
    repairs: { monthly: repairs.monthly, note: repairs.note },
    totalMonthly,
  }
}
