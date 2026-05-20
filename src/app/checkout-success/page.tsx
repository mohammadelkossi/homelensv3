"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import posthog from "posthog-js"

const REDIRECT_DELAY_MS = 5000

function CheckoutSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const plan = searchParams.get("plan") === "lifetime" ? "lifetime" : "monthly"
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_DELAY_MS / 1000)

  useEffect(() => {
    posthog.capture("checkout_completed", { plan })
    const redirectTimer = setTimeout(() => {
      router.replace("/preferences")
    }, REDIRECT_DELAY_MS)
    const interval = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => {
      clearTimeout(redirectTimer)
      clearInterval(interval)
    }
  }, [router, plan])

  return (
    <main className="flex-1 container mx-auto px-4 sm:px-6 py-16 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
      <div className="rounded-full bg-green-100 text-green-600 w-16 h-16 flex items-center justify-center mb-6 text-3xl">
        ✓
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">
        {plan === "lifetime" ? "Thanks for your purchase" : "Thanks for subscribing"}
      </h1>
      <p className="text-gray-600 mb-6">
        You now have Pro access. We&apos;re taking you to your preferences.
      </p>
      <p className="text-sm text-gray-500">
        Redirecting in {secondsLeft} second{secondsLeft !== 1 ? "s" : ""}…
      </p>
    </main>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <Suspense
        fallback={
          <main className="flex-1 flex items-center justify-center py-16 text-gray-600">
            Loading…
          </main>
        }
      >
        <CheckoutSuccessContent />
      </Suspense>
      <Footer />
    </div>
  )
}
