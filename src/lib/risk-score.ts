import type { RisksRestrictionsData } from "@/lib/use-risks-restrictions"

// Mirrors the same status logic as §03's risk table (src/components/risks-restrictions.tsx)
// — kept separate since that file derives React nodes (links, finding text) this
// doesn't need, but the clear/check/nothing_found conditions themselves must stay
// in sync with that table.
const AQ_OBJECTIVES = { no2: 40, pm25: 20, pm10: 40 }
const NOISE_FLAG_DB = 55

type RiskCheckStatus = "clear" | "check" | "nothing_found"

function computeRiskCheckStatuses(data: RisksRestrictionsData): RiskCheckStatus[] {
  const { planningConstraints: pc, environmentData } = data
  const statuses: RiskCheckStatus[] = []

  statuses.push(pc.floodRiskZones.length > 0 ? "check" : "clear")
  statuses.push(pc.conservationAreas.length > 0 ? "check" : "nothing_found")
  statuses.push(pc.article4Directions.length > 0 ? "check" : "nothing_found")
  // Crime has no local-authority baseline yet, so §03 shows it without a verdict.

  const { roadNoiseDb, railNoiseDb, airportNoiseDb } = environmentData.noiseLevels
  if (roadNoiseDb || railNoiseDb || airportNoiseDb) {
    const anyAbove = [roadNoiseDb, railNoiseDb, airportNoiseDb].some((v) => v !== null && v >= NOISE_FLAG_DB)
    statuses.push(anyAbove ? "check" : "clear")
  } else {
    statuses.push("clear")
  }

  if (environmentData.airQuality) {
    const { no2, pm25, pm10 } = environmentData.airQuality
    const anyAtOrAbove = no2 >= AQ_OBJECTIVES.no2 || pm25 >= AQ_OBJECTIVES.pm25 || pm10 >= AQ_OBJECTIVES.pm10
    statuses.push(anyAtOrAbove ? "check" : "clear")
  } else {
    statuses.push("nothing_found")
  }

  if (data.broadbandCoverage) {
    const gigabit = data.broadbandCoverage.gigabitAvailability ?? 0
    const superfast = data.broadbandCoverage.superfastAvailability ?? 0
    const belowUso = data.broadbandCoverage.belowUso ?? 0
    statuses.push(belowUso > 0 ? "check" : gigabit > 0 || superfast > 0 ? "clear" : "nothing_found")
  } else {
    statuses.push("nothing_found")
  }

  const heritage = [...pc.listedBuildingsNearby, ...pc.treePreservationNearby, ...pc.greenBelt]
  statuses.push(heritage.length > 0 ? "check" : "nothing_found")

  return statuses
}

/**
 * Display-only 0–100 risk score: the share of determinate §03 checks (i.e.
 * excluding "nothing_found", which isn't a verdict either way) that came back
 * clear. Null until risk data has loaded. Not folded into the overall
 * HomeLens score — shown alongside it for information only.
 */
export function computeRiskScore(data: RisksRestrictionsData): number | null {
  const statuses = computeRiskCheckStatuses(data)
  const determinate = statuses.filter((s) => s !== "nothing_found")
  if (determinate.length === 0) return null
  const clearCount = determinate.filter((s) => s === "clear").length
  return Math.round((clearCount / determinate.length) * 100)
}
