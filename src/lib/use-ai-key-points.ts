"use client"

import { useEffect, useRef, useState } from "react"
import type { KeyPoints, RuleItem } from "@/lib/rules-engine"
import type { ReportFindings } from "@/lib/key-points/findings"
import type { AiOffer } from "@/lib/key-points/offer"

// v3: the offer and the points are cached separately, as they arrive separately.
const STORAGE_PREFIX = "homelens_key_points:v3:"

type Insights = { keyPoints: KeyPoints; offer: AiOffer | null }
type Part = "offer" | "points"
/** Saved insights for a fixed report (e.g. the public sample), used instead of calling the model. */
export type ReportInsightsPreset = Insights
/** Wait this long after the report's background data settles, in case more is still arriving. */
const SETTLE_MS = 800
/** Never wait longer than this for slow background data before asking anyway. */
const MAX_WAIT_MS = 25_000

type Status = "waiting" | "loading" | "done" | "failed"

// Cached values: the offer may be null (it failed its checks), so a cache hit is
// "the entry exists", not "the value is truthy".
type Cached = { offer?: AiOffer | null; keyPoints?: KeyPoints }

function readCache(key: string | null): Cached {
  if (!key || typeof window === "undefined") return {}
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
    return raw ? (JSON.parse(raw) as Cached) : {}
  } catch {
    return {}
  }
}

function writeCache(key: string | null, update: Cached) {
  if (!key || typeof window === "undefined") return
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify({ ...readCache(key), ...update }))
  } catch {
    // Storage full or blocked: the insights just won't survive a reload.
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
  const [cached] = useState<Cached>(() => (preset ? preset : readCache(cacheKey)))
  const [offer, setOffer] = useState<AiOffer | null>(cached.offer ?? null)
  const [aiKeyPoints, setAiKeyPoints] = useState<KeyPoints | null>(cached.keyPoints ?? null)
  const [offerStatus, setOfferStatus] = useState<Status>("offer" in cached ? "done" : "waiting")
  const [pointsStatus, setPointsStatus] = useState<Status>(cached.keyPoints ? "done" : "waiting")
  // Latest findings, read when the requests fire (they fill in as background data arrives).
  const findingsRef = useRef(findings)
  useEffect(() => {
    findingsRef.current = findings
  })
  const startedRef = useRef(false)
  const [mountedAt] = useState(() => Date.now())

  useEffect(() => {
    if (startedRef.current) return
    const parts: Part[] = []
    if (offerStatus === "waiting") parts.push("offer")
    if (pointsStatus === "waiting") parts.push("points")
    if (parts.length === 0) return
    let cancelled = false
    const waitedMs = Date.now() - mountedAt
    const delay = ready ? SETTLE_MS : Math.max(0, MAX_WAIT_MS - waitedMs)

    const timer = window.setTimeout(() => {
      if (cancelled || startedRef.current) return
      startedRef.current = true
      // The offer and the points are written in parallel; each shows as soon as it lands.
      for (const part of parts) {
        const setStatus = part === "offer" ? setOfferStatus : setPointsStatus
        setStatus("loading")
        void fetch("/api/key-points", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ findings: findingsRef.current, part }),
        })
          .then((response) => (response.ok ? response.json() : null))
          .then((data: { keyPoints?: KeyPoints; offer?: AiOffer | null } | null) => {
            if (part === "offer") {
              if (!data || !("offer" in data)) return setOfferStatus("failed")
              setOffer(data.offer ?? null)
              writeCache(cacheKey, { offer: data.offer ?? null })
              setOfferStatus("done")
            } else {
              if (!data?.keyPoints) return setPointsStatus("failed")
              setAiKeyPoints(data.keyPoints)
              writeCache(cacheKey, { keyPoints: data.keyPoints })
              setPointsStatus("done")
            }
          })
          .catch(() => setStatus("failed"))
      }
    }, delay)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [ready, offerStatus, pointsStatus, cacheKey, mountedAt])

  const keyPoints = aiKeyPoints ? mergeWithFallback(aiKeyPoints, fallback) : fallback
  return {
    keyPoints,
    /** Null until it arrives, or if the model's offer failed its checks: show the rule-based offer then. */
    offer,
    loading: pointsStatus === "waiting" || pointsStatus === "loading",
    offerLoading: offerStatus === "waiting" || offerStatus === "loading",
  } as const
}
