"use client"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

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
    <div className="min-h-screen bg-white text-black flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-20">
        <header className="max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-semibold mb-4" style={{ color: "#000000" }}>
            Contact Us
          </h1>
          <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
            Have a question or feedback? Send us a message below and we&apos;ll get back to you.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="max-w-2xl mt-8 sm:mt-10 space-y-6">
          {status === "success" && (
            <p className="text-green-600 font-medium">Message sent. We&apos;ll get back to you soon.</p>
          )}
          {status === "error" && (
            <p className="text-red-600 font-medium">{errorMessage}</p>
          )}
          <div>
            <label htmlFor="contact-email" className="block text-sm font-medium text-black mb-2">
              Your email
            </label>
            <input
              id="contact-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={status === "sending"}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0A369D] focus:border-transparent disabled:opacity-60"
              style={{ backgroundColor: "#ffffff" }}
            />
          </div>
          <div>
            <label htmlFor="contact-message" className="block text-sm font-medium text-black mb-2">
              Message
            </label>
            <textarea
              id="contact-message"
              required
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              disabled={status === "sending"}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0A369D] focus:border-transparent disabled:opacity-60"
              style={{ backgroundColor: "#ffffff" }}
            />
          </div>
          <button
            type="submit"
            disabled={status === "sending"}
            className="px-6 py-2.5 rounded-lg font-medium text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: "#0A369D" }}
          >
            {status === "sending" ? "Sending…" : "Send message"}
          </button>
        </form>
      </main>

      <Footer />
    </div>
  )
}
