import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import Stripe from "stripe"

type CheckoutPlan = "monthly" | "lifetime"

/**
 * POST /api/stripe/create-checkout-session
 * Body: { "plan": "monthly" | "lifetime" }
 * Creates Stripe Checkout with client_reference_id = Supabase user id.
 */
export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const monthlyPriceId =
    process.env.STRIPE_PRO_PRICE_ID ?? process.env.STRIPE_PRICE_ID
  const lifetimePriceId = process.env.STRIPE_PRO_LIFETIME_PRICE_ID

  let plan: CheckoutPlan = "monthly"
  try {
    const body = await request.json()
    if (body?.plan === "lifetime" || body?.plan === "monthly") {
      plan = body.plan
    }
  } catch {
    // default monthly when body empty
  }

  const priceId = plan === "lifetime" ? lifetimePriceId : monthlyPriceId
  if (!stripeSecretKey || !priceId) {
    return NextResponse.json(
      {
        error:
          plan === "lifetime"
            ? "Server configuration error: missing STRIPE_SECRET_KEY or STRIPE_PRO_LIFETIME_PRICE_ID"
            : "Server configuration error: missing STRIPE_SECRET_KEY or STRIPE_PRO_PRICE_ID",
      },
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
  const successUrl = `${origin}/checkout-success?plan=${plan}`
  const cancelUrl = `${origin}/pricing`

  const stripe = new Stripe(stripeSecretKey)

  try {
    const session = await stripe.checkout.sessions.create({
      mode: plan === "lifetime" ? "payment" : "subscription",
      allow_promotion_codes: plan === "monthly",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { plan },
    })

    if (!session.url) {
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
    }

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe checkout failed"
    console.error("[Stripe Checkout]", message, { plan, priceId })
    const hint =
      message.includes("No such price") ?
        " This price ID is not in the same Stripe account/mode as STRIPE_SECRET_KEY (use test prices with sk_test_, live with sk_live_)."
      : ""
    return NextResponse.json({ error: `${message}${hint}` }, { status: 400 })
  }
}
