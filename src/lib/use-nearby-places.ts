"use client"

import { useEffect, useState } from "react"
import {
  emptyNearbyPlaces,
  hasNearbyPlacesContent,
  mergeNearbyPlaces,
  readStoredNearbyPlaces,
  storeNearbyPlaces,
  type NearbyPlacesResult,
} from "@/lib/nearby-amenities"

function parseNearbyPlacesParam(param: string | null): NearbyPlacesResult | null {
  if (!param || param === "null") return null
  try {
    return JSON.parse(param) as NearbyPlacesResult
  } catch {
    return null
  }
}

/**
 * §04: nearby places. Kept out of the report-generation critical path — the
 * Overpass lookup it depends on can itself stall for 10+ seconds on a slow or
 * rate-limited endpoint — and fetched client-side after the report renders
 * instead, same reason as /api/supply-demand and /api/price-per-sqm.
 */
export function useNearbyPlaces(nearbyPlacesParam: string | null, latitude: string, longitude: string) {
  const key = `${latitude}:${longitude}`
  const [places, setPlaces] = useState<NearbyPlacesResult>(
    () => readStoredNearbyPlaces(key) ?? parseNearbyPlacesParam(nearbyPlacesParam) ?? emptyNearbyPlaces()
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const stored = readStoredNearbyPlaces(key)
    // The URL param only carries the listing's own schools/stations — a head
    // start, not the full result — so it never skips the fetch on its own.
    const initial = stored ?? parseNearbyPlacesParam(nearbyPlacesParam) ?? emptyNearbyPlaces()
    // Deferred a tick so these aren't synchronous setState calls inside the effect body.
    queueMicrotask(() => {
      if (!cancelled) setPlaces(initial)
    })

    const lat = parseFloat(latitude)
    const lon = parseFloat(longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return
    if (stored && hasNearbyPlacesContent(stored)) return

    queueMicrotask(() => {
      if (!cancelled) setLoading(true)
    })

    void fetch(`/api/nearby-amenities?lat=${lat}&lon=${lon}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((osmPlaces: NearbyPlacesResult | null) => {
        if (cancelled || !osmPlaces) return
        const merged = mergeNearbyPlaces(initial, osmPlaces)
        setPlaces(merged)
        if (hasNearbyPlacesContent(merged)) storeNearbyPlaces(key, merged)
      })
      .catch((error) => {
        console.error("Failed to load nearby amenities:", error)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [nearbyPlacesParam, latitude, longitude, key])

  // `loading` hides the spinner once there's something to show; `fetching` is true until
  // the full lookup has finished (the key points and score wait on that).
  return { places, loading: loading && !hasNearbyPlacesContent(places), fetching: loading }
}
