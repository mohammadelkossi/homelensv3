export type BuyerType = "first-time" | "home-mover" | "additional"

export interface StampDutyBand {
  label: string
  rate: number
  amount: number
}

export interface StampDutyResult {
  total: number
  bands: StampDutyBand[]
}

interface Band {
  upTo: number
  rate: number
}

/** England & NI SDLT residential rates (gov.uk, from 1 April 2025). */
const STANDARD_BANDS: Band[] = [
  { upTo: 125_000, rate: 0 },
  { upTo: 250_000, rate: 0.02 },
  { upTo: 925_000, rate: 0.05 },
  { upTo: 1_500_000, rate: 0.1 },
  { upTo: Infinity, rate: 0.12 },
]

/** First-time buyer relief only applies when the price is £500,000 or less. */
const FIRST_TIME_BUYER_BANDS: Band[] = [
  { upTo: 300_000, rate: 0 },
  { upTo: 500_000, rate: 0.05 },
]

const ADDITIONAL_PROPERTY_SURCHARGE = 0.05
const FIRST_TIME_BUYER_RELIEF_CAP = 500_000
/** No surcharge below this price, regardless of buyer type. */
const ADDITIONAL_PROPERTY_SURCHARGE_MIN_PRICE = 40_000

function formatBandLabel(lower: number, upTo: number): string {
  const from = new Intl.NumberFormat("en-GB").format(lower)
  if (upTo === Infinity) return `Above £${from}`
  const to = new Intl.NumberFormat("en-GB").format(upTo)
  return `£${from} – £${to}`
}

function calculateBanded(price: number, bands: Band[], surcharge: number): StampDutyResult {
  let lower = 0
  let total = 0
  const rows: StampDutyBand[] = []

  for (const band of bands) {
    if (price <= lower) break
    const upper = Math.min(band.upTo, price)
    const bandSize = upper - lower
    const rate = band.rate + surcharge
    const amount = bandSize * rate
    total += amount
    rows.push({ label: formatBandLabel(lower, band.upTo), rate, amount })
    lower = band.upTo
  }

  return { total: Math.round(total), bands: rows }
}

export function calculateStampDuty(price: number, buyerType: BuyerType): StampDutyResult {
  if (!Number.isFinite(price) || price <= 0) {
    return { total: 0, bands: [] }
  }

  if (buyerType === "first-time" && price <= FIRST_TIME_BUYER_RELIEF_CAP) {
    return calculateBanded(price, FIRST_TIME_BUYER_BANDS, 0)
  }

  const surcharge =
    buyerType === "additional" && price >= ADDITIONAL_PROPERTY_SURCHARGE_MIN_PRICE
      ? ADDITIONAL_PROPERTY_SURCHARGE
      : 0
  return calculateBanded(price, STANDARD_BANDS, surcharge)
}
