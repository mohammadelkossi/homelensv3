import { ALL_RULES } from "./rules"
import type { Rule, RuleContext, RuleItem, RuleTab } from "./types"

export type { RuleContext, RuleItem, RuleTab } from "./types"

export type KeyPoints = {
  know: RuleItem[]
  consider: RuleItem[]
  ask: RuleItem[]
}

function selectTopThree(rules: Rule[], tab: RuleTab, ctx: RuleContext): RuleItem[] {
  return rules
    .filter((rule) => rule.tab === tab && rule.applies(ctx))
    // Stable sort: ties keep rule-definition order (highest priority first, defined before fallbacks).
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3)
    .map((rule) => {
      const { title, description } = rule.build(ctx)
      return { id: rule.id, title, description }
    })
}

export function buildKeyPoints(ctx: RuleContext, rules: Rule[] = ALL_RULES): KeyPoints {
  return {
    know: selectTopThree(rules, "know", ctx),
    consider: selectTopThree(rules, "consider", ctx),
    ask: selectTopThree(rules, "ask", ctx),
  }
}
