export type RuleTab = "know" | "consider" | "ask"

export type RuleContext = {
  askingPrice: number | null
  propertyType: string | null
  outcode: string | null
  districtAveragePrice: number | null
  districtAverageYear: number | null
  daysOnMarket: number | null
  listedDateLabel: string | null
  salesCountPast12Months: number | null
  lastSalePrice: number | null
  lastSaleYear: number | null
  epcRating: string | null
  constructionAgeBand: string | null
  hasConservationArea: boolean
  hasArticle4: boolean
  hasFloodRisk: boolean
  maxNoiseDb: number | null
  bedrooms: string | null
  priceReduced: boolean
}

export type RuleItem = {
  id: string
  title: string
  description: string
}

export type Rule = {
  id: string
  tab: RuleTab
  /** Higher fires first. Fallback rules use a low priority so they only fill empty slots. */
  priority: number
  applies: (ctx: RuleContext) => boolean
  build: (ctx: RuleContext) => { title: string; description: string }
}
