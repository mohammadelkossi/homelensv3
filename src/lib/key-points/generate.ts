// Writes the report's key points and recommended offer with an OpenAI model, from
// the report's findings only.
import type OpenAI from "openai"
import type { KeyPoints } from "@/lib/rules-engine"
import { isGrounded, numbersInFindings } from "./verify"
import { validateOffer, type AiOffer } from "./offer"
import type { ReportFindings } from "./findings"

export const MODEL = "gpt-6-astra"
// It's a reasoning model: one call for the offer and points together took ~20–30s. The report shows a loading
// state meanwhile and falls back to the rule-based offer and points if this runs out.
export const MODEL_TIMEOUT_MS = 45_000

const point = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description"],
  properties: { title: { type: "string" }, description: { type: "string" } },
} as const
const tab = { type: "array", minItems: 3, maxItems: 3, items: point } as const

// The offer and the key points are written by two calls in parallel: each answer is
// shorter, so both arrive sooner, and the offer (the part buyers wait for) can show
// as soon as it's ready.
const OFFER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["offer"],
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
  },
} as const

const POINTS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["know", "consider", "ask"],
  properties: { know: tab, consider: tab, ask: tab },
} as const

const SHARED_RULES = `- Use only facts and numbers that appear in the findings. Never invent prices, dates, places, distances, ratings or history. If something is null or missing, don't mention it.
- Weigh findings together where it matters (e.g. a long time on the market in a falling market).
- Never refer to the buyer's own preferences, requirements or must-haves (e.g. "you wanted two bathrooms", "meets your needs"). Describe the home and its area objectively.
- Round money like the report: "£349,000" or "£366k". Percentages to whole numbers unless under 10.`

const OFFER_PROMPT = `You advise a UK home buyer, using ONLY the findings JSON you are given. Produce a recommended offer: what this buyer should offer.
- "low" and "high" in whole pounds: the range a well-informed buyer could reasonably agree at. "opening": the first offer to make, within the range.
- Base it on the evidence: recent nearby sales and their £/m² applied to this home's floor area, competing listings for sale, the area averages, how long it's been on the market, the area sales trend and supply and demand, and the home's own sale history.
- The range must be at or below the asking price, and its low end no more than 10% below it (at least 90% of the asking price). Don't discount for the sake of it: if the evidence supports the asking price, say so with a narrow range near it.
- If it has been on the market for more than 50 days, the top of the range ("high") must be at least 5% below the asking price (at most 95% of it).
- "reasons": 2–3 short phrases (max 10 words each) naming the specific evidence, e.g. "168 days on the market" or "Nearby semis sold at £3,190–£3,570/m²".

Rules:
${SHARED_RULES}`

const POINTS_PROMPT = `You advise a UK home buyer, using ONLY the findings JSON you are given. Produce the report's key points: three tabs, exactly three points each.
- "know" = Why it works: the strongest genuine positives for a buyer.
- "consider" = To watch out for: the most important concerns or risks.
- "ask" = Ask the agent: specific questions this buyer should ask, prompted by these findings.

Rules:
${SHARED_RULES}
- Rank by importance to a buyer deciding whether, and how much, to offer.
- Don't put the same point in two tabs, and don't restate basic listing facts (asking price, bedrooms) as points.
- Don't mention gardens, parking or garages: they're basic listing features, not findings.
- If there are fewer than three real positives, use the most reassuring findings available (e.g. clear risk checks, short walks to a school or station); never call a negative a positive.
- "Ask the agent" questions must be ones the agent could answer, tied to a finding (e.g. why it hasn't sold after a long time; planning history where an Article 4 direction applies). Only ask about tenure if tenure is null.
- Title: at most 8 words, specific, sentence case, no full stop. Description: one sentence, at most 25 words, plain British English, no hype, no exclamation marks.`

type KeyPointsTab = { title: string; description: string }[]

async function ask<T>(openai: OpenAI, name: string, prompt: string, schema: object, findings: ReportFindings): Promise<T> {
  const completion = await openai.chat.completions.create(
    {
      model: MODEL,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: `Findings:\n${JSON.stringify(findings)}` },
      ],
      response_format: { type: "json_schema", json_schema: { name, strict: true, schema: schema as Record<string, unknown> } },
    },
    { signal: AbortSignal.timeout(MODEL_TIMEOUT_MS) }
  )
  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error("Empty response")
  return JSON.parse(content) as T
}

/**
 * The recommended offer, or null if it fails validateOffer (the report then uses the
 * rule-based offer). Reasons quoting a number the report didn't find are dropped.
 */
export async function generateOffer(openai: OpenAI, findings: ReportFindings): Promise<AiOffer | null> {
  const asking = findings.property.askingPrice
  if (asking === null) return null
  const parsed = await ask<{ offer: AiOffer }>(openai, "report_offer", OFFER_PROMPT, OFFER_SCHEMA, findings)
  const validated = validateOffer(parsed.offer, {
    askingPrice: asking,
    floorAreaSqm: findings.property.floorAreaSqm,
    comparablePricesPerSqm: findings.price.recentSalesNearby.flatMap((s) => (s.pricePerSqm === null ? [] : [s.pricePerSqm])),
    areaPricePerSqm: findings.price.areaPricePerSqm,
    daysOnMarket: findings.market.daysOnMarket,
  })
  if (!validated) return null

  // Reasons may quote the offer itself, as well as the findings.
  const base = numbersInFindings(findings)
  const offerNumbers = [validated.low, validated.high, validated.opening, asking - validated.high, asking - validated.low]
  const known = { all: [...base.all, ...offerNumbers], numeric: [...base.numeric, ...offerNumbers] }
  return { ...validated, reasons: validated.reasons.map((r) => r.trim()).filter((r) => isGrounded(r, known)) }
}

/**
 * The three key-point tabs. Any point quoting a number the report didn't find is
 * dropped, and the client tops gaps up from the rule-based points.
 */
export async function generateKeyPoints(openai: OpenAI, findings: ReportFindings): Promise<{ keyPoints: KeyPoints; dropped: number }> {
  const parsed = await ask<{ know: KeyPointsTab; consider: KeyPointsTab; ask: KeyPointsTab }>(
    openai,
    "report_key_points",
    POINTS_PROMPT,
    POINTS_SCHEMA,
    findings
  )
  const known = numbersInFindings(findings)
  const keep = (tabName: string, items: KeyPointsTab) =>
    items
      .filter((i) => isGrounded(`${i.title} ${i.description}`, known))
      .map((i, n) => ({ id: `ai-${tabName}-${n}`, title: i.title.trim(), description: i.description.trim() }))
  const keyPoints = { know: keep("know", parsed.know), consider: keep("consider", parsed.consider), ask: keep("ask", parsed.ask) }
  return { keyPoints, dropped: 9 - keyPoints.know.length - keyPoints.consider.length - keyPoints.ask.length }
}
