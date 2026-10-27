import type { NearbyPlace } from "@/lib/nearby-amenities"
import { ownedPercent, type CensusTenureBreakdown } from "@/lib/census-tenure"
import { Locked } from "./locked"

const DISPLAY_FONT = "var(--font-report-display)"

const WALKING_KMH = 5

function walkingMinutes(distanceKm: number): number {
  return Math.max(1, Math.round((distanceKm / WALKING_KMH) * 60))
}

function PlaceRow({ place, label }: { place: NearbyPlace; label?: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b" style={{ borderColor: "#E6E6E8" }}>
      <span>
        {label ? <span style={{ color: "#6B6B70" }}>{label} · </span> : null}
        {place.name}
        {place.rating ? (
          <span style={{ color: "#6B6B70" }}> · {place.rating}{place.ratingSource ? ` (${place.ratingSource})` : ""}</span>
        ) : null}
      </span>
      <span>{walkingMinutes(place.distance)} min</span>
    </div>
  )
}

// Monochrome blue scale, darkest-to-lightest by how close to full ownership each category is.
const TENURE_SEGMENTS: { key: keyof ReturnType<typeof tenureSegmentValues>; label: string; color: string }[] = [
  { key: "owned", label: "Owned", color: "#0A369D" },
  { key: "privateRented", label: "Private rented", color: "#4F73C9" },
  { key: "socialRented", label: "Social rented", color: "#9DB0DA" },
]

function tenureSegmentValues(data: CensusTenureBreakdown) {
  return {
    owned: data.ownedOutright + data.ownedWithMortgage,
    privateRented: data.privateRented,
    socialRented: data.socialRentedCouncil + data.socialRentedOther,
  }
}

function TenureRow({ label, color, percent }: { label: string; color: string; percent: number }) {
  return (
    <div className="flex justify-between py-1.5 border-b" style={{ borderColor: "#E6E6E8" }}>
      <span className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span>{percent < 1 ? "<1" : Math.round(percent)}%</span>
    </div>
  )
}

function Card({ label, headline, headlineCaption, children }: { label: string; headline: string; headlineCaption?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[12px]" style={{ color: "#6B6B70" }}>
        {label}
      </div>
      <Locked>
        <div className="mt-1.5 text-[26px] sm:text-[30px]" style={{ fontFamily: DISPLAY_FONT, fontWeight: 300, lineHeight: 1.1 }}>
          {headline}
        </div>
        {headlineCaption ? (
          <div className="text-[12px]" style={{ color: "#6B6B70" }}>
            {headlineCaption}
          </div>
        ) : null}
        <div className="mt-2">{children}</div>
      </Locked>
    </div>
  )
}

export type DailyLifeProps = {
  schools: NearbyPlace[]
  nurseries: NearbyPlace[]
  dentists: NearbyPlace[]
  gpSurgeries: NearbyPlace[]
  hospitals: NearbyPlace[]
  parks: NearbyPlace[]
  stations: NearbyPlace[]
  censusTenure?: CensusTenureBreakdown | null
  englandCensusTenure?: CensusTenureBreakdown | null
}

export function DailyLife({
  schools,
  nurseries,
  dentists,
  gpSurgeries,
  hospitals,
  parks,
  stations,
  censusTenure,
  englandCensusTenure,
}: DailyLifeProps) {
  const nurseriesWithin5Min = nurseries.filter((n) => walkingMinutes(n.distance) <= 5)
  const nearestHealthPlaces = (
    [
      dentists[0] && { ...dentists[0], category: "Dentist" },
      gpSurgeries[0] && { ...gpSurgeries[0], category: "GP" },
      hospitals[0] && { ...hospitals[0], category: "Hospital" },
    ].filter(Boolean) as (NearbyPlace & { category: string })[]
  ).sort((a, b) => a.distance - b.distance)
  const nearestHealth = nearestHealthPlaces[0]

  return (
    <div style={{ fontFamily: "var(--font-report-body)", fontSize: 14 }}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-10">
        {censusTenure && (
          <Card
            label="How homes are occupied"
            headline={`${Math.round(ownedPercent(censusTenure))}%`}
            headlineCaption={
              englandCensusTenure
                ? `owner-occupied · England: ${Math.round(ownedPercent(englandCensusTenure))}%`
                : "owner-occupied"
            }
          >
            {(() => {
              const values = tenureSegmentValues(censusTenure)
              return (
                <>
                  <div className="flex gap-0.5 my-2.5">
                    {TENURE_SEGMENTS.map((segment) => (
                      <div
                        key={segment.key}
                        className="h-2"
                        style={{ width: `${(values[segment.key] / censusTenure.totalHouseholds) * 100}%`, backgroundColor: segment.color }}
                      />
                    ))}
                  </div>
                  {TENURE_SEGMENTS.map((segment) => (
                    <TenureRow
                      key={segment.key}
                      label={segment.label}
                      color={segment.color}
                      percent={(values[segment.key] / censusTenure.totalHouseholds) * 100}
                    />
                  ))}
                  <div className="text-[12px] mt-1.5" style={{ color: "#6B6B70" }}>
                    Census 2021, ONS
                  </div>
                </>
              )
            })()}
          </Card>
        )}

        {schools.length > 0 && (
          <Card label="The school run" headline={`${walkingMinutes(schools[0].distance)} min walk`} headlineCaption="to the nearest school">
            {schools.slice(0, 3).map((s) => (
              <PlaceRow key={s.name} place={s} />
            ))}
          </Card>
        )}

        {nurseries.length > 0 && (
          <Card
            label="Nurseries & childcare"
            headline={`${walkingMinutes(nurseries[0].distance)} min walk`}
            headlineCaption={`${nurseriesWithin5Min.length} nurser${nurseriesWithin5Min.length === 1 ? "y" : "ies"} within 5 minutes`}
          >
            {nurseries.slice(0, 3).map((n) => (
              <PlaceRow key={n.name} place={n} />
            ))}
          </Card>
        )}

        {stations.length > 0 && (
          <Card label="Transport" headline={`${walkingMinutes(stations[0].distance)} min walk`} headlineCaption={`to ${stations[0].name}`}>
            {stations.slice(0, 3).map((s) => (
              <PlaceRow key={s.name} place={s} />
            ))}
          </Card>
        )}

        {nearestHealth && (
          <Card label="Health" headline={`${walkingMinutes(nearestHealth.distance)} min walk`} headlineCaption={`to ${nearestHealth.name}`}>
            {nearestHealthPlaces.map((place) => (
              <PlaceRow key={place.name} place={place} label={place.category} />
            ))}
          </Card>
        )}

        {parks.length > 0 && (
          <Card label="Green space" headline={`${walkingMinutes(parks[0].distance)} min walk`} headlineCaption={`to ${parks[0].name}`}>
            {parks.slice(0, 3).map((p) => (
              <PlaceRow key={p.name} place={p} />
            ))}
          </Card>
        )}
      </div>
    </div>
  )
}
