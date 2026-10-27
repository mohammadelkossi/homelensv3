export type PropertyTypeCode = 'D' | 'S' | 'T' | 'F' | 'O'

export function mapPropertyTypeToCode(propertyType: string | null | undefined): PropertyTypeCode | null {
  if (!propertyType) return null
  const normalized = propertyType.trim().toLowerCase()
  if (!normalized || normalized === 'n/a') return null
  if (normalized.includes('semi')) return 'S'
  if (normalized.includes('terrace')) return 'T'
  if (normalized.includes('flat') || normalized.includes('apartment') || normalized.includes('maisonette')) return 'F'
  if (normalized.includes('detached') || normalized.includes('bungalow') || normalized.includes('cottage')) return 'D'
  if (normalized.includes('townhouse')) return 'T'
  return 'O'
}
