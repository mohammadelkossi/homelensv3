"use client"

import type { ReactNode } from "react"
import type { PlanningConstraint } from "@/lib/planning-constraints"
import type { CrimeSummary } from "@/lib/crime-data"
import type { BroadbandCoverage } from "@/lib/broadband-coverage"
import type { AirQuality, NoiseLevels } from "@/lib/environment-data"

interface RisksRestrictionsProps {
  conservationAreas: PlanningConstraint[]
  article4Directions: PlanningConstraint[]
  listedBuildingsNearby: PlanningConstraint[]
  treePreservationNearby: PlanningConstraint[]
  greenBelt: PlanningConstraint[]
  floodRiskZones: PlanningConstraint[]
  crimeSummary: CrimeSummary | null
  broadbandCoverage: BroadbandCoverage | null
  airQuality: AirQuality | null
  noiseLevels: NoiseLevels
  loading?: boolean
  /** Link single constraints to their council document. Off for frozen reports, where links can go stale. */
  linkDocuments?: boolean
}

// Long-standing UK Air Quality Standards Regulations annual mean objectives (µg/m³).
const AQ_OBJECTIVES = { no2: 40, pm25: 20, pm10: 40 }
const NOISE_FLAG_DB = 55
// Flat threshold on "reports within ~1 mile, latest month" — simpler and far more
// reliable than comparing against a modelled per-force baseline: building a fair
// baseline needs sampling real addresses across every force (data.police.uk
// anonymises crime locations to a sparse set of "safe points", so an arbitrary
// computed sample point frequently misses nearby real crime and reads falsely
// low — confirmed this even for central Manchester). A flat count threshold
// needs no external baseline data at all and avoids that whole failure mode.
const CRIME_CLEAR_BELOW = 25
const CRIME_CHECK_AT_OR_ABOVE = 100

type Status = "clear" | "check" | "nothing_found"

const STATUS_COPY: Record<Status, { dot: string; color: string; label: string }> = {
  clear: { dot: "●", color: "#15803D", label: "Clear" },
  check: { dot: "●", color: "#C2410C", label: "Check" },
  nothing_found: { dot: "○", color: "#6B6B70", label: "Nothing found" },
}

type Row = {
  key: string
  check: string
  finding: ReactNode
  meaning: string
  status: Status
}

function constraintFinding(items: PlanningConstraint[], emptyLabel: string, linkDocuments: boolean): ReactNode {
  if (items.length === 0) return emptyLabel
  if (linkDocuments && items.length === 1 && items[0].documentUrl) {
    return (
      <a href={items[0].documentUrl} target="_blank" rel="noreferrer" className="text-[#0A369D] no-underline hover:underline">
        {items[0].name} ↗
      </a>
    )
  }
  return joinConstraintNames(items)
}

function formatMonth(month: string): string {
  const [year, monthNum] = month.split("-")
  const date = new Date(Number(year), Number(monthNum) - 1)
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
}

function joinConstraintNames(items: PlanningConstraint[]): string {
  return items.map((item) => item.name).join(", ")
}

