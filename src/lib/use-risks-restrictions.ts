"use client"

import { useEffect, useState } from "react"
import {
  emptyPlanningConstraints,
  readStoredPlanningConstraints,
  storePlanningConstraints,
  type PlanningConstraintsResult,
} from "@/lib/planning-constraints"
import { readStoredCrimeSummary, storeCrimeSummary, type CrimeSummary } from "@/lib/crime-data"
import { readStoredBroadbandCoverage, storeBroadbandCoverage, type BroadbandCoverage } from "@/lib/broadband-coverage"
import { readStoredEnvironmentData, storeEnvironmentData, type EnvironmentData } from "@/lib/environment-data"

const emptyEnvironmentData: EnvironmentData = {
  airQuality: null,
  noiseLevels: { roadNoiseDb: null, railNoiseDb: null, airportNoiseDb: null },
}

export type RisksRestrictionsData = {
  planningConstraints: PlanningConstraintsResult
  crimeSummary: CrimeSummary | null
  broadbandCoverage: BroadbandCoverage | null
  environmentData: EnvironmentData
}

/** Fetches §03's risk/restriction data once per report (cached in sessionStorage, keyed per property), kept out of the report-generation critical path. */
export function useRisksRestrictions(latitude: string, longitude: string, postcode: string | null) {
  // Scopes the cache to this property — lat/lon pin the location precisely enough that two
  // different properties essentially never collide, so this doubles as the cache key.
  const cacheKey = `${latitude}:${longitude}`

  const [constraints, setConstraints] = useState<PlanningConstraintsResult>(
    () => readStoredPlanningConstraints(cacheKey) ?? emptyPlanningConstraints()
  )
  const [crimeSummary, setCrimeSummary] = useState<CrimeSummary | null>(() => readStoredCrimeSummary(cacheKey))
  const [broadbandCoverage, setBroadbandCoverage] = useState<BroadbandCoverage | null>(() =>
    readStoredBroadbandCoverage(cacheKey)
  )
  const [environmentData, setEnvironmentData] = useState<EnvironmentData>(
    () => readStoredEnvironmentData(cacheKey) ?? emptyEnvironmentData
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Already cached from an earlier visit this session — skip the re-fetch.
    if (readStoredPlanningConstraints(cacheKey)) return

    const lat = parseFloat(latitude)
    const lon = parseFloat(longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return

    let cancelled = false
    // Deferred a tick so this isn't a synchronous setState call inside the effect body.
    queueMicrotask(() => {
      if (!cancelled) setLoading(true)
    })

    const params = new URLSearchParams({ lat: String(lat), lon: String(lon) })
    if (postcode) params.set("postcode", postcode)

    void fetch(`/api/risks-restrictions?${params.toString()}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: RisksRestrictionsData | null) => {
        if (cancelled || !data) return
        setConstraints(data.planningConstraints)
        setCrimeSummary(data.crimeSummary)
        setBroadbandCoverage(data.broadbandCoverage)
        setEnvironmentData(data.environmentData)
        storePlanningConstraints(cacheKey, data.planningConstraints)
        if (data.crimeSummary) storeCrimeSummary(cacheKey, data.crimeSummary)
        if (data.broadbandCoverage) storeBroadbandCoverage(cacheKey, data.broadbandCoverage)
        storeEnvironmentData(cacheKey, data.environmentData)
      })
      .catch((error) => {
        console.error("Failed to load risks & restrictions:", error)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [cacheKey, latitude, longitude, postcode])

  return {
    data: { planningConstraints: constraints, crimeSummary, broadbandCoverage, environmentData } as RisksRestrictionsData,
    loading,
  }
}
