import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { isProProfile, STRIPE_PRO_STATUS_LIFETIME } from "@/lib/report-generation"
import { interBody, interTight } from "@/app/results/report-fonts"
import { INK, MUTED, HAIRLINE, ACCENT, WARN, BODY_FONT, DISPLAY_FONT } from "@/components/tools/tool-ui"

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error: queryError } = await searchParams
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

  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user

  let isPro = false
  let isLifetime = false
  if (user && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { data: profile } = await admin
      .from("profiles")
      .select("plan, stripe_subscription_id, stripe_status")
      .eq("id", user.id)
      .maybeSingle()
    isPro = isProProfile(profile)
    isLifetime = profile?.stripe_status === STRIPE_PRO_STATUS_LIFETIME
  }

  return (
    <div
      className={`min-h-screen bg-[#FBFAF7] flex flex-col ${interBody.variable} ${interTight.variable}`}
      style={{ color: INK, fontFamily: BODY_FONT }}
    >
      <Navbar />
      <main className="flex-1">
        <div className="px-5 md:px-12 pt-14 pb-10">
          <h1 className="text-[40px] md:text-[56px] font-normal tracking-[-0.04em] leading-none" style={{ fontFamily: DISPLAY_FONT }}>
            Account
          </h1>
          <p className="text-[15px] mt-4 max-w-xl" style={{ color: MUTED }}>
            Manage your HomeLens plan and billing.
          </p>
        </div>

        <div className="px-5 md:px-12 pb-16">
          <div className="max-w-xl" style={{ fontFamily: BODY_FONT, fontSize: 14 }}>
            <Link
              href="/"
              className="text-[13px] mb-6 inline-block outline-none focus-visible:ring-2 focus-visible:ring-[#0A369D]/50"
              style={{ color: ACCENT }}
            >
              ← Back to home
            </Link>

            {queryError === "no_subscription" && (
              <p className="px-4 py-3 mb-5 text-[14px]" style={{ color: WARN, border: `1px solid ${HAIRLINE}` }}>
                We couldn&apos;t find an active subscription to manage. If you believe this is an error, please contact support.
              </p>
            )}
            {queryError === "lifetime_plan" && (
              <p className="px-4 py-3 mb-5 text-[14px]" style={{ color: WARN, border: `1px solid ${HAIRLINE}` }}>
                You have lifetime Pro access — there is no subscription to manage. Contact support if you need help.
              </p>
            )}

            {!user ? (
              <p style={{ color: MUTED }}>You are not logged in.</p>
            ) : !isPro ? (
              <div className="space-y-2">
                <p>You don&apos;t have an active Pro plan.</p>
                <p style={{ color: MUTED }}>
                  <Link href="/pricing" className="font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#0A369D]/50" style={{ color: ACCENT }}>
                    View pricing
                  </Link>{" "}
                  to upgrade.
                </p>
              </div>
            ) : isLifetime ? (
              <div className="space-y-2">
                <p>
                  You have <strong>Pro Lifetime</strong> access.
                </p>
                <p style={{ color: MUTED }}>
                  Your one-time purchase includes full Pro features with no recurring subscription.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p>
                  You are currently on the <strong>Pro</strong> plan (monthly).
                </p>
                <p style={{ color: MUTED }}>
                  To cancel, change your card details, or download an invoice,{" "}
                  <Link
                    href="/api/stripe/portal"
                    className="font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#0A369D]/50"
                    style={{ color: ACCENT }}
                  >
                    open the billing portal
                  </Link>
                  .
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