function buildRows(props: RisksRestrictionsProps): Row[] {
  const rows: Row[] = []

  if (props.crimeSummary) {
    const { totalCount } = props.crimeSummary
    const topCategories = props.crimeSummary.topCategories
      .slice(0, 2)
      .map((c) => `${c.category} (${c.count})`)
      .join(", ")

    const status: Status = totalCount >= CRIME_CHECK_AT_OR_ABOVE ? "check" : "clear"
    const level =
      totalCount < CRIME_CLEAR_BELOW
        ? "A low number of reports for the area."
        : status === "check"
          ? "A high number of reports for the area."
          : "A moderate number of reports for the area."
    const meaning = [level, topCategories ? `Mostly ${topCategories}.` : null].filter(Boolean).join(" ")

    rows.push({
      key: "crime",
      check: "Crime",
      finding: `${totalCount.toLocaleString()} reports within ~1 mile, ${formatMonth(props.crimeSummary.month)}`,
      meaning,
      status,
    })
  } else {
    rows.push({
      key: "crime",
      check: "Crime",
      finding: "Not available",
      meaning: "data.police.uk only covers England, Wales and Northern Ireland.",
      status: "nothing_found",
    })
  }

  if (props.broadbandCoverage) {
    const gigabit = props.broadbandCoverage.gigabitAvailability ?? 0
    const superfast = props.broadbandCoverage.superfastAvailability ?? 0
    const belowUso = props.broadbandCoverage.belowUso ?? 0
    rows.push({
      key: "broadband",
      check: "Broadband",
      finding: gigabit >= 100 ? "Gigabit available" : `Gigabit ${gigabit}% · Superfast ${superfast}%`,
      meaning:
        belowUso > 0
          ? `${belowUso}% of premises here are below the Universal Service Obligation (10Mbps).`
          : `${superfast}% gigabit, ultrafast and superfast coverage in this postcode.`,
      status: belowUso > 0 ? "check" : gigabit > 0 || superfast > 0 ? "clear" : "nothing_found",
    })
  } else {
    rows.push({
      key: "broadband",
      check: "Broadband",
      finding: "Not available",
      meaning: "No coverage data for this postcode.",
      status: "nothing_found",
    })
  }

  if (props.airQuality) {
    const { no2, pm25, pm10 } = props.airQuality
    const anyAtOrAbove = no2 >= AQ_OBJECTIVES.no2 || pm25 >= AQ_OBJECTIVES.pm25 || pm10 >= AQ_OBJECTIVES.pm10
    rows.push({
      key: "air-quality",
      check: "Air quality",
      finding: `NO₂ ${no2.toFixed(1)} · PM2.5 ${pm25.toFixed(1)} · PM10 ${pm10.toFixed(1)} µg/m³`,
      meaning: anyAtOrAbove ? "At or above UK air quality objectives." : "All below UK air quality objectives.",
      status: anyAtOrAbove ? "check" : "clear",
    })
  } else {
    rows.push({
      key: "air-quality",
      check: "Air quality",
      finding: "Not available",
      meaning: "No modelled data for this location.",
      status: "nothing_found",
    })
  }

  if (props.noiseLevels.roadNoiseDb || props.noiseLevels.railNoiseDb || props.noiseLevels.airportNoiseDb) {
    const parts: string[] = []
    if (props.noiseLevels.roadNoiseDb) parts.push(`Road ${props.noiseLevels.roadNoiseDb.toFixed(0)} dB`)
    if (props.noiseLevels.railNoiseDb) parts.push(`Rail ${props.noiseLevels.railNoiseDb.toFixed(0)} dB`)
    if (props.noiseLevels.airportNoiseDb) parts.push(`Aircraft ${props.noiseLevels.airportNoiseDb.toFixed(0)} dB`)
    const anyAboveThreshold = [props.noiseLevels.roadNoiseDb, props.noiseLevels.railNoiseDb, props.noiseLevels.airportNoiseDb].some(
      (v) => v !== null && v >= NOISE_FLAG_DB
    )
    rows.push({
      key: "noise",
      check: "Noise",
      finding: parts.join(" · "),
      meaning: anyAboveThreshold
        ? `At or above the ${NOISE_FLAG_DB} dB level that noise maps flag.`
        : `Below the ${NOISE_FLAG_DB} dB level that noise maps flag.`,
      status: anyAboveThreshold ? "check" : "clear",
    })
  } else {
    rows.push({
      key: "noise",
      check: "Noise",
      finding: "No significant road, rail or aircraft noise mapped",
      meaning: "DEFRA strategic noise mapping, England only.",
      status: "clear",
    })
  }

  rows.push({
    key: "flood",
    check: "Flood risk",
    finding: props.floodRiskZones.length > 0 ? joinConstraintNames(props.floodRiskZones) : "Zone 1 — low",
    meaning:
      props.floodRiskZones.length > 0
        ? "This property sits in a mapped river or sea flood risk zone."
        : "Not in a mapped river or sea flood zone.",
    status: props.floodRiskZones.length > 0 ? "check" : "clear",
  })

  rows.push({
    key: "conservation",
    check: "Conservation area",
    finding: constraintFinding(props.conservationAreas, "None found", props.linkDocuments ?? true),
    meaning: "Exterior changes, demolition and work on trees may need consent from the council.",
    status: props.conservationAreas.length > 0 ? "check" : "nothing_found",
  })

  rows.push({
    key: "article4",
    check: "Article 4 direction",
    finding: constraintFinding(props.article4Directions, "None found", props.linkDocuments ?? true),
    meaning:
      "Some work you could normally do without planning permission — like extensions or new windows — may need it here.",
    status: props.article4Directions.length > 0 ? "check" : "nothing_found",
  })

  const heritage = [...props.listedBuildingsNearby, ...props.treePreservationNearby, ...props.greenBelt]
  rows.push({
    key: "heritage",
    check: "Listed building · Tree preservation · Green belt",
    finding: constraintFinding(heritage, "None found", props.linkDocuments ?? true),
    meaning: "Council data coverage varies, so “none found” isn’t a guarantee.",
    status: heritage.length > 0 ? "check" : "nothing_found",
  })

  return rows
}

