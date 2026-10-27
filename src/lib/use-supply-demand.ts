"use client"

import { useEffect, useState } from "react"
import type { ForSaleListing, SupplyDemandStats } from "@/lib/supply-demand"

const STORAGE_KEY_PREFIX = "homelens_report_supply_demand:"
// Bump whenever the stored shape changes, so a tab with an older cached blob re-fetches
// instead of silently feeding stale-shaped data into the UI. Bumped to 3 to also flush
// out empty results cached by tabs that pre-date the fix that stopped caching those.
const CACHE_VERSION = 3

export type SupplyDemand = SupplyDemandStats & { widened: boolean }
export type NearestForSaleListing = ForSaleListing & { distanceKm: number }
type StoredData = { supplyDemand: SupplyDemand | null; nearestForSale: NearestForSaleListing[] }
type StoredEnvelope = StoredData & { v: typeof CACHE_VERSION }

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
    return { supplyDemand: parsed.supplyDemand ?? null, nearestForSale: parsed.nearestForSale ?? [] }
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

/** Fetches §02's supply & demand (months-of-supply) card plus the nearest currently-for-sale listings, kept out of the generation critical path — a live Apify search can take tens of seconds. */
export function useSupplyDemand(
  outcode: string | null,
  propertyType: string | null,
  latitude: string | null,
  longitude: string | null,
  rightmoveUrl: string | null
) {
  const key = outcode && propertyType && propertyType !== "N/A" ? storageKey(outcode, propertyType) : null
  const initial = key ? readStored(key) : undefined
  const [supplyDemand, setSupplyDemand] = useState<SupplyDemand | null>(() => initial?.supplyDemand ?? null)
  const [nearestForSale, setNearestForSale] = useState<NearestForSaleListing[]>(() => initial?.nearestForSale ?? [])
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
    if (rightmoveUrl) params.set("rightmoveUrl", rightmoveUrl)

    void fetch(`/api/supply-demand?${params.toString()}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: StoredData | null) => {
        if (cancelled || !data) return
        const nearestForSale = data.nearestForSale ?? []
        setSupplyDemand(data.supplyDemand)
        setNearestForSale(nearestForSale)
        // The API returns this same empty shape both when there's genuinely nothing to
        // show AND when the live Apify search failed transiently — those aren't
        // distinguishable here, so don't cache an empty result either way. Worst case,
        // a genuinely sparse district just re-fetches next time (cheap); the upside is
        // a transient failure never gets stuck as permanent cached "nothing" for the
        // rest of this tab's session.
        if (data.supplyDemand !== null || nearestForSale.length > 0) {
          store(key, { supplyDemand: data.supplyDemand, nearestForSale })
        }
      })
      .catch((error) => {
        console.error("Failed to load supply & demand:", error)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [key, outcode, propertyType, latitude, longitude, rightmoveUrl])

  return { supplyDemand, nearestForSale, loading }
}
