import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import Stripe from "stripe"

/**
 * GET /api/stripe/portal
 * Redirects the logged-in Pro user to the Stripe Customer Billing Portal
 * where they can cancel or manage their subscription.
 */
export async function GET(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey)
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id, stripe_status, stripe_subscription_id")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.stripe_status === "lifetime") {
    return NextResponse.redirect(new URL("/account?error=lifetime_plan", request.url))
  }

  const customerId = profile?.stripe_customer_id
  if (
    !customerId ||
    typeof customerId !== "string" ||
    !profile?.stripe_subscription_id
  ) {
    return NextResponse.redirect(new URL("/account?error=no_subscription", request.url))
  }

  const stripe = new Stripe(stripeSecretKey)
  const origin = request.nextUrl.origin
  const returnUrl = `${origin}/account`

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return NextResponse.redirect(session.url)
}
