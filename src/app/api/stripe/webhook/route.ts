import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

/**
 * Stripe webhook handler. Uses raw body for signature verification —
 * do not use request.json(); we read request.text() instead.
 */
export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeSecretKey || !webhookSecret) {
    console.error("[Stripe Webhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET")
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
  }

  let payload: string
  try {
    payload = await request.text()
  } catch (e) {
    console.error("[Stripe Webhook] Failed to read body", e)
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }

  const sig = request.headers.get("stripe-signature")
  if (!sig) {
    console.error("[Stripe Webhook] Missing stripe-signature header")
    return NextResponse.json({ error: "Missing signature" }, { status: 400 })
  }

  let event: Stripe.Event
  let stripe: Stripe
  try {
    stripe = new Stripe(stripeSecretKey)
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[Stripe Webhook] Signature verification failed:", message)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  console.log("[Stripe Webhook] Event type received:", event.type)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[Stripe Webhook] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  /** Derive plan from Stripe subscription status. */
  function planForStatus(status: string): "pro" | "free" {
    if (status === "active" || status === "trialing") return "pro"
    if (status === "canceled" || status === "incomplete_expired" || status === "unpaid") return "free"
    return "pro"
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const clientReferenceId = session.client_reference_id
        const customer = session.customer
        const subscription = session.subscription

        if (!clientReferenceId) {
          console.error("[Stripe Webhook] checkout.session.completed missing client_reference_id")
          break
        }

        const customerId = typeof customer === "string" ? customer : customer?.id ?? null
        const subscriptionId =
          typeof subscription === "string" ? subscription : (subscription as Stripe.Subscription)?.id ?? null

        if (!customerId || !subscriptionId) {
          console.error(
            "[Stripe Webhook] checkout.session.completed missing customer or subscription",
            { customerId, subscriptionId }
          )
          break
        }

        const subscriptionObj = await stripe.subscriptions.retrieve(subscriptionId)
        const status = subscriptionObj.status

        console.log("[Stripe Webhook] User ID being updated (checkout.session.completed):", clientReferenceId)
        console.log("[Stripe Webhook] Subscription status from Stripe:", status)

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            plan: planForStatus(status),
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            stripe_status: status,
          })
          .eq("id", clientReferenceId)

        if (updateError) {
          console.error("[Stripe Webhook] Supabase update error (profiles):", updateError)
          return NextResponse.json({ error: "Update failed" }, { status: 500 })
        }
        break
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const subscriptionId = subscription.id
        const status = subscription.status

        console.log(
          "[Stripe Webhook] Subscription status update:",
          event.type,
          "subscription_id:",
          subscriptionId,
          "status:",
          status
        )

        const { data: profile, error: findError } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle()

        if (findError) {
          console.error("[Stripe Webhook] Supabase find error (profiles):", findError)
          return NextResponse.json({ error: "Lookup failed" }, { status: 500 })
        }

        if (!profile) {
          console.log("[Stripe Webhook] No profile found for stripe_subscription_id:", subscriptionId)
          break
        }

        console.log("[Stripe Webhook] User ID being updated (subscription status):", profile.id)

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            plan: planForStatus(status),
            stripe_status: status,
          })
          .eq("id", profile.id)

        if (updateError) {
          console.error("[Stripe Webhook] Supabase update error (profiles):", updateError)
          return NextResponse.json({ error: "Update failed" }, { status: 500 })
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        const subscriptionId = subscription.id

        console.log(
          "[Stripe Webhook] Subscription deleted, finding profile by stripe_subscription_id:",
          subscriptionId
        )

        const { data: profile, error: findError } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle()

        if (findError) {
          console.error("[Stripe Webhook] Supabase find error (profiles):", findError)
          return NextResponse.json({ error: "Lookup failed" }, { status: 500 })
        }

        if (!profile) {
          console.error("[Stripe Webhook] No profile found for stripe_subscription_id:", subscriptionId)
          break
        }

        console.log("[Stripe Webhook] User ID being updated (customer.subscription.deleted):", profile.id)

        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            plan: "free",
            stripe_status: "canceled",
          })
          .eq("id", profile.id)

        if (updateError) {
          console.error("[Stripe Webhook] Supabase update error (profiles):", updateError)
          return NextResponse.json({ error: "Update failed" }, { status: 500 })
        }
        break
      }

      default:
        console.log("[Stripe Webhook] Unhandled event type:", event.type)
    }
  } catch (err) {
    console.error("[Stripe Webhook] Error processing event:", err)
    return NextResponse.json({ error: "Processing failed" }, { status: 500 })
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
