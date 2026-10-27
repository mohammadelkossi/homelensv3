// Sanity checks on the model's recommended offer. If any fail, the report falls
// back to the rule-based offer rather than show a price we can't stand behind.
import { MAX_PERCENT_BELOW_ASKING } from "@/lib/pricing/recommended-offer"

export type AiOffer = { low: number; high: number; opening: number; reasons: string[] }

export type OfferEvidence = {
  askingPrice: number
  floorAreaSqm: number | null
  /** £/m² of recent nearby sales of the same type. */
  comparablePricesPerSqm: number[]
  areaPricePerSqm: number | null
}

const MIN_SHARE_OF_ASKING = 1 - MAX_PERCENT_BELOW_ASKING / 100
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
  const floor = asking * MIN_SHARE_OF_ASKING
  // The model must respect the floor itself; we only stop £1,000 rounding nudging it under.
  if (raw.low < floor - 500) return null
  const atLeastFloor = (n: number) => Math.max(roundToThousand(n), Math.ceil(floor / 1000) * 1000)
  const low = atLeastFloor(raw.low)
  const high = roundToThousand(raw.high)
  const opening = atLeastFloor(raw.opening)

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
