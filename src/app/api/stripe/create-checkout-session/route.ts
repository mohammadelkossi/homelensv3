import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import Stripe from "stripe"

/**
 * POST /api/stripe/create-checkout-session
 * Creates a Stripe Checkout Session for Pro subscription with client_reference_id
 * set to the current user's id so the webhook can update the correct Supabase profile.
 */
export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const priceId = process.env.STRIPE_PRO_PRICE_ID

  if (!stripeSecretKey || !priceId) {
    return NextResponse.json(
      { error: "Server configuration error: missing STRIPE_SECRET_KEY or STRIPE_PRO_PRICE_ID" },
      { status: 500 }
    )
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const origin = request.nextUrl?.origin ?? request.headers.get("origin") ?? "https://homelens.co"
  const successUrl = `${origin}/checkout-success`
  const cancelUrl = `${origin}/pricing`

  const stripe = new Stripe(stripeSecretKey)
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    success_url: successUrl,
    cancel_url: cancelUrl,
  })

  if (!session.url) {
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }

  return NextResponse.json({ url: session.url })
}