const DISPLAY_FONT = "var(--font-report-display)"
const BODY_FONT = "var(--font-report-body)"

export function RisksRestrictions(props: RisksRestrictionsProps) {
  if (props.loading) {
    return (
      <p className="text-sm py-6 text-center" style={{ color: "#6B6B70", fontFamily: BODY_FONT }}>
        Checking planning constraints...
      </p>
    )
  }

  const rows = buildRows(props)

  return (
    <div style={{ fontFamily: BODY_FONT, fontSize: 13 }}>
      {/* Desktop/tablet: full table */}
      <div className="hidden sm:block w-full overflow-x-auto">
        <table className="w-full border-collapse" style={{ fontSize: 13 }}>
          <thead>
            <tr>
              {["Check", "Finding", "What it means", "Status"].map((heading, i) => (
                <th
                  key={heading}
                  className={i === 3 ? "text-right" : "text-left"}
                  style={{
                    fontFamily: DISPLAY_FONT,
                    fontWeight: 500,
                    fontSize: 12,
                    color: "#6B6B70",
                    padding: "6px 12px 6px 0",
                    borderBottom: "1px solid #0B0B0C",
                  }}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const statusInfo = STATUS_COPY[row.status]
              return (
                <tr key={row.key}>
                  <td className="font-semibold align-top" style={{ padding: "9px 12px 9px 0", borderBottom: "1px solid #E6E6E8" }}>
                    {row.check}
                  </td>
                  <td className="align-top" style={{ padding: "9px 12px 9px 0", borderBottom: "1px solid #E6E6E8" }}>
                    {row.finding}
                  </td>
                  <td className="align-top" style={{ padding: "9px 12px 9px 0", borderBottom: "1px solid #E6E6E8", color: "#6B6B70" }}>
                    {row.meaning}
                  </td>
                  <td className="text-right align-top whitespace-nowrap" style={{ padding: "9px 0", borderBottom: "1px solid #E6E6E8" }}>
                    <span style={{ color: statusInfo.color }}>
                      {statusInfo.dot} {statusInfo.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: each row stacks — check + status on top, then finding, then meaning */}
      <div className="sm:hidden">
        {rows.map((row) => {
          const statusInfo = STATUS_COPY[row.status]
          return (
            <div key={row.key} className="py-3 border-b" style={{ borderColor: "#E6E6E8" }}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{row.check}</span>
                <span className="shrink-0 whitespace-nowrap" style={{ color: statusInfo.color }}>
                  {statusInfo.dot} {statusInfo.label}
                </span>
              </div>
              <div className="mt-1">{row.finding}</div>
              <div className="mt-0.5" style={{ color: "#6B6B70" }}>
                {row.meaning}
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-2.5" style={{ fontSize: 12, color: "#6B6B70" }}>
        Flood risk is from national Environment Agency mapping. The other constraints are self-submitted by local
        councils, so coverage varies by area — &quot;nothing found&quot; means nothing was found in available data,
        not a guarantee.
      </p>
    </div>
  )
}
