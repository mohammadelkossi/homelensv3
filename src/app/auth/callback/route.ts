import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") ?? "/"
  const redirectUrl = new URL(next, requestUrl.origin)

  // Password reset: pass code to reset page so the client can exchange it (client has PKCE verifier in cookies)
  if (code && redirectUrl.pathname === "/auth/reset") {
    redirectUrl.searchParams.set("code", code)
    return NextResponse.redirect(redirectUrl)
  }

  const response = NextResponse.redirect(redirectUrl)
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(new URL("/?auth_error=callback", request.url))
    }
  }

  return response
}
