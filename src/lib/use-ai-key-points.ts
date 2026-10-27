"use client"

import { useEffect, useRef, useState } from "react"
import type { KeyPoints, RuleItem } from "@/lib/rules-engine"
import type { ReportFindings } from "@/lib/key-points/findings"
import type { AiOffer } from "@/lib/key-points/offer"

// v2: the response now carries the recommended offer too.
const STORAGE_PREFIX = "homelens_key_points:v2:"

type Insights = { keyPoints: KeyPoints; offer: AiOffer | null }
/** Saved insights for a fixed report (e.g. the public sample), used instead of calling the model. */
export type ReportInsightsPreset = Insights
/** Wait this long after the report's background data settles, in case more is still arriving. */
const SETTLE_MS = 800
/** Never wait longer than this for slow background data before asking anyway. */
const MAX_WAIT_MS = 25_000

type Status = "waiting" | "loading" | "done" | "failed"

function readCache(key: string | null): Insights | null {
  if (!key || typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
    return raw ? (JSON.parse(raw) as Insights) : null
  } catch {
    return null
  }
}

function writeCache(key: string | null, insights: Insights) {
  if (!key || typeof window === "undefined") return
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(insights))
  } catch {
    // Storage full or blocked: the points just won't survive a reload.
  }
}

/** AI points first; any tab with fewer than three is topped up from the rule-based points. */
function mergeWithFallback(ai: KeyPoints, fallback: KeyPoints): KeyPoints {
  const fill = (items: RuleItem[], extra: RuleItem[]) => {
    const titles = new Set(items.map((i) => i.title.toLowerCase()))
    return [...items, ...extra.filter((i) => !titles.has(i.title.toLowerCase()))].slice(0, 3)
  }
  return { know: fill(ai.know, fallback.know), consider: fill(ai.consider, fallback.consider), ask: fill(ai.ask, fallback.ask) }
}

/**
 * The recommended offer (§01) and key points (§00), written by the model from the
 * report's findings once its background data has loaded. Cached per report for the
 * tab's session; the rule-based offer and points are used if the request fails.
 */
export function useAiKeyPoints(
  findings: ReportFindings,
  ready: boolean,
  cacheKey: string | null,
  fallback: KeyPoints,
  preset: Insights | null = null
) {
  const [insights, setInsights] = useState<Insights | null>(() => preset ?? readCache(cacheKey))
  const [status, setStatus] = useState<Status>(() => (preset || readCache(cacheKey) ? "done" : "waiting"))
  // Latest findings, read when the request fires (they fill in as background data arrives).
  const findingsRef = useRef(findings)
  useEffect(() => {
    findingsRef.current = findings
  })
  const startedRef = useRef(false)
  const [mountedAt] = useState(() => Date.now())

  useEffect(() => {
    if (startedRef.current || status !== "waiting") return
    let cancelled = false
    const waitedMs = Date.now() - mountedAt
    const delay = ready ? SETTLE_MS : Math.max(0, MAX_WAIT_MS - waitedMs)

    const timer = window.setTimeout(() => {
      if (cancelled || startedRef.current) return
      startedRef.current = true
      setStatus("loading")
      void fetch("/api/key-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findings: findingsRef.current }),
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { keyPoints?: KeyPoints; offer?: AiOffer | null } | null) => {
          if (!data?.keyPoints) {
            setStatus("failed")
            return
          }
          const result = { keyPoints: data.keyPoints, offer: data.offer ?? null }
          setInsights(result)
          writeCache(cacheKey, result)
          setStatus("done")
        })
        .catch(() => setStatus("failed"))
    }, delay)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [ready, status, cacheKey, mountedAt])

  const keyPoints = insights ? mergeWithFallback(insights.keyPoints, fallback) : fallback
  return {
    keyPoints,
    /** Null until it arrives, or if the model's offer failed its checks: show the rule-based offer then. */
    offer: insights?.offer ?? null,
    loading: status === "waiting" || status === "loading",
  } as const
}
