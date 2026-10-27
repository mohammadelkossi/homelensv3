// Writes the report's key points and recommended offer with an OpenAI model, from
// the report's findings only.
import type OpenAI from "openai"
import type { KeyPoints } from "@/lib/rules-engine"
import { isGrounded, numbersInFindings } from "./verify"
import { validateOffer, type AiOffer } from "./offer"
import type { ReportFindings } from "./findings"

export const MODEL = "gpt-6-astra"
// It's a reasoning model: a full report takes ~20–30s. The report shows a loading
// state meanwhile and falls back to the rule-based offer and points if this runs out.
export const MODEL_TIMEOUT_MS = 45_000

const point = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description"],
  properties: { title: { type: "string" }, description: { type: "string" } },
} as const
const tab = { type: "array", minItems: 3, maxItems: 3, items: point } as const
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["offer", "know", "consider", "ask"],
  properties: {
    offer: {
      type: "object",
      additionalProperties: false,
      required: ["low", "high", "opening", "reasons"],
      properties: {
        low: { type: "integer" },
        high: { type: "integer" },
        opening: { type: "integer" },
        reasons: { type: "array", minItems: 2, maxItems: 3, items: { type: "string" } },
      },
    },
    know: tab,
    consider: tab,
    ask: tab,
  },
} as const

const SYSTEM_PROMPT = `You advise a UK home buyer, using ONLY the findings JSON you are given. Produce a recommended offer and the report's key points.

1. "offer": what this buyer should offer.
- "low" and "high" in whole pounds: the range a well-informed buyer could reasonably agree at. "opening": the first offer to make, within the range.
- Base it on the evidence: recent nearby sales and their £/m² applied to this home's floor area, competing listings for sale, the area averages, how long it's been on the market, the area sales trend and supply and demand, and the home's own sale history.
- The range must be at or below the asking price, and its low end no more than 10% below it (at least 90% of the asking price). Don't discount for the sake of it: if the evidence supports the asking price, say so with a narrow range near it.
- "reasons": 2–3 short phrases (max 10 words each) naming the specific evidence, e.g. "168 days on the market" or "Nearby semis sold at £3,190–£3,570/m²".

2. Key points: three tabs, exactly three points each.
- "know" = Why it works: the strongest genuine positives for a buyer.
- "consider" = To watch out for: the most important concerns or risks.
- "ask" = Ask the agent: specific questions this buyer should ask, prompted by these findings.
- Points may refer to your recommended offer.

Rules:
- Use only facts and numbers that appear in the findings (and your offer). Never invent prices, dates, places, distances, ratings or history. If something is null or missing, don't mention it.
- Rank by importance to a buyer deciding whether, and how much, to offer. Weigh findings together where it matters (e.g. a long time on the market in a falling market).
- Don't put the same point in two tabs, and don't restate basic listing facts (asking price, bedrooms) as points.
- Never refer to the buyer's own preferences, requirements or must-haves (e.g. "you wanted two bathrooms", "meets your needs"). Describe the home and its area objectively.
- Don't mention gardens, parking or garages: they're basic listing features, not findings.
- If there are fewer than three real positives, use the most reassuring findings available (e.g. clear risk checks, short walks to a school or station); never call a negative a positive.
- "Ask the agent" questions must be ones the agent could answer, tied to a finding (e.g. why it hasn't sold after a long time; planning history where an Article 4 direction applies). Only ask about tenure if tenure is null.
- Title: at most 8 words, specific, sentence case, no full stop. Description: one sentence, at most 25 words, plain British English, no hype, no exclamation marks.
- Round money like the report: "£349,000" or "£366k". Percentages to whole numbers unless under 10.`

type KeyPointsTab = { title: string; description: string }[]

export type ReportInsights = {
  keyPoints: KeyPoints
  /** Null if the model's offer failed a sanity check — the report then uses the rule-based offer. */
  offer: AiOffer | null
  dropped: number
}

/**
 * Generates the offer and the three tabs. The offer must pass validateOffer; any point
 * or reason quoting a number the report didn't find (or the validated offer) is dropped,
 * and the client tops gaps up from the rule-based points.
 */
export async function generateReportInsights(openai: OpenAI, findings: ReportFindings): Promise<ReportInsights> {
  const completion = await openai.chat.completions.create(
    {
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Findings:\n${JSON.stringify(findings)}` },
      ],
      response_format: { type: "json_schema", json_schema: { name: "report_insights", strict: true, schema: SCHEMA } },
    },
    { signal: AbortSignal.timeout(MODEL_TIMEOUT_MS) }
  )
  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error("Empty response")
  const parsed = JSON.parse(content) as { offer: AiOffer; know: KeyPointsTab; consider: KeyPointsTab; ask: KeyPointsTab }

  const asking = findings.property.askingPrice
  const validated =
    asking === null
      ? null
      : validateOffer(parsed.offer, {
          askingPrice: asking,
          floorAreaSqm: findings.property.floorAreaSqm,
          comparablePricesPerSqm: findings.price.recentSalesNearby.flatMap((s) => (s.pricePerSqm === null ? [] : [s.pricePerSqm])),
          areaPricePerSqm: findings.price.areaPricePerSqm,
        })

  // Points may quote the offer, but only if it passed its checks.
  const base = numbersInFindings(findings)
  const offerNumbers = validated ? [validated.low, validated.high, validated.opening, asking! - validated.high, asking! - validated.low] : []
  const known = { all: [...base.all, ...offerNumbers], numeric: [...base.numeric, ...offerNumbers] }

  const offer = validated
    ? { ...validated, reasons: validated.reasons.map((r) => r.trim()).filter((r) => isGrounded(r, known)) }
    : null

  const keep = (tabName: string, items: KeyPointsTab) =>
    items
      .filter((i) => isGrounded(`${i.title} ${i.description}`, known))
      .map((i, n) => ({ id: `ai-${tabName}-${n}`, title: i.title.trim(), description: i.description.trim() }))
  const keyPoints = { know: keep("know", parsed.know), consider: keep("consider", parsed.consider), ask: keep("ask", parsed.ask) }
  return { keyPoints, offer, dropped: 9 - keyPoints.know.length - keyPoints.consider.length - keyPoints.ask.length }
}
