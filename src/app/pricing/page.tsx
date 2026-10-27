"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Pricing } from "@/components/Pricing"
import { interBody, interTight } from "@/app/results/report-fonts"

export default function PricingPage() {
  return (
    <div
      className={`min-h-screen bg-white ${interBody.variable} ${interTight.variable}`}
      style={{ backgroundColor: '#FBFAF7', fontFamily: 'var(--font-report-body)' }}
    >
      <Navbar />
      <div className="container mx-auto px-4 sm:px-6 py-12">
        <Pricing />
      </div>
      <Footer />
    </div>
  )
}
