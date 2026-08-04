import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Calculator } from "lucide-react"

export default function UpfrontCostsPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar isScrolled />
      <main className="flex-1">
        <section className="border-b border-[#CFDEE7] bg-[#CFDEE7]/40">
          <div className="container mx-auto px-4 sm:px-6 py-12 md:py-16 max-w-3xl">
            <div className="flex items-center gap-3 mb-3">
              <Calculator className="h-8 w-8 text-[#0A369D]" />
              <p className="text-sm font-semibold uppercase tracking-wide text-[#4472CA]">
                Upfront costs
              </p>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#0A369D] mb-3">
              What will it cost to buy this home?
            </h1>
            <p className="text-base md:text-lg text-gray-700 max-w-2xl">
              Estimate stamp duty, deposit, legal fees, and other costs you pay before moving in.
            </p>
          </div>
        </section>

        <div className="container mx-auto px-4 sm:px-6 py-10 max-w-3xl">
          <p className="text-gray-600">Calculator coming soon.</p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
