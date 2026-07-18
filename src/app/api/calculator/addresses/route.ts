import { NextRequest, NextResponse } from "next/server"
import { searchAddresses } from "@/lib/homedata"

function statusForHomedataError(message: string): number {
  if (message.includes("HOMEDATA_API_KEY")) return 500
  if (message.includes("429") || /RATE_LIMITED/i.test(message)) return 429
  return 502
}

function userFacingMessage(message: string): string {
  if (message.includes("429") || /RATE_LIMITED/i.test(message)) {
    return "Address search is unavailable — Homedata monthly API limit reached (100/100). Upgrade the Homedata plan or wait until the quota resets."
  }
  return message
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim()
  if (!q || q.length < 3) {
    return NextResponse.json({ results: [] })
  }

  try {
    const results = await searchAddresses(q)
    return NextResponse.json({ results: results.slice(0, 8) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Address search failed"
    const status = statusForHomedataError(message)
    return NextResponse.json({ error: userFacingMessage(message) }, { status })
  }
}
