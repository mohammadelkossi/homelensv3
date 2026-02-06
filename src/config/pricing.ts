export const PAYMENT_FREQUENCIES = ["monthly"];

// All numeric prices are in GBP (£)
export interface PricingTier {
  name: string;
  id: string;
  price: Record<string, number | string>;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  popular?: boolean;
}

export const TIERS: PricingTier[] = [
  {
    id: "basic",
    name: "Basic",
    price: {
      monthly: "Free",
      yearly: "Free",
    },
    description: "Perfect for getting started with property search",
    features: [
      "5 full property analyses",
      "Smart HomeLens score (financial + lifestyle fit)",
      "Key price insights (area averages & trends)",
      "Clear strengths & red flags for each property",
      "No card required",
      "❌ No saved properties",
      "❌ No share & download reports",
    ],
    cta: "Get started for free",
  },
  {
    id: "professional",
    name: "Pro",
    price: {
      monthly: 5,
      yearly: 5,
    },
    description: "Ideal for serious home buyers and investors",
    features: [
      "50 property analyses/month",
      "Smart HomeLens score (financial + lifestyle fit)",
      "Key price insights (area averages & trends)",
      "Clear strengths & red flags for each property",
      "Save interested properties",
      "Download & share reports",
      "Cancel anytime",
    ],
    cta: "Sign Up",
  },
];

