"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { createBrowserClient } from "@supabase/ssr"
import type { AuthError } from "@supabase/supabase-js"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export default function AuthResetPage() {
  const [supabase, setSupabase] = useState<ReturnType<typeof createBrowserClient> | null>(null)
  const [isRecovery, setIsRecovery] = useState<boolean | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const recoveryChecked = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return
    setSupabase(createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY))
  }, [])

  useEffect(() => {
    if (!supabase || recoveryChecked.current) return
    recoveryChecked.current = true

    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "")
    const hash = typeof window !== "undefined" ? window.location.hash : ""
    const hashParams = new URLSearchParams(hash.replace("#", ""))

    // Path 1: callback sent us here with ?recovery=1 (server already exchanged)
    if (params.get("recovery") === "1") {
      setIsRecovery(true)
      return
    }

    // Path 2: callback sent us with ?code=... — exchange on client (requires same browser that requested reset)
    const code = params.get("code")
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }: { error: AuthError | null }) => {
        if (error) {
          const sameBrowserHint = " Open this link in the same browser where you requested the reset, or request a new link (links expire in a few minutes)."
          setMessage({
            type: "error",
            text: "This link is invalid or has expired." + sameBrowserHint + (error.message ? ` (${error.message})` : ""),
          })
          setIsRecovery(false)
          if (typeof window !== "undefined") window.history.replaceState(null, "", "/auth/reset")
          return
        }
        setIsRecovery(true)
        if (typeof window !== "undefined") window.history.replaceState(null, "", "/auth/reset")
      })
      return
    }

    // Path 3: landed with hash (tokens in fragment)
    if (hashParams.get("type") === "recovery") {
      setIsRecovery(true)
      supabase.auth.getSession().then(() => {})
      return
    }

    // No code → show "enter email"
    setIsRecovery(false)
  }, [supabase])

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase || !email.trim()) return
    setLoading(true)
    setMessage(null)
    // Use implicit flow so the reset link gets tokens in the URL hash (no code verifier needed – works from any device)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      setMessage({ type: "error", text: "Auth is not configured." })
      setLoading(false)
      return
    }
    const resetClient = createBrowserClient(url, key, {
      auth: { flowType: "implicit" },
      isSingleton: false,
    })
    const { error } = await resetClient.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    setLoading(false)
    if (error) {
      setMessage({ type: "error", text: error.message })
      return
    }
    setMessage({
      type: "success",
      text: "Check your email for the password reset link.",
    })
  }

  async function handleSetNewPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) return
    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." })
      return
    }
    if (password.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters." })
      return
    }
    setLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setMessage({ type: "error", text: error.message })
      return
    }
    setMessage({ type: "success", text: "Password updated. You can now sign in." })
    setPassword("")
    setConfirmPassword("")
    if (typeof window !== "undefined") window.history.replaceState(null, "", "/auth/reset")
    setIsRecovery(false)
  }

  if (isRecovery === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">
              {isRecovery ? "Set new password" : "Reset password"}
            </CardTitle>
            <CardDescription>
              {isRecovery
                  ? "Enter your new password below."
                : "Enter your email and we’ll send you a reset link."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {message && (
              <p
                className={`text-sm p-3 rounded-md ${
                  message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
                }`}
              >
                {message.text}
              </p>
            )}
            {isRecovery ? (
              <form onSubmit={handleSetNewPassword} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="new-password" className="text-sm font-medium text-gray-700">
                    New password
                  </label>
                  <Input
                    id="new-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirm-password" className="text-sm font-medium text-gray-700">
                    Confirm password
                  </label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0A369D] hover:bg-[#082e83]"
                >
                  {loading ? "Updating…" : "Update password"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="reset-email" className="text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0A369D] hover:bg-[#082e83]"
                >
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Link
              href="/"
              className="text-sm text-[#0A369D] hover:underline"
            >
              Back to home
            </Link>
          </CardFooter>
        </Card>
      </main>
      <Footer />
    </div>
  )
}
