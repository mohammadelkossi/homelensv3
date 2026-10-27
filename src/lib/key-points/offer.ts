// Sanity checks on the model's recommended offer. If any fail, the report falls
// back to the rule-based offer rather than show a price we can't stand behind.
import { MAX_PERCENT_BELOW_ASKING, offerLimits } from "@/lib/pricing/recommended-offer"

export type AiOffer = { low: number; high: number; opening: number; reasons: string[] }

export type OfferEvidence = {
  askingPrice: number
  floorAreaSqm: number | null
  /** £/m² of recent nearby sales of the same type. */
  comparablePricesPerSqm: number[]
  areaPricePerSqm: number | null
  /** Over STALE_LISTING_DAYS caps the range's top below the asking price. */
  daysOnMarket?: number | null
}

// The range's midpoint must sit this close to what local £/m² implies for this home.
const COMPARABLE_BAND: [number, number] = [0.7, 1.3]

const roundToThousand = (n: number) => Math.round(n / 1000) * 1000

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

/** What local evidence implies this home is worth, if there's enough to say. */
export function impliedValue(evidence: OfferEvidence): number | null {
  if (!evidence.floorAreaSqm) return null
  const perSqm = evidence.comparablePricesPerSqm.length >= 2 ? median(evidence.comparablePricesPerSqm) : evidence.areaPricePerSqm
  return perSqm ? perSqm * evidence.floorAreaSqm : null
}

/** Rounds the offer to £1,000 and returns it if it passes every check, else null. */
export function validateOffer(raw: AiOffer, evidence: OfferEvidence): AiOffer | null {
  const asking = evidence.askingPrice
  // An offer above asking means the model misread the evidence: don't trust any of it.
  if (raw.high > asking) return null
  const limits = offerLimits(asking, evidence.daysOnMarket ?? null, 1000)
  // The model must respect the floor itself (the exact one, before rounding); we only stop
  // £1,000 rounding nudging it under.
  const exactFloor = Math.min(asking * (1 - MAX_PERCENT_BELOW_ASKING / 100), limits.maxLow)
  if (raw.low < exactFloor - 500) return null
  // Then hold it to the hard caps: pull the top, bottom and opening down to them if needed.
  const low = Math.min(Math.max(roundToThousand(raw.low), limits.floor), limits.maxLow)
  const high = Math.min(roundToThousand(raw.high), limits.maxHigh)
  const opening = Math.min(Math.max(roundToThousand(raw.opening), limits.floor), high)
  // An opening outside the model's own range is incoherent: reject rather than repair it.
  const [rawLow, rawHigh, rawOpening] = [raw.low, raw.high, raw.opening].map(roundToThousand)
  if (rawOpening < rawLow || rawOpening > rawHigh) return null

  if (![low, high, opening].every((n) => Number.isFinite(n) && n > 0)) return null
  if (!(low < high && low <= opening && opening <= high)) return null
  if (high > asking) return null

  const implied = impliedValue(evidence)
  if (implied !== null) {
    const mid = (low + high) / 2
    if (mid < implied * COMPARABLE_BAND[0] || mid > implied * COMPARABLE_BAND[1]) return null
  }
  return { low, high, opening, reasons: raw.reasons }
}
