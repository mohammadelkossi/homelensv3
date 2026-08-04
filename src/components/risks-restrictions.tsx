"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Landmark, ShieldAlert, Building2, TreeDeciduous, Trees, Droplets, Siren, Wifi, Wind, Volume2 } from "lucide-react"
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
}

// Long-standing UK Air Quality Standards Regulations annual mean objectives (µg/m³).
const AQ_OBJECTIVES = { no2: 40, pm25: 20, pm10: 40 }

function aqBadgeColor(value: number, objective: number): string {
  return value >= objective ? "bg-red-500/10 text-red-700" : "bg-emerald-500/10 text-emerald-700"
}

function formatMonth(month: string): string {
  const [year, monthNum] = month.split("-")
  const date = new Date(Number(year), Number(monthNum) - 1)
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
}

type ConstraintTile = {
  key: string
  label: string
  icon: typeof Landmark
  items: PlanningConstraint[]
  /** Polygon-based constraints assert the property is inside the boundary; proximity-based ones only assert nearby presence. */
  proximityOnly?: boolean
  /** Shown instead of the generic "not found in available data" when items is empty. */
  emptyLabel?: string
  /** True when an empty result is itself a meaningful, confidently-good signal (e.g. flood Zone 1), not just a data gap. */
  emptyIsPositive?: boolean
}

