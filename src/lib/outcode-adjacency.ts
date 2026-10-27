/**
 * The 2 outcodes numerically below and 2 above the given one, e.g. SK8 ->
 * [SK6, SK7, SK9, SK10]. This is a simple numeric-adjacency heuristic, not a
 * geographic one — unlike postcodes.io's nearest-outcode lookup, it needs no
 * network call, but "adjacent number" doesn't always mean "next door"
 * (outcode numbering isn't drawn to be spatially contiguous everywhere).
 */
export function getAdjacentOutcodes(outcode: string, radius = 2): string[] {
  const match = outcode.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/)
  if (!match) return []
  const [, letters, numStr] = match
  const num = Number(numStr)

  const result: string[] = []
  for (let offset = radius; offset >= 1; offset--) {
    const below = num - offset
    if (below > 0) result.push(`${letters}${below}`)
  }
  for (let offset = 1; offset <= radius; offset++) {
    result.push(`${letters}${num + offset}`)
  }
  return result
}
