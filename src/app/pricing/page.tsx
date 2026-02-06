"use client"

import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Pricing } from "@/components/Pricing"

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white" style={{ backgroundColor: '#FFFFFF' }}>
      <Navbar />
      <div className="container mx-auto px-4 sm:px-6 py-12 font-sans">
        <Pricing />
      </div>
      <Footer />
    </div>
  )
}
