import { constructionAgeBandStartYear } from "@/lib/epc"
import { sellersGain as sellersGainOf } from "@/lib/pricing/recommended-offer"
import type { Rule, RuleContext } from "./types"

const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 })
function money(value: number): string {
  // "£665,000" -> "£665k" when round-thousands, else full value.
  if (value >= 1000 && value % 1000 === 0) return `£${Math.round(value / 1000)}k`
  return currency.format(value)
}

function askingVsDistrictPercent(ctx: RuleContext): number | null {
  if (ctx.askingPrice === null || !ctx.districtAveragePrice) return null
  return ((ctx.askingPrice - ctx.districtAveragePrice) / ctx.districtAveragePrice) * 100
}

function sellersGain(ctx: RuleContext): { amount: number; percent: number } | null {
  return sellersGainOf(ctx.askingPrice, ctx.lastSalePrice)
}

// ─── Know ───────────────────────────────────────────────────────────────────

const knowRules: Rule[] = [
  {
    id: "know-price-vs-average",
    tab: "know",
    priority: 90,
    applies: (ctx) => {
      const pct = askingVsDistrictPercent(ctx)
      return pct !== null && Math.abs(pct) > 10
    },
    build: (ctx) => {
      const pct = askingVsDistrictPercent(ctx)!
      const direction = pct > 0 ? "above" : "below"
      return {
        title: `${Math.abs(Math.round(pct))}% ${direction} the area average`,
        description: `${money(ctx.askingPrice!)} vs ${money(ctx.districtAveragePrice!)} for ${ctx.propertyType ?? "this type of"} sales${ctx.outcode ? ` in ${ctx.outcode}` : ""}${ctx.districtAverageYear ? ` in ${ctx.districtAverageYear}` : ""}`,
      }
    },
  },
  {
    id: "know-days-on-market",
    tab: "know",
    priority: 80,
    applies: (ctx) => ctx.daysOnMarket !== null && ctx.daysOnMarket > 60,
    build: (ctx) => ({
      title: `${ctx.daysOnMarket} days on the market`,
      description: ctx.listedDateLabel ? `Listed ${ctx.listedDateLabel} and still unsold` : "Longer than typical for this area",
    }),
  },
  {
    id: "know-conservation-article4",
    tab: "know",
    priority: 70,
    applies: (ctx) => ctx.hasConservationArea || ctx.hasArticle4,
    build: (ctx) => ({
      title: ctx.hasConservationArea && ctx.hasArticle4 ? "Conservation area + Article 4" : ctx.hasConservationArea ? "Conservation area" : "Article 4 direction",
      description: "Exterior changes may need planning permission",
    }),
  },
  {
    id: "know-flood-risk",
    tab: "know",
    priority: 65,
    applies: (ctx) => ctx.hasFloodRisk,
    build: () => ({
      title: "In a mapped flood risk zone",
      description: "Check flood cover with your insurer before you offer",
    }),
  },
  {
    id: "know-no-recent-sales",
    tab: "know",
    priority: 50,
    applies: (ctx) => ctx.salesCountPast12Months === 0,
    // salesCountPast12Months is for the full postcode (e.g. LS18 4BE), not the district.
    build: () => ({
      title: "No recent sales in this postcode",
      description: "Harder to judge a fair price from local data alone",
    }),
  },
  {
    id: "know-sellers-gain",
    tab: "know",
    priority: 45,
    applies: (ctx) => {
      const gain = sellersGain(ctx)
      return gain !== null && gain.percent > 30
    },
    build: (ctx) => {
      const gain = sellersGain(ctx)!
      return {
        title: `Seller has ${money(gain.amount)} of gain`,
        description: `Bought in ${ctx.lastSaleYear ?? "an earlier year"}, now asking ${money(ctx.askingPrice!)}`,
      }
    },
  },
  // Fallbacks — always applicable, low priority, only used to fill remaining slots.
  {
    id: "know-fallback-asking-price",
    tab: "know",
    priority: 5,
    applies: (ctx) => ctx.askingPrice !== null,
    build: (ctx) => ({
      title: money(ctx.askingPrice!),
      description: `Asking price for this ${ctx.propertyType ?? "property"}`,
    }),
  },
  {
    id: "know-fallback-bedrooms",
    tab: "know",
    priority: 4,
    applies: (ctx) => ctx.bedrooms !== null,
    build: (ctx) => ({
      title: `${ctx.bedrooms} bedroom${ctx.bedrooms === "1" ? "" : "s"}`,
      description: ctx.propertyType ? `${ctx.propertyType} home` : "As listed",
    }),
  },
  {
    id: "know-fallback-listed-date",
    tab: "know",
    priority: 3,
    applies: (ctx) => ctx.listedDateLabel !== null,
    build: (ctx) => ({
      title: "On the market",
      description: `Listed ${ctx.listedDateLabel}`,
    }),
  },
  // Unconditional catch-alls — guarantee 3 items even when optional data is missing.
  {
    id: "know-fallback-property-type",
    tab: "know",
    priority: 2,
    applies: () => true,
    build: (ctx) => ({
      title: ctx.propertyType ? `${ctx.propertyType} property` : "Property details",
      description: "Review the full listing for specifics not covered here",
    }),
  },
  {
    id: "know-fallback-generic",
    tab: "know",
    priority: 1,
    applies: () => true,
    build: () => ({
      title: "Worth a closer look",
      description: "Compare this against similar homes before you offer",
    }),
  },
]

