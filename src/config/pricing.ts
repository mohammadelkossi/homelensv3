export const PAYMENT_FREQUENCIES = ["monthly"];

export type CheckoutPlan = "monthly" | "lifetime";

// All numeric prices are in GBP (£)
export interface PricingTier {
  name: string;
  id: string;
  checkoutPlan: CheckoutPlan;
  price: Record<string, number | string>;
  priceLabel?: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  popular?: boolean;
}

const PRO_FEATURES = [
  "50 property analyses/month",
  "Smart HomeLens score (financial + lifestyle fit)",
  "Key price insights (area averages & trends)",
  "Clear strengths & red flags for each property",
] as const;

export const TIERS: PricingTier[] = [
  {
    id: "pro-monthly",
    name: "Pro Monthly",
    checkoutPlan: "monthly",
    price: {
      monthly: 8,
      yearly: 8,
    },
    priceLabel: "Per month",
    description: "Ideal for serious home buyers and investors",
    features: [...PRO_FEATURES, "Cancel anytime"],
    cta: "Subscribe for £8/month",
  },
  {
    id: "pro-lifetime",
    name: "Pro Lifetime",
    checkoutPlan: "lifetime",
    price: {
      monthly: 21,
      yearly: 21,
    },
    priceLabel: "One-time payment",
    description: "Pay once, keep Pro access for life",
    features: [...PRO_FEATURES, "Lifetime access — no subscription"],
    cta: "Get lifetime access for £21",
    highlighted: true,
    popular: true,
  },
];
