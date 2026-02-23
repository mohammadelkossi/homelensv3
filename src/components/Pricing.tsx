"use client";

import { PricingCard } from "@/components/PricingCard";
import { PricingHeader } from "@/components/PricingHeader";
import { PAYMENT_FREQUENCIES, TIERS } from "@/config/pricing";
import { useLoginPopup } from "@/components/login-popup";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export const Pricing = () => {
  const [selectedPaymentFreq, setSelectedPaymentFreq] = useState(
    PAYMENT_FREQUENCIES[0],
  );
  const [user, setUser] = useState<User | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const { openSignup } = useLoginPopup();
  const router = useRouter();

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    const supabase = createBrowserClient(url, key);
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleCtaClick = async (tier: (typeof TIERS)[0]) => {
    if (tier.id === "professional") {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) return;
      const supabase = createBrowserClient(url, key);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        openSignup();
        return;
      }
      setCheckoutLoading(true);
      try {
        const res = await fetch("/api/stripe/create-checkout-session", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to start checkout");
        if (data.url) window.location.href = data.url;
        else setCheckoutLoading(false);
      } catch (e) {
        setCheckoutLoading(false);
        alert(e instanceof Error ? e.message : "Something went wrong");
      }
      return;
    }
    if (tier.id === "basic") {
      router.push("/preferences");
    }
  };

  return (
    <section className="flex flex-col items-center gap-10 py-10 font-sans" style={{ backgroundColor: 'transparent' }}>
      {/* Section Header */}
      <PricingHeader
        title="Plans and Pricing"
        subtitle="Simple monthly pricing. No long-term commitment."
        frequencies={PAYMENT_FREQUENCIES}
        selectedFrequency={selectedPaymentFreq}
        onFrequencyChange={setSelectedPaymentFreq}
      />

      {/* Pricing Cards */}
      <div className="grid w-full max-w-4xl gap-6 sm:grid-cols-2 xl:grid-cols-2">
        {TIERS.map((tier, i) => (
          <PricingCard
            key={i}
            tier={tier}
            paymentFrequency={selectedPaymentFreq}
            onCtaClick={handleCtaClick}
            ctaDisabled={tier.id === "professional" && checkoutLoading}
          />
        ))}
      </div>
    </section>
  );
};

