"use client"

import { useEffect, useState } from "react"
import type { CensusTenureBreakdown } from "@/lib/census-tenure"

const STORAGE_KEY_PREFIX = "homelens_report_census_tenure:"
// Bump whenever the stored shape changes, so a tab with an older cached blob re-fetches
// instead of silently feeding stale-shaped data into the UI.
const CACHE_VERSION = 2

type StoredData = { tenure: CensusTenureBreakdown | null; englandTenure: CensusTenureBreakdown | null }
type StoredEnvelope = StoredData & { v: typeof CACHE_VERSION }

// Keyed by postcode — the 2021 Census snapshot never changes, but without this key the first
// report generated in a tab would cache its tenure data forever and every later report in that
// tab (almost always a different property) would silently reuse it instead of fetching its own.
function storageKey(postcode: string): string {
  return `${STORAGE_KEY_PREFIX}${postcode}`
}

function readStored(key: string): StoredData | undefined {
  if (typeof window === "undefined") return undefined
  const raw = sessionStorage.getItem(key)
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as Partial<StoredEnvelope>
    if (parsed.v !== CACHE_VERSION) {
      sessionStorage.removeItem(key)
      return undefined
    }
    return { tenure: parsed.tenure ?? null, englandTenure: parsed.englandTenure ?? null }
  } catch {
    sessionStorage.removeItem(key)
    return undefined
  }
}

function store(key: string, data: StoredData) {
  if (typeof window === "undefined") return
  const envelope: StoredEnvelope = { ...data, v: CACHE_VERSION }
  sessionStorage.setItem(key, JSON.stringify(envelope))
}

/** Fetches §04's Census 2021 household tenure breakdown (this property's LSOA, plus the England benchmark), kept out of the generation critical path. */
export function useCensusTenure(postcode: string | null) {
  const key = postcode ? storageKey(postcode) : null
  const initial = key ? readStored(key) : undefined
  const [tenure, setTenure] = useState<CensusTenureBreakdown | null>(() => initial?.tenure ?? null)
  const [englandTenure, setEnglandTenure] = useState<CensusTenureBreakdown | null>(() => initial?.englandTenure ?? null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!key || !postcode) return
    if (readStored(key) !== undefined) return

    let cancelled = false
    // Deferred a tick so this isn't a synchronous setState call inside the effect body.
    queueMicrotask(() => {
      if (!cancelled) setLoading(true)
    })

    void fetch(`/api/census-tenure?postcode=${encodeURIComponent(postcode)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: StoredData | null) => {
        if (cancelled || !data) return
        setTenure(data.tenure)
        setEnglandTenure(data.englandTenure)
        store(key, data)
      })
      .catch((error) => {
        console.error("Failed to load census tenure:", error)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [key, postcode])

  return { tenure, englandTenure, loading }
}
