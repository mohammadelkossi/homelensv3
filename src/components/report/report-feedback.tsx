"use client"

import { useState } from "react"
import { X } from "lucide-react"

const INK = "#0B0B0C"
const MUTED = "#6B6B70"
const HAIRLINE = "#E6E6E8"
const ACCENT = "#0A369D"
const WARN = "#C2410C"
const BODY_FONT = "var(--font-report-body)"

type SubmitStatus = "idle" | "sending" | "success" | "error"

// Sent via the same /api/contact + Resend pipeline as the main /contact page —
// just folds which report this is about into the message body, since
// /api/contact only takes message + email. Email itself is optional here: this
// is meant as a quick "flag a typo" action, not a support request, so it only
// asks for a way to reply rather than requiring one.
function FeedbackPanel({ reportLabel, onClose }: { reportLabel: string; onClose: () => void }) {
  const [issue, setIssue] = useState("")
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<SubmitStatus>("idle")
  const [errorMessage, setErrorMessage] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!issue.trim() || status === "sending") return
    setStatus("sending")
    setErrorMessage("")
    try {
      const reportUrl = typeof window !== "undefined" ? window.location.href : ""
      const fullMessage = `${issue.trim()}\n\n---\nReport: ${reportLabel}\n${reportUrl}`
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: fullMessage, email: email.trim() || "not provided" }),
      })
      const data = await response.json()
      if (!response.ok) {
        setStatus("error")
        setErrorMessage(data.error || "Something went wrong")
        return
      }
      setStatus("success")
    } catch {
      setStatus("error")
      setErrorMessage("Failed to send. Please try again.")
    }
  }

  return (
    <>
      {/* Transparent click-outside catcher — no backdrop dimming, this is a quick aside not a blocking dialog. */}
      <button type="button" className="fixed inset-0 z-[99]" aria-label="Close" onClick={onClose} />
      <div
        className="fixed bottom-24 right-6 z-[100] w-[calc(100%-3rem)] max-w-[340px] bg-white p-4"
        style={{ border: `1px solid ${HAIRLINE}`, fontFamily: BODY_FONT }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-issue-title"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 id="report-issue-title" className="text-[14px] font-semibold" style={{ color: INK }}>
            Report Issue
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 -mt-0.5 outline-none focus-visible:ring-2 focus-visible:ring-[#0A369D]/50"
            style={{ color: MUTED }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {status === "success" ? (
          <p className="text-[13px]" style={{ color: "#15803D" }}>
            Thanks — we&apos;ve got it and will take a look.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label htmlFor="report-issue-message" className="sr-only">
              How can we improve?
            </label>
            <textarea
              id="report-issue-message"
              required
              rows={3}
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              placeholder="How can we improve?"
              disabled={status === "sending"}
              className="w-full px-2.5 py-2 text-[13px] bg-white outline-none focus-visible:ring-2 focus-visible:ring-[#0A369D]/50 focus-visible:border-[#0A369D] transition-colors disabled:opacity-60"
              style={{ border: `1px solid ${HAIRLINE}`, color: INK, fontFamily: BODY_FONT }}
            />
            <label htmlFor="report-issue-email" className="sr-only">
              Email (optional)
            </label>
            <input
              id="report-issue-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              disabled={status === "sending"}
              className="w-full h-9 px-2.5 mt-2 text-[13px] bg-white outline-none focus-visible:ring-2 focus-visible:ring-[#0A369D]/50 focus-visible:border-[#0A369D] transition-colors disabled:opacity-60"
              style={{ border: `1px solid ${HAIRLINE}`, color: INK, fontFamily: BODY_FONT }}
            />

            {status === "error" && (
              <p className="mt-2 text-[12px]" style={{ color: WARN }}>
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={!issue.trim() || status === "sending"}
              className="mt-3 h-9 px-4 text-[13px] font-medium text-white transition-colors disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#0A369D]/50"
              style={{ backgroundColor: ACCENT, fontFamily: BODY_FONT }}
            >
              {status === "sending" ? "Sending…" : "Send"}
            </button>
          </form>
        )}
      </div>
    </>
  )
}

export function ReportFeedback({ reportLabel }: { reportLabel: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ fontFamily: BODY_FONT, fontSize: 12 }}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="no-underline hover:underline outline-none focus-visible:ring-2 focus-visible:ring-[#0A369D]/50"
        style={{ color: MUTED }}
      >
        Report Issue
      </button>
      {open && <FeedbackPanel reportLabel={reportLabel} onClose={() => setOpen(false)} />}
    </div>
  )
}
