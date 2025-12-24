"use client"

import { useState } from "react"
import { Calendar } from "lucide-react"
import { TIERS } from "@/config/pricing"

export function PricingCards() {
  const [fastDelivery, setFastDelivery] = useState(false)

  const LightCheckIcon = ({ className }: { className?: string }) => (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="8" cy="8" r="8" fill="#111827" />
      <path d="M5.5 8.5L7 10L11 6" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  const DarkCheckIcon = ({ className }: { className?: string }) => (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="8" cy="8" r="7.5" stroke="#4B5563" />
      <path d="M5.5 8.5L7 10L11 6" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )

  const ToggleSwitch = ({ enabled, onChange, isDark = false }: { enabled: boolean; onChange: (value: boolean) => void; isDark?: boolean }) => (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(!enabled)}
        className={`
          relative inline-flex h-6 w-10 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none
          ${enabled ? (isDark ? "bg-white" : "bg-gray-900") : isDark ? "bg-[#2C2C2E]" : "bg-gray-200"}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full transition-transform duration-200 ease-in-out
            ${enabled ? "translate-x-5" : "translate-x-1"}
            ${isDark ? (enabled ? "bg-gray-900" : "bg-gray-400") : "bg-white"}
          `}
        />
      </button>
      <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Fast delivery (5 days)</span>
    </div>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-[820px]">
      {TIERS.map((tier, index) => {
        const isDark = index === 1 // Make the second card dark
        const CheckIcon = isDark ? DarkCheckIcon : LightCheckIcon
        const price = typeof tier.price.monthly === "number" 
          ? `$${tier.price.monthly}` 
          : tier.price.monthly

        return (
          <div 
            key={tier.id}
            className={`${isDark ? "bg-[#262626]" : "bg-gray-100"} rounded-3xl p-2 ${isDark ? "shadow-[0_12px_50px_-15px_rgba(0,0,0,0.25)]" : "shadow-[0_12px_50px_-15px_rgba(0,0,0,0.1)] border border-gray-200/60"} flex flex-col`}
          >
            <div className={`${isDark ? "bg-[#2C2C2E]" : "bg-white"} rounded-2xl p-8 mb-2`}>
              <h2 className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"} mb-2 tracking-tight`}>
                {tier.name}
              </h2>
              <p className={`${isDark ? "text-gray-400" : "text-gray-500"} text-base leading-relaxed mb-8`}>
                {tier.description}
              </p>
              <div className="flex items-baseline mb-8">
                <span className={`text-5xl font-bold ${isDark ? "text-white" : "text-gray-900"} tracking-tighter`}>
                  {price}
                </span>
                {typeof tier.price.monthly === "number" && (
                  <span className={`${isDark ? "text-gray-500" : "text-gray-400"} text-lg ml-1`}>/month</span>
                )}
              </div>
              <button className={`w-full ${isDark ? "bg-white text-gray-900" : "bg-[#111827] text-white"} py-4 rounded-xl font-semibold text-base hover:opacity-90 transition-opacity duration-200 flex items-center justify-center gap-2.5 ${isDark ? "shadow-[0_4px_20px_-5px_rgba(255,255,255,0.2)]" : "shadow-[0_4px_20px_-5px_rgba(0,0,0,0.2)]"}`}>
                {tier.cta}
                <Calendar className={`w-5 h-5 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
              </button>
            </div>
            <div className={`${isDark ? "" : "bg-gray-100"} px-6 pb-6 pt-4 flex-grow flex flex-col`}>
              <div className="grid grid-cols-2 gap-y-4 gap-x-4 mb-auto">
                {tier.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <CheckIcon className="w-4 h-4 flex-shrink-0" />
                    <span className={`${isDark ? "text-gray-300" : "text-gray-700"} text-sm font-medium`}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <ToggleSwitch enabled={fastDelivery} onChange={setFastDelivery} isDark={isDark} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

