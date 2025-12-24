export const PAYMENT_FREQUENCIES = ["monthly", "yearly"];

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
      "Property search and filtering",
      "Basic property recommendations",
      "Save up to 5 properties",
      "Email support",
      "Mobile app access",
    ],
    cta: "Get Started Free",
  },
  {
    id: "professional",
    name: "Professional",
    price: {
      monthly: 29,
      yearly: 24,
    },
    description: "Ideal for serious home buyers and investors",
    features: [
      "Unlimited property searches",
      "Advanced AI recommendations",
      "Save unlimited properties",
      "Market analysis reports",
      "Priority support",
      "Price alerts",
      "Virtual tours",
      "Mortgage calculator",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
];

