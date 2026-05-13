export const PENDING_REPORT_STORAGE_KEY = "homelens_pending_report"

export const FREE_PROPERTY_LIMIT = 3

export type UserProfileLimit = {
  plan: string | null
  property_reports_used: number | null
  stripe_subscription_id: string | null
  stripe_status: string | null
}

export function isProProfile(profile: UserProfileLimit | null | undefined): boolean {
  if (!profile) return false
  return (
    profile.plan === "pro" ||
    (!!profile.stripe_subscription_id &&
      ["active", "trialing"].includes(profile.stripe_status ?? ""))
  )
}

export function hasFreeReportLimitReached(
  profile: UserProfileLimit | null | undefined
): boolean {
  if (isProProfile(profile)) return false
  return (profile?.property_reports_used ?? 0) >= FREE_PROPERTY_LIMIT
}

export type ReportPreferences = {
  bedrooms: number
  bathrooms: number
  propertyType: number
  size: number
  garden: number
  parking: number
  location: number
  garage: number
}

export type PendingReportPayload = {
  url: string
  postcode: string | null
  preferences: ReportPreferences
  bedrooms: string
  bathrooms: string
  propertyType: string
  size: string
  bedroomsSlider: number
  bathroomsSlider: number
  propertyTypeSlider: number
  sizeSlider: number
  gardenSlider: number
  parkingSlider: number
  locationSlider: number
  garageSlider: number
  locationLabel: string
}

export const REPORT_GENERATION_STAGES = [
  { label: "Fetching listing data...", startSec: 0, endSec: 8 },
  { label: "Analysing price history...", startSec: 8, endSec: 15 },
  { label: "Scoring against your preferences...", startSec: 15, endSec: 20 },
  { label: "Almost there...", startSec: 20, endSec: Infinity },
] as const

export function getActiveStageIndex(elapsedSec: number): number {
  for (let i = REPORT_GENERATION_STAGES.length - 1; i >= 0; i--) {
    if (elapsedSec >= REPORT_GENERATION_STAGES[i].startSec) return i
  }
  return 0
}

/** Progress 0–95 from elapsed time; hits 100 only when caller passes complete=true */
export function getReportProgressPercent(elapsedSec: number, complete = false): number {
  if (complete) return 100
  if (elapsedSec < 8) return (elapsedSec / 8) * 25
  if (elapsedSec < 15) return 25 + ((elapsedSec - 8) / 7) * 30
  if (elapsedSec < 20) return 55 + ((elapsedSec - 15) / 5) * 25
  return Math.min(95, 80 + (elapsedSec - 20) * 0.75)
}

export function buildResultsSearchParams(
  data: Record<string, unknown>,
  payload: PendingReportPayload
): URLSearchParams {
  const params = new URLSearchParams()
  Object.entries(data).forEach(([key, val]) => {
    if (key === "priceHistory" && val !== null) {
      params.append(key, JSON.stringify(val))
    } else if (key === "nearbyPlaces" && val !== null) {
      params.append(key, JSON.stringify(val))
    } else if (key === "averagePriceByYear" && val !== null) {
      params.append(key, JSON.stringify(val))
    } else if (val === null) {
      params.append(key, "null")
    } else {
      params.append(key, String(val))
    }
  })
  params.append("preferredBedroomsScore", String(payload.bedroomsSlider))
  params.append("preferredBathroomsScore", String(payload.bathroomsSlider))
  params.append("preferredPropertyTypeScore", String(payload.propertyTypeSlider))
  params.append("preferredSizeScore", String(payload.sizeSlider))
  params.append("preferredGardenScore", String(payload.gardenSlider))
  params.append("preferredParkingScore", String(payload.parkingSlider))
  params.append("preferredLocationScore", String(payload.locationSlider))
  params.append("preferredGarageScore", String(payload.garageSlider))
  if (payload.bedrooms) params.append("userBedrooms", payload.bedrooms)
  if (payload.bathrooms) params.append("userBathrooms", payload.bathrooms)
  if (payload.propertyType) params.append("userPropertyType", payload.propertyType)
  if (payload.size) params.append("userSize", payload.size)
  if (payload.locationLabel.trim()) {
    params.append("preferredPostcode", payload.locationLabel.trim())
  }
  return params
}

export function readPendingReportPayload(): PendingReportPayload | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem(PENDING_REPORT_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PendingReportPayload
  } catch {
    sessionStorage.removeItem(PENDING_REPORT_STORAGE_KEY)
    return null
  }
}

export function clearPendingReportPayload(): void {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(PENDING_REPORT_STORAGE_KEY)
}
