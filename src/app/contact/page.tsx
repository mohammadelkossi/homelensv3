"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { interBody, interTight } from "@/app/results/report-fonts"
import { ToolField, ToolTextarea, ToolButton, INK, MUTED, WARN, BODY_FONT, DISPLAY_FONT } from "@/components/tools/tool-ui"

type SubmitStatus = "idle" | "sending" | "success" | "error"

export default function ContactPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState<SubmitStatus>("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !message.trim() || status === "sending") return
    setStatus("sending")
    setErrorMessage("")
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), email: email.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus("error")
        setErrorMessage(data.error || "Something went wrong")
        return
      }
      setStatus("success")
      setMessage("")
      setEmail("")
    } catch {
      setStatus("error")
      setErrorMessage("Failed to send. Please try again.")
    }
  }

  return (
    <div
      className={`min-h-screen bg-[#FBFAF7] flex flex-col ${interBody.variable} ${interTight.variable}`}
      style={{ color: INK, fontFamily: BODY_FONT }}
    >
      <Navbar />
      <main className="flex-1">
        <div className="px-5 md:px-12 pt-14 pb-10">
          <h1 className="text-[40px] md:text-[56px] font-normal tracking-[-0.04em] leading-none" style={{ fontFamily: DISPLAY_FONT }}>
            Contact us
          </h1>
          <p className="text-[15px] mt-4 max-w-xl" style={{ color: MUTED }}>
            Have a question or feedback? Send us a message below and we&apos;ll get back to you.
          </p>
        </div>

        <div className="px-5 md:px-12 pb-16">
          <div className="max-w-xl">
            <form onSubmit={handleSubmit} className="space-y-5">
              {status === "success" && (
                <p className="text-[14px]" style={{ color: "#15803D" }}>
                  Message sent. We&apos;ll get back to you soon.
                </p>
              )}
              {status === "error" && (
                <p className="text-[14px]" style={{ color: WARN }}>
                  {errorMessage}
                </p>
              )}
              <ToolField
                id="contact-email"
                label="Your email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={status === "sending"}
              />
              <ToolTextarea
                id="contact-message"
                label="Message"
                required
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                disabled={status === "sending"}
              />
              <ToolButton type="submit" disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Send message"}
              </ToolButton>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
