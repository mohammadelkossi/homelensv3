// Driving-commute calculation for §04's "Commute" card: resolves a postcode to
// coordinates via postcodes.io (free, no key — already used elsewhere in this
// app for geocoding), then routes it against the subject property's
// coordinates via OpenRouteService's Directions API for a real road-routed
// driving time (not straight-line distance).

const ORS_DIRECTIONS_URL = "https://api.openrouteservice.org/v2/directions/driving-car"

export type CommuteResult = { durationMinutes: number; distanceKm: number }

export async function geocodePostcode(postcode: string): Promise<{ latitude: number; longitude: number } | null> {
  if (!postcode?.trim()) return null
  try {
    const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode.trim())}`)
    if (!response.ok) return null
    const json = await response.json()
    const lat = json?.result?.latitude
    const lon = json?.result?.longitude
    if (typeof lat !== "number" || typeof lon !== "number") return null
    return { latitude: lat, longitude: lon }
  } catch (error) {
    console.error("Error geocoding postcode for commute:", error)
    return null
  }
}

export async function getDrivingCommute(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): Promise<CommuteResult | null> {
  const apiKey = process.env.OPENROUTESERVICE_API_KEY
  if (!apiKey) return null
  try {
    const url = `${ORS_DIRECTIONS_URL}?api_key=${encodeURIComponent(apiKey)}&start=${fromLon},${fromLat}&end=${toLon},${toLat}`
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (!response.ok) {
      console.error("OpenRouteService error:", response.status, await response.text())
      return null
    }
    const json = await response.json()
    const summary = json?.features?.[0]?.properties?.summary
    if (!summary || typeof summary.duration !== "number" || typeof summary.distance !== "number") return null
    return {
      durationMinutes: Math.round(summary.duration / 60),
      distanceKm: summary.distance / 1000,
    }
  } catch (error) {
    console.error("Error fetching driving commute:", error)
    return null
  }
}
