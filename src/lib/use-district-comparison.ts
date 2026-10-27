"use client"

import { useEffect, useState } from "react"
import type { DistrictYearlyData, DistrictSalesTrend, NearbySale } from "@/lib/district-comparison"

const STORAGE_KEY_PREFIX = "homelens_report_district_comparison:"
// Bump this whenever DistrictYearlyData/DistrictSalesTrend/NearbySale's shape changes, so a
// tab with an older cached blob (e.g. from before a field rename) re-fetches instead of
// silently feeding stale-shaped data into the charts for the rest of that session.
const CACHE_VERSION = 2

type StoredData = { districts: DistrictYearlyData[]; salesTrend: DistrictSalesTrend | null; nearestSales: NearbySale[] }
type StoredEnvelope = StoredData & { v: typeof CACHE_VERSION }

// Keyed by outcode+propertyType, not a single fixed key — otherwise the first report
// generated in a tab would cache its district data forever, and every later report in
// that same tab (a different property, usually a different outcode) would silently
// keep showing the first one's §01/§02 charts instead of fetching its own.
function storageKey(outcode: string, propertyType: string): string {
  return `${STORAGE_KEY_PREFIX}${outcode}:${propertyType}`
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
    return parsed as StoredData
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

/** Fetches §01/§02's district comparison, sales trend, and nearest-sales data once per report, kept out of the generation critical path. */
export function useDistrictComparison(
  outcode: string | null,
  propertyType: string | null,
  latitude: string | null,
  longitude: string | null
) {
  const key = outcode && propertyType && propertyType !== "N/A" ? storageKey(outcode, propertyType) : null
  const initial = key ? readStored(key) : undefined
  const [districts, setDistricts] = useState<DistrictYearlyData[]>(() => initial?.districts ?? [])
  const [salesTrend, setSalesTrend] = useState<DistrictSalesTrend | null>(() => initial?.salesTrend ?? null)
  const [nearestSales, setNearestSales] = useState<NearbySale[]>(() => initial?.nearestSales ?? [])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!key || !outcode || !propertyType) return
    if (readStored(key) !== undefined) return

    let cancelled = false
    // Deferred a tick so this isn't a synchronous setState call inside the effect body.
    queueMicrotask(() => {
      if (!cancelled) setLoading(true)
    })

    const params = new URLSearchParams({ outcode, propertyType })
    if (latitude && latitude !== "N/A") params.set("lat", latitude)
    if (longitude && longitude !== "N/A") params.set("lon", longitude)

    void fetch(`/api/district-comparison?${params.toString()}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: StoredData | null) => {
        if (cancelled || !data) return
        setDistricts(data.districts)
        setSalesTrend(data.salesTrend)
        setNearestSales(data.nearestSales)
        store(key, data)
      })
      .catch((error) => {
        console.error("Failed to load district comparison:", error)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [key, outcode, propertyType, latitude, longitude])

  return { districts, salesTrend, nearestSales, loading }
}
