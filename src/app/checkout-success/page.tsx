"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

const REDIRECT_DELAY_MS = 5000

export default function CheckoutSuccessPage() {
  const router = useRouter()
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_DELAY_MS / 1000)

  useEffect(() => {
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
  }, [router])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-16 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
        <div className="rounded-full bg-green-100 text-green-600 w-16 h-16 flex items-center justify-center mb-6 text-3xl">
          ✓
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          Thanks for subscribing
        </h1>
        <p className="text-gray-600 mb-6">
          You now have unlimited property searches. We&apos;re taking you to your preferences.
        </p>
        <p className="text-sm text-gray-500">
          Redirecting in {secondsLeft} second{secondsLeft !== 1 ? "s" : ""}…
        </p>
      </main>
      <Footer />
    </div>
  )
}
