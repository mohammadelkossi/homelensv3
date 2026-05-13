"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useLoginPopup } from "@/components/login-popup"
import posthog from "posthog-js"
import {
  REPORT_GENERATION_STAGES,
  buildResultsSearchParams,
  clearPendingReportPayload,
  getActiveStageIndex,
  getReportProgressPercent,
  readPendingReportPayload,
  type PendingReportPayload,
} from "@/lib/report-generation"

export default function GeneratingPage() {
  const router = useRouter()
  const { openUpgradeLimit } = useLoginPopup()
  const [elapsedSec, setElapsedSec] = useState(0)
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const startedRef = useRef(false)

  const activeStage = getActiveStageIndex(elapsedSec)
  const progress = getReportProgressPercent(elapsedSec, complete)

  useEffect(() => {
    const tick = window.setInterval(() => {
      setElapsedSec((s) => s + 0.1)
    }, 100)
    return () => window.clearInterval(tick)
  }, [])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const payload = readPendingReportPayload()
    if (!payload) {
      router.replace("/preferences")
      return
    }

    void runGeneration(payload)
  }, [router])

  async function runGeneration(payload: PendingReportPayload) {
    try {
      const response = await fetch("/api/scrape-property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: payload.url,
          postcode: payload.postcode,
          preferences: payload.preferences,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        if (response.status === 403 && data.error === "limit_reached") {
          clearPendingReportPayload()
          posthog.capture("upgrade_limit_shown", { property_url: payload.url })
          openUpgradeLimit()
          router.back()
          return
        }
        throw new Error(data.error || data.message || "Failed to generate report")
      }

      const data = await response.json()
      posthog.capture("report_generated", { property_url: payload.url })
      clearPendingReportPayload()
      setComplete(true)

      const params = buildResultsSearchParams(data, payload)
      window.setTimeout(() => {
        router.push(`/results?${params.toString()}`)
      }, 400)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to generate report"
      posthog.capture("report_generation_failed", {
        property_url: payload.url,
        error_message: message,
      })
      if (err instanceof Error) posthog.captureException(err)
      clearPendingReportPayload()
      setError(message)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-16">
        <div className="w-full max-w-md">
          <h1 className="text-xl sm:text-2xl font-semibold text-center mb-2" style={{ color: "#0A369D" }}>
            Building your report
          </h1>
          <p className="text-sm text-center text-gray-600 mb-10">
            This usually takes 18–25 seconds
          </p>

          {error ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
              <button
                type="button"
                onClick={() => router.push("/preferences")}
                className="text-sm font-medium text-[#0A369D] hover:underline"
              >
                Back to preferences
              </button>
            </div>
          ) : (
            <>
              <ul className="space-y-4 mb-8" aria-live="polite">
                {REPORT_GENERATION_STAGES.map((stage, index) => {
                  const isActive = index === activeStage && !complete
                  const isDone = index < activeStage || complete
                  return (
                    <li
                      key={stage.label}
                      className={`flex items-center gap-3 text-sm transition-colors ${
                        isActive
                          ? "font-semibold text-[#0A369D]"
                          : isDone
                            ? "text-gray-500"
                            : "text-gray-400"
                      }`}
                    >
                      <span
                        className={`flex h-2 w-2 shrink-0 rounded-full ${
                          isActive
                            ? "bg-[#0A369D] animate-pulse"
                            : isDone
                              ? "bg-[#0A369D]/50"
                              : "bg-gray-300"
                        }`}
                        aria-hidden
                      />
                      {stage.label}
                    </li>
                  )
                })}
              </ul>

              <div
                className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
              >
                <div
                  className="h-full rounded-full bg-[#0A369D] transition-[width] duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
