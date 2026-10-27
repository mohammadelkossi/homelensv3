import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import OpenAI from "openai"
import { generateKeyPoints, generateOffer, MODEL } from "@/lib/key-points/generate"
import type { ReportFindings } from "@/lib/key-points/findings"

export const maxDuration = 60

const MAX_BODY_BYTES = 30_000

export async function POST(request: NextRequest) {
  // Writes the report's recommended offer ("part": "offer") or its key points
  // ("part": "points"); the report asks for both at once. Each call costs money, so
  // only signed-in users (who can generate reports) can use it.
  const cookieStore = await cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => cookieStore.getAll(), setAll() {} },
  })
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "Findings too large" }, { status: 413 })
  let findings: ReportFindings
  let part: "offer" | "points"
  try {
    const body = JSON.parse(raw) as { findings: ReportFindings; part?: unknown }
    findings = body.findings
    part = body.part === "offer" ? "offer" : "points"
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  if (!findings || typeof findings !== "object" || !findings.property) {
    return NextResponse.json({ error: "findings are required" }, { status: 400 })
  }
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Not configured" }, { status: 503 })

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  try {
    if (part === "offer") {
      const offer = await generateOffer(openai, findings)
      if (!offer) console.warn("[key-points] offer failed its checks; the report will use the rule-based offer")
      return NextResponse.json({ offer, model: MODEL })
    }
    const { keyPoints, dropped } = await generateKeyPoints(openai, findings)
    if (dropped > 0) console.warn(`[key-points] dropped ${dropped} ungrounded point(s)`)
    return NextResponse.json({ keyPoints, model: MODEL })
  } catch (error) {
    console.error(`[key-points] ${part} generation failed:`, error instanceof Error ? error.message : error)
    return NextResponse.json({ error: "Generation failed" }, { status: 502 })
  }
}
