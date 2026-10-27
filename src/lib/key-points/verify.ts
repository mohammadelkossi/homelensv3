// Guard against the model stating numbers the report never found. Every number
// in a generated point must match (within rounding) a number in the findings.

type Token = { value: number; percent: boolean }

function tokens(text: string): Token[] {
  const out: Token[] = []
  const re = /(\d[\d,]*(?:\.\d+)?)\s*(k|m(?![²a-z]))?\s*(%)?/gi
  for (const match of text.matchAll(re)) {
    let n = parseFloat(match[1].replace(/,/g, ""))
    const unit = match[2]?.toLowerCase()
    if (unit === "k") n *= 1_000
    if (unit === "m") n *= 1_000_000
    if (Number.isFinite(n)) out.push({ value: n, percent: match[3] === "%" })
  }
  return out
}

/** Every number in a piece of text, normalised: "£349k" → 349000, "41%" → 41, "1,250" → 1250. */
export function numbersInText(text: string): number[] {
  return tokens(text).map((t) => t.value)
}

export type KnownNumbers = {
  /** Every number, including digits inside strings ("12 May 2026", "Violent Crime (69)"). */
  all: number[]
  /** Only true numeric values — percentages must match one of these, not a stray digit in a date. */
  numeric: number[]
}

export function numbersInFindings(findings: unknown): KnownNumbers {
  const all: number[] = []
  const numeric: number[] = []
  const walk = (value: unknown) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      all.push(value, Math.abs(value))
      numeric.push(value, Math.abs(value))
    } else if (typeof value === "string") all.push(...numbersInText(value))
    else if (Array.isArray(value)) value.forEach(walk)
    else if (value && typeof value === "object") Object.values(value).forEach(walk)
  }
  walk(findings)
  return { all, numeric }
}

// Small counts ("three questions", "1 bathroom", "2 of 3") are safe to state without
// appearing in the findings verbatim. Not applied to percentages.
const SMALL_COUNTS = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

function matches(n: number, candidates: number[]): boolean {
  return candidates.some((k) => {
    const tolerance = Math.max(0.6, Math.abs(k) * 0.01) // rounding: "£366k" vs 365,594, "5%" vs 4.5
    if (Math.abs(n - k) <= tolerance) return true
    return k >= 1000 && Math.abs(n - Math.round(k / 1000) * 1000) <= 1 // "£366k" for 365,594
  })
}

export function isGrounded(text: string, known: KnownNumbers): boolean {
  return tokens(text).every(({ value, percent }) => {
    if (percent) return matches(value, known.numeric)
    return SMALL_COUNTS.has(value) || matches(value, known.all)
  })
}