// ─── Consider ───────────────────────────────────────────────────────────────

const considerRules: Rule[] = [
  {
    id: "consider-epc-poor",
    tab: "consider",
    priority: 80,
    applies: (ctx) => !!ctx.epcRating && ["D", "E", "F", "G"].includes(ctx.epcRating.toUpperCase()),
    build: (ctx) => ({
      title: `EPC ${ctx.epcRating} — expect higher heating bills`,
      description: ctx.hasConservationArea
        ? "Upgrades like new windows may be limited by the conservation area"
        : "Insulation or heating upgrades could bring this down",
    }),
  },
  {
    id: "consider-old-build",
    tab: "consider",
    priority: 70,
    applies: (ctx) => {
      const year = constructionAgeBandStartYear(ctx.constructionAgeBand)
      return year !== null && year < 1930
    },
    build: (ctx) => ({
      title: "Get a full building survey",
      description: `A Level 3 survey is worth it on a home built ${ctx.constructionAgeBand}: roof, damp, wiring and drainage`,
    }),
  },
  {
    id: "consider-epc-budget",
    tab: "consider",
    priority: 60,
    applies: (ctx) => !!ctx.epcRating && ["D", "E", "F", "G"].includes(ctx.epcRating.toUpperCase()),
    build: () => ({
      title: "Budget for improvements",
      description: "Moving up an EPC band usually means insulation or heating upgrades. Get rough quotes before you offer",
    }),
  },
  {
    id: "consider-flood-insurance",
    tab: "consider",
    priority: 55,
    applies: (ctx) => ctx.hasFloodRisk,
    build: () => ({
      title: "Check flood insurance costs",
      description: "Premiums and excess can be higher for homes in a mapped flood zone",
    }),
  },
  {
    id: "consider-noise",
    tab: "consider",
    priority: 40,
    applies: (ctx) => ctx.maxNoiseDb !== null && ctx.maxNoiseDb >= 55,
    build: (ctx) => ({
      title: "Noise levels above 55 dB",
      description: `Mapped at ~${Math.round(ctx.maxNoiseDb!)} dB — worth visiting at different times of day`,
    }),
  },
  // Fallbacks
  {
    id: "consider-fallback-survey",
    tab: "consider",
    priority: 5,
    applies: () => true,
    build: () => ({
      title: "Get a survey before you commit",
      description: "A RICS survey can flag issues not visible on a viewing",
    }),
  },
  {
    id: "consider-fallback-epc-certificate",
    tab: "consider",
    priority: 4,
    applies: () => true,
    build: () => ({
      title: "Check the full EPC certificate",
      description: "It lists specific recommendations for this property, not just the headline rating",
    }),
  },
  {
    id: "consider-fallback-title",
    tab: "consider",
    priority: 3,
    applies: () => true,
    build: () => ({
      title: "Review the title register",
      description: "Covers boundaries, rights of way and any restrictions on the land",
    }),
  },
]

// ─── Ask the agent ──────────────────────────────────────────────────────────

const askRules: Rule[] = [
  {
    id: "ask-why-not-sold",
    tab: "ask",
    priority: 50,
    applies: (ctx) => ctx.daysOnMarket !== null && ctx.daysOnMarket > 60,
    build: (ctx) => ({
      title: `Why hasn't it sold in ${ctx.daysOnMarket} days?`,
      description: "Ask about viewings, offers so far and whether the price has been reduced",
    }),
  },
  {
    id: "ask-planning-history",
    tab: "ask",
    priority: 40,
    applies: (ctx) => ctx.hasConservationArea || ctx.hasArticle4,
    build: () => ({
      title: "Any planning history on the property?",
      description: "Worth knowing what's already been approved or refused here",
    }),
  },
  {
    id: "ask-price-reduced",
    tab: "ask",
    priority: 35,
    applies: (ctx) => ctx.priceReduced,
    build: () => ({
      title: "Has the price been reduced before?",
      description: "And if so, by how much and when",
    }),
  },
  // Fallbacks — tenure is explicitly always available per the brief, since we don't show it elsewhere.
  {
    id: "ask-fallback-tenure",
    tab: "ask",
    priority: 10,
    applies: () => true,
    build: () => ({
      title: "Is it freehold or leasehold?",
      description: "If leasehold, ask how many years are left and what the ground rent and service charges are",
    }),
  },
  {
    id: "ask-fallback-chain",
    tab: "ask",
    priority: 8,
    applies: () => true,
    build: () => ({
      title: "Is the seller in a chain?",
      description: "And how soon do they need to move? This tells you how much room there is to negotiate",
    }),
  },
  {
    id: "ask-fallback-included",
    tab: "ask",
    priority: 5,
    applies: () => true,
    build: () => ({
      title: "What's included in the sale?",
      description: "Fixtures, fittings and appliances can vary a lot from the listing photos",
    }),
  },
]

export const ALL_RULES: Rule[] = [...knowRules, ...considerRules, ...askRules]
