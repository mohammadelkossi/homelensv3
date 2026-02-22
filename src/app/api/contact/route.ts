import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { Resend } from "resend"

const TO_EMAIL = "mohammad.elkossi@gmail.com"
const FROM_EMAIL = "HomeLens Contact <onboarding@resend.dev>"

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server configuration error: missing RESEND_API_KEY" },
        { status: 500 }
      )
    }

    const body = await request.json()
    const message = typeof body.message === "string" ? body.message.trim() : ""
    const formEmail = typeof body.email === "string" ? body.email.trim() : ""

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }
    if (!formEmail) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    // Build sender lines: session (if logged in) + form email (if provided)
    const senderLines: string[] = []
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (supabaseUrl && supabaseAnonKey) {
      const cookieStore = await cookies()
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      })
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const name = user.user_metadata?.full_name ?? null
        const email = user.email ?? "unknown"
        senderLines.push(name ? `Sent by: ${email} (${name})` : `Sent by: ${email}`)
      } else {
        senderLines.push("Sent by: Anonymous (not logged in)")
      }
    } else {
      senderLines.push("Sent by: Anonymous (not logged in)")
    }
    if (formEmail) {
      senderLines.push(`Reply to: ${formEmail}`)
    }

    const emailBody = `${message}\n\n---\n${senderLines.join("\n")}`

    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      subject: "HomeLens contact form",
      text: emailBody,
    })

    if (error) {
      console.error("Resend error:", error)
      return NextResponse.json(
        { error: error.message || "Failed to send email" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (err) {
    console.error("Contact API error:", err)
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    )
  }
}
