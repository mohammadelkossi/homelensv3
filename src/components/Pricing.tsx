"use client";

import { PricingCard } from "@/components/PricingCard";
import { PricingHeader } from "@/components/PricingHeader";
import { PAYMENT_FREQUENCIES, TIERS } from "@/config/pricing";
import { useState } from "react";

export const Pricing = () => {
  const [selectedPaymentFreq, setSelectedPaymentFreq] = useState(
    PAYMENT_FREQUENCIES[0],
  );

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
          />
        ))}
      </div>
    </section>
  );
};

