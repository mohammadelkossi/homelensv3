"use client"

import { createContext, useContext, useState, useCallback, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

type LoginPopupContextType = {
  open: boolean
  setOpen: (open: boolean) => void
  openLogin: () => void
  openSignup: () => void
}

const LoginPopupContext = createContext<LoginPopupContextType | null>(null)

export function useLoginPopup() {
  const ctx = useContext(LoginPopupContext)
  if (!ctx) throw new Error("useLoginPopup must be used within LoginPopupProvider")
  return ctx
}

export function LoginPopupProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [openWithMode, setOpenWithMode] = useState<"login" | "signup" | null>(null)
  const openLogin = useCallback(() => {
    setOpenWithMode(null)
    setOpen(true)
  }, [])
  const openSignup = useCallback(() => {
    setOpenWithMode("signup")
    setOpen(true)
  }, [])

  return (
    <LoginPopupContext.Provider value={{ open, setOpen, openLogin, openSignup }}>
      {children}
      <LoginPopup openWithMode={openWithMode} setOpenWithMode={setOpenWithMode} />
    </LoginPopupContext.Provider>
  )
}

type PopupMode = "login" | "signup" | "forgot"

function LoginPopup({
  openWithMode,
  setOpenWithMode,
}: {
  openWithMode: "login" | "signup" | null
  setOpenWithMode: (m: "login" | "signup" | null) => void
}) {
  const { open, setOpen } = useLoginPopup()
  const [mode, setMode] = useState<PopupMode>("login")
  useEffect(() => {
    if (open && openWithMode === "signup") {
      setMode("signup")
      setOpenWithMode(null)
    }
  }, [open, openWithMode, setOpenWithMode])
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [signupName, setSignupName] = useState("")
  const [signupEmail, setSignupEmail] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [signupConfirm, setSignupConfirm] = useState("")
  const [signupLoading, setSignupLoading] = useState(false)
  const [signupError, setSignupError] = useState<string | null>(null)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState<string | null>(null)
  const [forgotSuccess, setForgotSuccess] = useState(false)

  function closePopup() {
    setOpen(false)
    setMode("login")
    setSignupError(null)
    setSignupSuccess(false)
    setLoginError(null)
    setForgotError(null)
    setForgotSuccess(false)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginError(null)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      setLoginError("Auth is not configured.")
      return
    }
    setLoginLoading(true)
    const supabase = createBrowserClient(url, key)
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    })
    setLoginLoading(false)
    if (error) {
      setLoginError(error.message)
      return
    }
    closePopup()
  }

  async function handleGoogleSignIn() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      setGoogleError("Auth is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.")
      return
    }
    setGoogleError(null)
    setGoogleLoading(true)
    try {
      const supabase = createBrowserClient(url, key)
      const redirectTo = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      })
      if (error) {
        setGoogleError(error.message)
        return
      }
      if (data?.url) {
        window.location.href = data.url
        return
      }
      setGoogleError("Could not get sign-in URL")
    } finally {
      setGoogleLoading(false)
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setSignupError(null)
    if (signupPassword !== signupConfirm) {
      setSignupError("Passwords do not match.")
      return
    }
    if (signupPassword.length < 6) {
      setSignupError("Password must be at least 6 characters.")
      return
    }
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      setSignupError("Auth is not configured.")
      return
    }
    setSignupLoading(true)
    const supabase = createBrowserClient(url, key)
    const { error } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password: signupPassword,
      options: { data: { full_name: signupName.trim() || undefined } },
    })
    setSignupLoading(false)
    if (error) {
      setSignupError(error.message)
      return
    }
    setSignupSuccess(true)
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setForgotError(null)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      setForgotError("Auth is not configured.")
      return
    }
    setForgotLoading(true)
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    // Use implicit flow so the reset link gets tokens in the URL hash (no code verifier – works from any device)
    const resetClient = createBrowserClient(url, key, {
      auth: { flowType: "implicit" },
      isSingleton: false,
    })
    const { error } = await resetClient.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${origin}/auth/reset`,
    })
    setForgotLoading(false)
    if (error) {
      setForgotError(error.message)
      return
    }
    setForgotSuccess(true)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby={mode === "forgot" ? "forgot-title" : mode === "login" ? "login-title" : "signup-title"}
    >
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close"
        onClick={closePopup}
      />
      {/* Card */}
      <Card className="relative z-10 w-full max-w-md bg-white shadow-lg">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle id={mode === "forgot" ? "forgot-title" : mode === "login" ? "login-title" : "signup-title"} className="text-xl">
              {mode === "forgot" ? "Reset password" : mode === "login" ? "Log in" : "Create account"}
            </CardTitle>
            <CardDescription>
              {mode === "forgot"
                ? "Enter your email and we'll send you a link to reset your password."
                : mode === "login"
                  ? "Sign in to your HomeLens account"
                  : "Sign up for a HomeLens account"}
            </CardDescription>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
            onClick={closePopup}
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === "forgot" ? (
            forgotSuccess ? (
              <div className="space-y-3">
                <p className="text-sm text-green-700 bg-green-50 p-3 rounded-md">
                  Check your email for a link to reset your password.
                </p>
                <Button type="button" onClick={closePopup} className="w-full bg-[#0A369D] hover:bg-[#082e83]">
                  Close
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {forgotError && (
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md">{forgotError}</p>
                )}
                <div className="space-y-2">
                  <label htmlFor="forgot-email" className="text-sm font-medium text-gray-700">Email</label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@example.com"
                    className="w-full"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={() => { setMode("login"); setForgotError(null); }}>
                    Back to log in
                  </Button>
                  <Button type="submit" disabled={forgotLoading} className="bg-[#0A369D] hover:bg-[#082e83]">
                    {forgotLoading ? "Sending…" : "Send reset link"}
                  </Button>
                </div>
              </form>
            )
          ) : mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md">{loginError}</p>
              )}
              {googleError && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md">{googleError}</p>
              )}
              <Button
                type="button"
                variant="outline"
                disabled={googleLoading}
                className="w-full h-11 border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-2"
                onClick={handleGoogleSignIn}
              >
                <GoogleIcon className="h-5 w-5" />
                {googleLoading ? "Redirecting…" : "Sign in with Google"}
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">or continue with email</span>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="login-email" className="text-sm font-medium text-gray-700">Email</label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  className="w-full"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="text-sm font-medium text-gray-700">Password</label>
                  <button
                    type="button"
                    className="text-sm text-[#0A369D] hover:underline"
                    onClick={() => setMode("forgot")}
                  >
                    Forgot password?
                  </button>
                </div>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  className="w-full"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={closePopup}>Cancel</Button>
                <Button type="submit" disabled={loginLoading} className="bg-[#0A369D] hover:bg-[#082e83]">
                  {loginLoading ? "Logging in…" : "Log in"}
                </Button>
              </div>
            </form>
          ) : signupSuccess ? (
            <div className="space-y-3">
              <p className="text-sm text-green-700 bg-green-50 p-3 rounded-md">
                Account created.
              </p>
              <Button type="button" onClick={closePopup} className="w-full bg-[#0A369D] hover:bg-[#082e83]">
                Close
              </Button>
            </div>
          ) : (
            <>
              {signupError && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md">{signupError}</p>
              )}
              <Button
                type="button"
                variant="outline"
                disabled={googleLoading}
                className="w-full h-11 border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-2"
                onClick={handleGoogleSignIn}
              >
                <GoogleIcon className="h-5 w-5" />
                {googleLoading ? "Redirecting…" : "Sign up with Google"}
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">or sign up with email</span>
                </div>
              </div>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="signup-name" className="text-sm font-medium text-gray-700">Name</label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Your name"
                    className="w-full"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-email" className="text-sm font-medium text-gray-700">Email</label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    className="w-full"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-password" className="text-sm font-medium text-gray-700">Password</label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    className="w-full"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="signup-confirm" className="text-sm font-medium text-gray-700">Confirm password</label>
                  <Input
                    id="signup-confirm"
                    type="password"
                    placeholder="••••••••"
                    className="w-full"
                    value={signupConfirm}
                    onChange={(e) => setSignupConfirm(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={closePopup}>Cancel</Button>
                  <Button type="submit" disabled={signupLoading} className="bg-[#0A369D] hover:bg-[#082e83]">
                    {signupLoading ? "Creating…" : "Create account"}
                  </Button>
                </div>
              </form>
            </>
          )}
        </CardContent>
        {(mode === "login" || mode === "forgot") && (
          <CardFooter className="flex flex-col gap-4">
            <p className="text-sm text-center text-gray-600">
              {mode === "login" && (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  className="text-[#0A369D] font-medium hover:underline"
                  onClick={() => setMode("signup")}
                >
                  Create Account
                </button>
              </>
            )}
            {mode === "forgot" && !forgotSuccess && (
              <button
                type="button"
                className="text-sm text-[#0A369D] font-medium hover:underline"
                onClick={() => { setMode("login"); setForgotError(null); }}
              >
                Back to log in
              </button>
            )}
            </p>
          </CardFooter>
        )}
        {mode === "signup" && !signupSuccess && (
          <CardFooter className="flex flex-col gap-4">
            <p className="text-sm text-center text-gray-600">
              Already have an account?{" "}
              <button
                type="button"
                className="text-[#0A369D] font-medium hover:underline"
                onClick={() => { setMode("login"); setSignupError(null); }}
              >
                Log in
              </button>
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
