// Reads a listing's basic facts straight from its Rightmove page, without Apify.
// Used for the free preview report, which only needs enough to locate the property
// (for Risks & restrictions) and fill the blurred header.
//
// Rightmove embeds the listing as `PAGE_MODEL = {"data":"<flattened JSON>"}`: the
// inner string is an array where objects and arrays hold indices into that same array.

export type RightmoveListing = {
  displayAddress: string | null
  price: string | null
  propertyType: string | null
  bedrooms: number | null
  bathrooms: number | null
  latitude: number | null
  longitude: number | null
  fullPostcode: string | null
  outcode: string | null
  floorAreaSqm: number | null
  tenure: string | null
}

const RIGHTMOVE_PROPERTY_URL = /^https?:\/\/(www\.)?rightmove\.co\.uk\/properties\/\d+/i
const FETCH_TIMEOUT_MS = 8000

export function isRightmovePropertyUrl(url: string): boolean {
  return RIGHTMOVE_PROPERTY_URL.test(url)
}

/** The JSON object literal starting at `start`, found by matching braces outside strings. */
function sliceJsonObject(text: string, start: number): string | null {
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (c === "\\") escaped = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') inString = true
    else if (c === "{") depth++
    else if (c === "}" && --depth === 0) return text.slice(start, i + 1)
  }
  return null
}

function hydrate(flat: unknown[]): unknown {
  const memo = new Map<number, unknown>()
  const at = (index: unknown): unknown => {
    if (typeof index !== "number" || index < 0) return undefined
    if (memo.has(index)) return memo.get(index)
    const value = flat[index]
    if (Array.isArray(value)) {
      const out: unknown[] = []
      memo.set(index, out)
      for (const item of value) out.push(at(item))
      return out
    }
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {}
      memo.set(index, out)
      for (const [key, item] of Object.entries(value)) out[key] = at(item)
      return out
    }
    return value
  }
  return at(0)
}

/** "FREEHOLD" → "Freehold", the way the full report shows tenure. Unknown values stay hidden. */
function formatTenure(raw: string | null): string | null {
  if (!raw || /^(unknown|not specified|ask agent)$/i.test(raw.replace(/_/g, " "))) return null
  const words = raw.replace(/_/g, " ").toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function parseRightmoveListing(html: string): RightmoveListing | null {
  const marker = html.indexOf("PAGE_MODEL = ")
  if (marker === -1) return null
  const literal = sliceJsonObject(html, html.indexOf("{", marker))
  if (!literal) return null

  let page: any
  try {
    const outer = JSON.parse(literal)
    // Older pages embed the object directly; current ones wrap it in a flattened string.
    page = typeof outer.data === "string" ? hydrate(JSON.parse(outer.data)) : outer
  } catch {
    return null
  }
  const p = page?.propertyData
  if (!p) return null

  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null)
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null)
  const outcode = str(p.address?.outcode)
  const incode = str(p.address?.incode)
  const sqm = (p.sizings as any[] | undefined)?.find((s) => s?.unit === "sqm")

  return {
    displayAddress: str(p.address?.displayAddress),
    price: str(p.prices?.primaryPrice),
    propertyType: str(p.propertySubType),
    bedrooms: num(p.bedrooms),
    bathrooms: num(p.bathrooms),
    latitude: num(p.location?.latitude),
    longitude: num(p.location?.longitude),
    fullPostcode: outcode && incode ? `${outcode} ${incode}` : null,
    outcode,
    floorAreaSqm: num(sqm?.maximumSize) ?? num(sqm?.minimumSize),
    tenure: formatTenure(str(p.tenure?.tenureType)),
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function fetchRightmoveListing(url: string): Promise<RightmoveListing | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-GB,en;q=0.9",
      },
      cache: "no-store",
    })
    if (!res.ok) return null
    return parseRightmoveListing(await res.text())
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
