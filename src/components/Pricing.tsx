"use client";

import { PricingCard } from "@/components/PricingCard";
import { PricingHeader } from "@/components/PricingHeader";
import { PAYMENT_FREQUENCIES, TIERS } from "@/config/pricing";
import { useLoginPopup } from "@/components/login-popup";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { useState, useEffect } from "react";
import posthog from "posthog-js";

export const Pricing = () => {
  const [selectedPaymentFreq, setSelectedPaymentFreq] = useState(
    PAYMENT_FREQUENCIES[0],
  );
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const { openSignup } = useLoginPopup();

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    const supabase = createBrowserClient(url, key);
    supabase.auth.getUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {});
    return () => subscription.unsubscribe();
  }, []);

  const handleCtaClick = async (tier: (typeof TIERS)[0]) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    const supabase = createBrowserClient(url, key);
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      openSignup();
      return;
    }

    setCheckoutLoading(tier.id);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: tier.checkoutPlan }),
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
        posthog.capture("checkout_initiated", { plan: tier.checkoutPlan });
        window.location.href = data.url;
      } else setCheckoutLoading(null);
    } catch (e) {
      setCheckoutLoading(null);
      alert(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  return (
    <section className="flex flex-col items-center gap-10 py-10 font-sans" style={{ backgroundColor: "transparent" }}>
      <PricingHeader
        title="Plans and Pricing"
        subtitle="Subscribe monthly or pay once for lifetime Pro access."
        frequencies={PAYMENT_FREQUENCIES}
        selectedFrequency={selectedPaymentFreq}
        onFrequencyChange={setSelectedPaymentFreq}
      />

      <div className="grid w-full max-w-4xl gap-6 sm:grid-cols-2 xl:grid-cols-2">
        {TIERS.map((tier, i) => (
          <PricingCard
            key={i}
            tier={tier}
            paymentFrequency={selectedPaymentFreq}
            onCtaClick={handleCtaClick}
            ctaDisabled={checkoutLoading === tier.id}
          />
        ))}
      </div>
    </section>
  );
};
