"use client"

import { useEffect, useState } from "react"

const STORAGE_KEY_PREFIX = "homelens_report_price_per_sqm:"
const CACHE_VERSION = 1

export type PricePerSqmStats = {
  averagePricePerSqm: number | null
  averagePricePerSqmSimple: number | null
  averagePricePerSqmMatchedSaleCount: number
}
type StoredEnvelope = PricePerSqmStats & { v: typeof CACHE_VERSION }

function storageKey(outcode: string, propertyType: string): string {
  return `${STORAGE_KEY_PREFIX}${outcode}:${propertyType}`
}

function readStored(key: string): PricePerSqmStats | undefined {
  if (typeof window === "undefined") return undefined
  const raw = sessionStorage.getItem(key)
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as Partial<StoredEnvelope>
    if (parsed.v !== CACHE_VERSION) {
      sessionStorage.removeItem(key)
      return undefined
    }
    return {
      averagePricePerSqm: parsed.averagePricePerSqm ?? null,
      averagePricePerSqmSimple: parsed.averagePricePerSqmSimple ?? null,
      averagePricePerSqmMatchedSaleCount: parsed.averagePricePerSqmMatchedSaleCount ?? 0,
    }
  } catch {
    sessionStorage.removeItem(key)
    return undefined
  }
}

function store(key: string, data: PricePerSqmStats) {
  if (typeof window === "undefined") return
  const envelope: StoredEnvelope = { ...data, v: CACHE_VERSION }
  sessionStorage.setItem(key, JSON.stringify(envelope))
}

/**
 * Fetches §01's "£/m² vs district average" stat, kept out of the report-generation
 * critical path — resolving a floor area for up to 500 district sales via EPC/Homedata
 * was by far the slowest thing /api/scrape-property did (Sentry traces showed 10-50s+,
 * occasionally pushing the whole request past its 60s timeout). See /api/price-per-sqm.
 */
export function usePricePerSqm(outcode: string | null, propertyType: string | null) {
  const key = outcode && propertyType && propertyType !== "N/A" ? storageKey(outcode, propertyType) : null
  const initial = key ? readStored(key) : undefined
  const [stats, setStats] = useState<PricePerSqmStats | null>(() => initial ?? null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!key || !outcode || !propertyType) return
    if (readStored(key) !== undefined) return

    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) setLoading(true)
    })

    const params = new URLSearchParams({ outcode, propertyType })

    void fetch(`/api/price-per-sqm?${params.toString()}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: PricePerSqmStats | null) => {
        if (cancelled || !data) return
        setStats(data)
        // Only cache a genuine result — a transient failure (null response) should
        // just re-fetch next time rather than get stuck as permanent "nothing".
        if (data.averagePricePerSqm !== null || data.averagePricePerSqmMatchedSaleCount > 0) {
          store(key, data)
        }
      })
      .catch((error) => {
        console.error("Failed to load price per sqm stats:", error)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [key, outcode, propertyType])

  return { stats, loading }
}
