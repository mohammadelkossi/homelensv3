"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import posthog from "posthog-js";
import { Check } from "lucide-react";
import { useLoginPopup } from "@/components/login-popup";
import { LIFETIME_ORIGINAL_PRICE, LIFETIME_PRICE, MONTHLY_PRICE, type CheckoutPlan } from "@/config/pricing";

/** Concierge is sold on an intro call, not through Stripe. */
const CONCIERGE_INTRO_URL = "https://calendly.com/mohammad-homelens/intro-call";
const CONCIERGE_PRICE = 495;

type Variant = "light" | "accent" | "ink";

type Plan = {
  code: string;
  price: number;
  /** Struck-through price for a sale. */
  wasPrice?: number | null;
  /** Small label at the right of the card's top row. */
  tag?: string;
  name: string;
  cta: string;
  lines: string[];
  variant: Variant;
} & ({ checkoutPlan: CheckoutPlan } | { href: string });

const PLANS: Plan[] = [
  {
    code: "PRO / MONTHLY",
    price: MONTHLY_PRICE,
    name: "Pro Monthly",
    cta: "SUBSCRIBE",
    variant: "light",
    checkoutPlan: "monthly",
    lines: [
      "50 property analyses a month",
      "HomeLens score, financial + lifestyle",
      "Area averages and price trends",
      "Strengths and red flags",
      "EPC, price history and amenities",
      "Cancel anytime",
    ],
  },
  {
    code: "PRO / LIFETIME",
    price: LIFETIME_PRICE,
    wasPrice: LIFETIME_ORIGINAL_PRICE,
    tag: "MOST POPULAR",
    name: "Pro Lifetime",
    cta: "BUY ONCE",
    variant: "accent",
    checkoutPlan: "lifetime",
    lines: [
      "Everything in Pro Monthly",
      "Pay once, no subscription",
      "Still yours for your next move",
      "Works on any Rightmove listing",
    ],
  },
  {
    code: "CONCIERGE",
    price: CONCIERGE_PRICE,
    name: "Concierge",
    cta: "BOOK AN INTRO CALL",
    variant: "ink",
    href: CONCIERGE_INTRO_URL,
    lines: [
      "Lifetime Pro included",
      "Onboarding call + buyer brief",
      "Weekly best-match listings",
      "Deep-dive on up to 3 contenders",
      "Offer strategy with comparables",
      "Survey read-through",
      "Direct line until completion",
    ],
  },
];

const VARIANTS: Record<Variant, { card: string; rule: string; muted: string; button: string }> = {
  light: {
    card: "bg-white text-[#0B0B0C] border-[#D4D4D8]",
    rule: "border-[#E6E6E8]",
    muted: "text-[#6B6B70]",
    button: "border border-[#0B0B0C] bg-white text-[#0B0B0C] hover:bg-[#F4F4F5]",
  },
  accent: {
    card: "bg-[#0A369D] text-white border-[#0A369D]",
    rule: "border-white/[0.22]",
    muted: "text-[#D3DCEC]",
    button: "bg-white text-[#0B0B0C] hover:bg-[#E6E6E8]",
  },
  ink: {
    card: "bg-[#0B0B0C] text-white border-[#0B0B0C]",
    rule: "border-[#2A2A2E]",
    muted: "text-[#9A9AA0]",
    button: "bg-white text-[#0B0B0C] hover:bg-[#E6E6E8]",
  },
};

const BUTTON_BASE =
  "flex min-h-[46px] w-full items-center justify-center rounded-none text-[14px] font-semibold tracking-[0.04em] no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0A369D]/60 disabled:cursor-wait disabled:opacity-70";

