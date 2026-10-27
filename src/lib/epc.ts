// Official EPC certificate band colours (gov.uk EPC register).
export const EPC_BAND_COLORS: Record<string, string> = {
  A: '#008054',
  B: '#19B459',
  C: '#8DCE46',
  D: '#FFD500',
  E: '#FCAA65',
  F: '#EF6C23',
  G: '#E9153B',
}

export function epcBandColor(rating: string | null | undefined): string | null {
  if (!rating) return null
  const band = rating.trim().toUpperCase()
  return EPC_BAND_COLORS[band] ?? null
}

/** Earliest year a construction_age_band string (e.g. "1930-1949", "2012 onwards") could mean, or null if unparseable. */
export function constructionAgeBandStartYear(band: string | null | undefined): number | null {
  if (!band) return null
  const match = band.match(/(\d{4})/)
  if (!match) return null
  const year = Number(match[1])
  return Number.isFinite(year) ? year : null
}

// Standard RdSAP England & Wales construction age band codes (single letters,
// as returned by the EPC certificate's sap_building_parts[].construction_age_band)
// mapped to their human-readable year range. Scotland uses a different table,
// but the EPC pipeline here only targets England & Wales properties.
const RDSAP_AGE_BAND_RANGES: Record<string, string> = {
  A: 'Before 1900',
  B: '1900–1929',
  C: '1930–1949',
  D: '1950–1966',
  E: '1967–1975',
  F: '1976–1982',
  G: '1983–1990',
  H: '1991–1995',
  I: '1996–2002',
  J: '2003–2006',
  K: '2007–2011',
  L: '2012 onwards',
}

/** Converts an RdSAP construction-age-band code ("D") to its display range ("1950–1966"). Passes through anything that's already a range string. */
export function constructionAgeBandToRange(band: string | null | undefined): string | null {
  if (!band) return null
  const trimmed = band.trim()
  if (!trimmed) return null
  const code = trimmed.toUpperCase()
  if (RDSAP_AGE_BAND_RANGES[code]) return RDSAP_AGE_BAND_RANGES[code]
  // Already a range/free-text band (e.g. from a differently-shaped source) — use as-is.
  return trimmed
}
