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
import { interBody, interTight } from "@/app/results/report-fonts"
import { INK, MUTED, HAIRLINE, ACCENT, WARN, BODY_FONT, DISPLAY_FONT } from "@/components/tools/tool-ui"

export default function GeneratingPage() {
  const router = useRouter()
  const { openUpgradeLimit } = useLoginPopup()
  const [elapsedSec, setElapsedSec] = useState(0)
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const startedRef = useRef(false)

  const activeStage = getActiveStageIndex(elapsedSec)
  const progress = getReportProgressPercent(elapsedSec, complete)
  const displayPercent = Math.round(progress)

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

  function showPreviewFallback(payload: PendingReportPayload, reason: string) {
    posthog.capture("preview_fallback_shown", { property_url: payload.url, reason })
    clearPendingReportPayload()
    setComplete(true)
    window.setTimeout(() => {
      router.push("/results?previewFallback=1")
    }, 400)
  }

  async function runGeneration(payload: PendingReportPayload) {
    try {
      const response = await fetch(payload.preview ? "/api/preview-property" : "/api/scrape-property", {
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
        // A preview that couldn't read the listing (Rightmove blocked, timed out, or changed its
        // page) still shows the locked report, built from the sample, rather than an error.
        // A bad link (400) is the visitor's to fix, so that one still shows the error.
        if (payload.preview && response.status !== 400) {
          showPreviewFallback(payload, `status_${response.status}`)
          return
        }
        throw new Error(data.error || data.message || "Failed to generate report")
      }

      const data = await response.json()
      posthog.capture(payload.preview ? "preview_report_generated" : "report_generated", { property_url: payload.url })
      clearPendingReportPayload()
      setComplete(true)

      const params = buildResultsSearchParams(data, payload)
      window.setTimeout(() => {
        router.push(`/results?${params.toString()}`)
      }, 400)
    } catch (err: unknown) {
      if (payload.preview) {
        showPreviewFallback(payload, "network_error")
        return
      }
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
    <div
      className={`min-h-screen bg-[#FBFAF7] flex flex-col ${interBody.variable} ${interTight.variable}`}
      style={{ color: INK, fontFamily: BODY_FONT }}
    >
      <Navbar />
      <main className="flex-1 px-5 md:px-12" style={{ paddingTop: 64, paddingBottom: 64 }}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-3">
            <p style={{ margin: 0 }}>Building your report</p>
          </div>

          <div className="md:col-span-9">
            {error ? (
              <div>
                <p className="text-[15px]" style={{ color: WARN }}>
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/preferences")}
                  className="mt-4 text-[14px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#0A369D]/50"
                  style={{ color: ACCENT, textDecoration: "underline", textUnderlineOffset: 4 }}
                >
                  Back to preferences
                </button>
              </div>
            ) : (
              <div aria-live="polite">
                <div
                  className="leading-none"
                  style={{
                    fontFamily: DISPLAY_FONT,
                    fontWeight: 300,
                    letterSpacing: "-0.045em",
                    fontSize: "min(28vw, 200px)",
                    color: ACCENT,
                  }}
                >
                  {displayPercent}%
                </div>
                <p
                  className="text-[20px] sm:text-[26px] mt-6"
                  style={{ fontFamily: DISPLAY_FONT, fontWeight: 300, letterSpacing: "-0.02em", lineHeight: 1.3 }}
                >
                  {REPORT_GENERATION_STAGES[activeStage].description}
                </p>

                <div
                  className="mt-10"
                  style={{ height: 2, backgroundColor: HAIRLINE }}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={displayPercent}
                >
                  <div style={{ height: "100%", width: `${progress}%`, backgroundColor: INK, transition: "width 300ms ease-out" }} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-3.5 text-[12px]">
                  {REPORT_GENERATION_STAGES.map((stage, index) => {
                    const isActive = index === activeStage && !complete
                    const isDone = index < activeStage || complete
                    return (
                      <span key={stage.label} style={{ color: isActive ? ACCENT : isDone ? INK : MUTED }}>
                        {stage.number} {stage.label}
                        {isDone ? " ✓" : isActive ? "…" : ""}
                      </span>
                    )
                  })}
                </div>

                <p className="text-[12px] mt-12" style={{ color: MUTED }}>
                  This usually takes 18–25 seconds. Keep this tab open and active.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