export const Pricing = () => {
  const [checkoutLoading, setCheckoutLoading] = useState<CheckoutPlan | null>(null);
  const { openSignup } = useLoginPopup();

  const startCheckout = async (plan: CheckoutPlan) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    const supabase = createBrowserClient(url, key);
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      openSignup();
      return;
    }

    setCheckoutLoading(plan);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const raw = await res.text();
      let data: { url?: string; error?: string };
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error("Checkout failed — invalid server response. Check the terminal logs.");
      }
      if (!res.ok) throw new Error(data.error || "Failed to start checkout");
      if (data.url) {
        posthog.capture("checkout_initiated", { plan });
        window.location.href = data.url;
      } else setCheckoutLoading(null);
    } catch (e) {
      setCheckoutLoading(null);
      alert(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  return (
    <section className="px-6 py-14 md:py-[88px]" style={{ fontFamily: "var(--font-report-body)", color: "#0B0B0C" }}>
      <div className="mx-auto flex max-w-[1152px] flex-col gap-12">
        <div className="grid items-end gap-6 border-b-2 border-[#0B0B0C] pb-6 md:grid-cols-2">
          <h1
            className="m-0 text-[36px] font-medium leading-[1.05] tracking-[-0.02em] md:text-[48px]"
            style={{ fontFamily: "var(--font-report-display)" }}
          >
            One report engine.
            <br />
            Three ways to use it.
          </h1>
          <p className="m-0 text-[16px] leading-[1.6] text-[#6B6B70]">
            Every plan runs the same HomeLens analysis on any Rightmove listing. The difference is how long you keep it,
            and whether a person reviews it with you.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const v = VARIANTS[plan.variant];
            const loading = "checkoutPlan" in plan && checkoutLoading === plan.checkoutPlan;
            return (
              <article key={plan.code} className={`flex flex-col rounded-none border ${v.card}`}>
                <div className={`flex min-h-[70px] items-center justify-between gap-3 border-b px-6 pb-5 pt-6 ${v.rule}`}>
                  <span className="text-[13px] font-semibold tracking-[0.08em]">{plan.code}</span>
                  {plan.tag && (
                    <span className="border border-current px-2 py-1 text-[11px] font-semibold leading-none tracking-[0.08em]">
                      {plan.tag}
                    </span>
                  )}
                </div>
                <div className={`flex flex-col gap-1.5 border-b p-6 ${v.rule}`}>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                    <span
                      className="text-[64px] font-normal leading-none tracking-[-0.03em]"
                      style={{ fontFamily: "var(--font-report-display)" }}
                    >
                      {plan.wasPrice && <span className="sr-only">Now </span>}£{plan.price}
                    </span>
                    {plan.wasPrice && (
                      <span className="inline-flex items-center gap-2">
                        <s
                          className={`text-[28px] font-normal leading-none tracking-[-0.02em] decoration-2 ${v.muted}`}
                          style={{ fontFamily: "var(--font-report-display)" }}
                        >
                          <span className="sr-only">was </span>£{plan.wasPrice}
                        </s>
                        <span className="bg-white px-2 py-1 text-[12px] font-semibold leading-none tracking-[0.08em] text-[#0B0B0C]">
                          {Math.round((1 - plan.price / plan.wasPrice) * 100)}% OFF
                        </span>
                      </span>
                    )}
                  </div>
                  <h2 className="m-0 text-[15px] font-semibold">{plan.name}</h2>
                </div>
                <ul className="m-0 flex flex-grow list-none flex-col gap-2.5 px-6 py-5">
                  {plan.lines.map((line) => (
                    <li key={line} className="flex items-start gap-2.5 text-[13px] leading-[1.45] tracking-[0.02em]">
                      <Check className={`mt-[2px] h-3.5 w-3.5 shrink-0 ${v.muted}`} strokeWidth={2.25} aria-hidden="true" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                <div className="px-6 pb-6 pt-5">
                  {"checkoutPlan" in plan ? (
                    <button
                      type="button"
                      className={`${BUTTON_BASE} ${v.button}`}
                      onClick={() => startCheckout(plan.checkoutPlan)}
                      disabled={loading}
                    >
                      {loading ? "LOADING…" : plan.cta}
                    </button>
                  ) : (
                    <a
                      href={plan.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${BUTTON_BASE} ${v.button}`}
                      onClick={() => posthog.capture("concierge_intro_clicked")}
                    >
                      {plan.cta}
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <CostAnchor />
      </div>
    </section>
  );
};

/** Illustrative costs on a typical first home, to put Concierge in proportion. */
const ANCHOR_HOME_PRICE = 250_000;
const ANCHOR_BARS = [
  { label: "HomeLens Concierge", value: CONCIERGE_PRICE, color: "bg-[#0A369D]" },
  { label: "A buying agent at 1% of price", value: ANCHOR_HOME_PRICE * 0.01, color: "bg-[#9A9AA0]" },
  { label: "Overpaying by just 2%", value: ANCHOR_HOME_PRICE * 0.02, color: "bg-[#C2410C]" },
];

function CostAnchor() {
  const max = Math.max(...ANCHOR_BARS.map((b) => b.value));
  return (
    <div className="mt-8 flex flex-wrap items-end gap-12 border-t border-[#D4D4D8] pt-14">
      <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-4">
        <h2
          className="m-0 text-[40px] font-normal leading-[1.02] tracking-[-0.03em] md:text-[56px]"
          style={{ fontFamily: "var(--font-report-display)" }}
        >
          Buying blind
          <br />
          is expensive.
        </h2>
        <p className="m-0 max-w-[420px] text-[16px] leading-[1.6] text-[#6B6B70]">
          On a typical first home, one point of negotiation is worth thousands. Concierge costs a fraction of that, and
          pays for itself if it moves your offer once.
        </p>
      </div>
      <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-[18px]">
        <p className="m-0 text-[12px] font-semibold tracking-[0.1em] text-[#6B6B70]">
          ON A £{ANCHOR_HOME_PRICE.toLocaleString("en-GB")} HOME
        </p>
        <ul className="m-0 flex list-none flex-col gap-[18px] p-0">
          {ANCHOR_BARS.map((bar) => (
            <li key={bar.label} className="flex flex-col gap-1.5">
              <div className="flex justify-between gap-4 text-[14px]">
                <span>{bar.label}</span>
                <span className="font-semibold tabular-nums">£{bar.value.toLocaleString("en-GB")}</span>
              </div>
              <div className="h-3.5 bg-[#EFEFF1]" aria-hidden="true">
                <div className={`h-full ${bar.color}`} style={{ width: `${(bar.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
