"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { useLoginPopup } from "@/components/login-popup"
import { interBody, interTight } from "@/app/results/report-fonts"

// Where a member approves Claude or ChatGPT connecting to their HomeLens account.
// Supabase Auth (this project's OAuth server) sends them here with an authorization_id
// when the assistant starts the connection, and takes over again once they decide.

const INK = "#0B0B0C"
const MUTED = "#6B6B70"
const ACCENT = "#0A369D"

type Details = { clientName: string; email: string | null }
type State =
  | { step: "loading" }
  | { step: "signed-out" }
  | { step: "ready"; details: Details }
  | { step: "leaving" }
  | { step: "error"; message: string }

function ConsentCard() {
  const authorizationId = useSearchParams().get("authorization_id")
  const { openLogin } = useLoginPopup()
  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  )
  const [state, setState] = useState<State>({ step: "loading" })
  const [deciding, setDeciding] = useState(false)

  const load = useCallback(async () => {
    if (!authorizationId) {
      setState({ step: "error", message: "This link is missing its connection request. Start again from Claude or ChatGPT." })
      return
    }
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setState({ step: "signed-out" })
      return
    }
    const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId)
    if (error || !data) {
      setState({ step: "error", message: "This connection request has expired. Start again from Claude or ChatGPT." })
      return
    }
    // Already approved for this assistant before: Supabase answers with where to go next.
    const redirectUrl = (data as { redirect_url?: string }).redirect_url
    if (redirectUrl) {
      setState({ step: "leaving" })
      window.location.href = redirectUrl
      return
    }
    const client = data.client as { client_name?: string; name?: string }
    setState({
      step: "ready",
      details: { clientName: client.client_name ?? client.name ?? "An AI assistant", email: userData.user.email ?? null },
    })
  }, [authorizationId, supabase])

  useEffect(() => {
    // Deferred a tick so this isn't a synchronous setState call inside the effect body.
    queueMicrotask(() => void load())
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") void load()
    })
    return () => data.subscription.unsubscribe()
  }, [load, supabase])

  async function decide(approve: boolean) {
    if (!authorizationId) return
    setDeciding(true)
    const { data, error } = approve
      ? await supabase.auth.oauth.approveAuthorization(authorizationId)
      : await supabase.auth.oauth.denyAuthorization(authorizationId)
    if (error || !data?.redirect_url) {
      setDeciding(false)
      setState({ step: "error", message: "That didn't go through. Start the connection again from Claude or ChatGPT." })
      return
    }
    setState({ step: "leaving" })
    window.location.href = data.redirect_url
  }

  return (
    <main
      className={`${interBody.variable} ${interTight.variable} flex min-h-screen items-center justify-center px-4 py-12`}
      style={{ backgroundColor: "#FBFAF7", fontFamily: "var(--font-report-body)", color: INK }}
    >
      <div className="w-full max-w-md border bg-white p-8" style={{ borderColor: "#E7E5DF" }}>
        <div className="text-[13px] font-semibold tracking-wide" style={{ color: ACCENT }}>
          HomeLens
        </div>

        {state.step === "loading" && (
          <p className="mt-6 text-[15px]" style={{ color: MUTED }} aria-live="polite">
            Checking the connection request…
          </p>
        )}

        {state.step === "leaving" && (
          <p className="mt-6 text-[15px]" style={{ color: MUTED }} aria-live="polite">
            Taking you back to your assistant…
          </p>
        )}

        {state.step === "error" && (
          <>
            <h1 className="mt-4 text-2xl font-semibold" style={{ fontFamily: "var(--font-report-display)" }}>
              We couldn&apos;t complete the connection
            </h1>
            <p className="mt-3 text-[15px] leading-6" style={{ color: MUTED }}>
              {state.message}
            </p>
          </>
        )}

        {state.step === "signed-out" && (
          <>
            <h1 className="mt-4 text-2xl font-semibold" style={{ fontFamily: "var(--font-report-display)" }}>
              Sign in to connect HomeLens
            </h1>
            <p className="mt-3 text-[15px] leading-6" style={{ color: MUTED }}>
              Sign in with your HomeLens account, then choose whether to let your AI assistant use it.
            </p>
            <Button className="mt-6 h-12 w-full rounded-none text-base" onClick={openLogin}>
              Sign in
            </Button>
          </>
        )}

        {state.step === "ready" && (
          <>
            <h1 className="mt-4 text-2xl font-semibold" style={{ fontFamily: "var(--font-report-display)" }}>
              Connect {state.details.clientName} to HomeLens?
            </h1>
            {state.details.email && (
              <p className="mt-2 text-[13px]" style={{ color: MUTED }}>
                Signed in as {state.details.email}
              </p>
            )}
            <p className="mt-5 text-[15px] font-semibold">{state.details.clientName} will be able to:</p>
            <ul className="mt-2 space-y-2 text-[15px] leading-6" style={{ color: MUTED }}>
              <li>Generate property reports from Rightmove links, using your monthly analyses</li>
              <li>Read the reports saved in your account</li>
            </ul>
            <p className="mt-4 text-[13px] leading-5" style={{ color: MUTED }}>
              It can&apos;t see your password or payment details, or change your account.
            </p>
            <div className="mt-7 flex flex-col gap-3">
              <Button className="h-12 w-full rounded-none text-base" disabled={deciding} onClick={() => decide(true)}>
                Allow
              </Button>
              <Button
                variant="ghost"
                className="h-12 w-full rounded-none text-base text-muted-foreground"
                disabled={deciding}
                onClick={() => decide(false)}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

export default function OAuthConsentPage() {
  return (
    <Suspense fallback={null}>
      <ConsentCard />
    </Suspense>
  )
}
