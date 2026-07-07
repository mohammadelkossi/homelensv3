import { NextRequest, NextResponse } from "next/server"
import { searchAddresses } from "@/lib/homedata"

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
    const status = message.includes("HOMEDATA_API_KEY") ? 500 : 502
    return NextResponse.json({ error: message }, { status })
  }
}