export function RisksRestrictions({
  conservationAreas,
  article4Directions,
  listedBuildingsNearby,
  treePreservationNearby,
  greenBelt,
  floodRiskZones,
  crimeSummary,
  broadbandCoverage,
  airQuality,
  noiseLevels,
  loading = false,
}: RisksRestrictionsProps) {
  const tiles: ConstraintTile[] = [
    {
      key: "flood",
      label: "Flood Risk",
      icon: Droplets,
      items: floodRiskZones,
      emptyLabel: "Zone 1 (low risk) — not in a mapped flood zone",
      emptyIsPositive: true,
    },
    { key: "conservation", label: "Conservation Area", icon: Landmark, items: conservationAreas },
    { key: "article4", label: "Article 4 Direction", icon: ShieldAlert, items: article4Directions },
    { key: "listed", label: "Listed Building", icon: Building2, items: listedBuildingsNearby, proximityOnly: true },
    { key: "tpo", label: "Tree Preservation Order", icon: TreeDeciduous, items: treePreservationNearby, proximityOnly: true },
    { key: "greenbelt", label: "Green Belt", icon: Trees, items: greenBelt },
  ]

  return (
    <Card className="bg-[#CFDEE7]/30 border-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl font-bold" style={{ color: '#0A369D', fontSize: 'calc(1.5rem * 1.04)' }}>
          Risks & Restrictions
        </CardTitle>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Flood risk is from national Environment Agency mapping. The other constraints are
          self-submitted by local councils, so coverage varies by area — a grey &quot;not found&quot;
          result means nothing was found in available data, not a guarantee.
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Checking planning constraints...
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tiles.map((tile) => {
              const Icon = tile.icon
              const applies = tile.items.length > 0
              const emptyIsPositive = !applies && tile.emptyIsPositive

              return (
                <div
                  key={tile.key}
                  className={`p-3 rounded-lg bg-background border transition-colors ${
                    applies ? "border-amber-400/60" : emptyIsPositive ? "border-green-400/50" : "border-border/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        applies
                          ? "bg-amber-500/10 text-amber-600"
                          : emptyIsPositive
                            ? "bg-green-500/10 text-green-600"
                            : "bg-gray-500/10 text-gray-500"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground">{tile.label}</span>
                      {applies ? (
                        <div className="mt-1 space-y-1">
                          {tile.items.map((item, index) => (
                            <div key={`${tile.key}-${index}`} className="text-xs text-amber-700">
                              {tile.proximityOnly ? "Nearby: " : ""}
                              {item.documentUrl ? (
                                <a
                                  href={item.documentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline hover:no-underline"
                                >
                                  {item.name}
                                </a>
                              ) : (
                                item.name
                              )}
                              {item.grade ? ` (Grade ${item.grade})` : ""}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={`mt-1 text-xs ${emptyIsPositive ? "text-green-700" : "text-muted-foreground/70"}`}>
                          {tile.emptyLabel ?? "Not found in available data"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && (
          <div className="mt-3 p-3 rounded-lg bg-background border border-border/50">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-500/10 text-red-600">
                <Siren className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">Crime</span>
                {crimeSummary ? (
                  <>
                    <div className="mt-1 text-xs text-foreground/80">
                      <span className="font-semibold">{crimeSummary.totalCount.toLocaleString()}</span> crimes
                      reported within ~1 mile in {formatMonth(crimeSummary.month)}
                    </div>
                    {crimeSummary.topCategories.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {crimeSummary.topCategories.map((cat) => (
                          <span
                            key={cat.category}
                            className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-700"
                          >
                            {cat.category}: {cat.count}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-1 text-xs text-muted-foreground/70">
                    Not available — data.police.uk only covers England, Wales, and Northern Ireland
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!loading && (
          <div className="mt-3 p-3 rounded-lg bg-background border border-border/50">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600">
                <Wifi className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">Broadband</span>
                {broadbandCoverage ? (
                  <>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700">
                        Gigabit: {broadbandCoverage.gigabitAvailability ?? 0}%
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700">
                        Ultrafast (300Mbps+): {broadbandCoverage.ultrafastAvailability ?? 0}%
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700">
                        Superfast (30Mbps+): {broadbandCoverage.superfastAvailability ?? 0}%
                      </span>
                    </div>
                    {(broadbandCoverage.belowUso ?? 0) > 0 && (
                      <div className="mt-1.5 text-xs text-amber-700">
                        {broadbandCoverage.belowUso}% of premises here are below the Universal Service
                        Obligation (10Mbps) — may not be eligible for a standard broadband connection
                      </div>
                    )}
                  </>
                ) : (
                  <div className="mt-1 text-xs text-muted-foreground/70">
                    Not available for this postcode
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!loading && (
          <div className="mt-3 p-3 rounded-lg bg-background border border-border/50">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600">
                <Wind className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">Air Quality</span>
                {airQuality ? (
                  <>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${aqBadgeColor(airQuality.no2, AQ_OBJECTIVES.no2)}`}>
                        NO2: {airQuality.no2.toFixed(1)} µg/m³
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${aqBadgeColor(airQuality.pm25, AQ_OBJECTIVES.pm25)}`}>
                        PM2.5: {airQuality.pm25.toFixed(1)} µg/m³
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${aqBadgeColor(airQuality.pm10, AQ_OBJECTIVES.pm10)}`}>
                        PM10: {airQuality.pm10.toFixed(1)} µg/m³
                      </span>
                    </div>
                    <div className="mt-1.5 text-xs text-muted-foreground/70">
                      Modelled annual mean background levels (DEFRA UK-AIR, 1km grid). Red = at or above
                      the UK annual mean objective for that pollutant.
                    </div>
                  </>
                ) : (
                  <div className="mt-1 text-xs text-muted-foreground/70">Not available for this location</div>
                )}
              </div>
            </div>
          </div>
        )}

        {!loading && (
          <div className="mt-3 p-3 rounded-lg bg-background border border-border/50">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-fuchsia-500/10 text-fuchsia-600">
                <Volume2 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground">Noise</span>
                {noiseLevels.roadNoiseDb || noiseLevels.railNoiseDb || noiseLevels.airportNoiseDb ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {noiseLevels.roadNoiseDb && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-700">
                        Road: {noiseLevels.roadNoiseDb.toFixed(0)} dB
                      </span>
                    )}
                    {noiseLevels.railNoiseDb && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-700">
                        Rail: {noiseLevels.railNoiseDb.toFixed(0)} dB
                      </span>
                    )}
                    {noiseLevels.airportNoiseDb && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-fuchsia-500/10 text-fuchsia-700">
                        Aircraft: {noiseLevels.airportNoiseDb.toFixed(0)} dB
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-green-700">
                    No significant road, rail, or aircraft noise mapped at this location
                  </div>
                )}
                <div className="mt-1.5 text-xs text-muted-foreground/70">
                  Lden (day-evening-night average) from DEFRA strategic noise mapping, England only.
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
