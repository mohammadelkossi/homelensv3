import Link from "next/link"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { interBody } from "@/app/results/report-fonts"
import { LIFETIME_PRICE } from "@/config/pricing"
import { isProProfile } from "@/lib/report-generation"

// Enough copies to fill the widest screens; the track holds two sets so it loops seamlessly.
const REPEATS = 6

function Message() {
  return (
    <span className="flex shrink-0 items-center whitespace-nowrap px-8">
      <span className="font-semibold">Black Friday offer:</span>&nbsp;Lifetime Pro for just £{LIFETIME_PRICE}. Pay once, keep it forever.
      <span className="ml-8 opacity-50" aria-hidden="true">✦</span>
    </span>
  )
}

/** True when the signed-in visitor already has Pro (monthly or lifetime). Logged-out visitors are never Pro. */
async function viewerIsPro(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anonKey || !serviceKey) return false

  const cookieStore = await cookies()
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  })
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return false

  const { data: profile } = await createClient(url, serviceKey)
    .from("profiles")
    .select("plan, stripe_subscription_id, stripe_status")
    .eq("id", auth.user.id)
    .maybeSingle()
  return isProProfile(profile)
}

/** Site-wide scrolling strip above the navbar, hidden for Pro users. Remove it from the root layout when the offer ends. */
export async function PromoBanner() {
  if (await viewerIsPro()) return null

  return (
    <Link
      href="/pricing"
      aria-label={`Black Friday offer: Lifetime Pro for just £${LIFETIME_PRICE}. Pay once, keep it forever. See pricing.`}
      className={`${interBody.variable} promo-marquee block overflow-hidden bg-[#0B0B0C] py-2.5 text-[13px] leading-snug !text-white no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60`}
      style={{ fontFamily: "var(--font-report-body)" }}
    >
      <span className="promo-marquee-track flex w-max" aria-hidden="true">
        {Array.from({ length: REPEATS * 2 }, (_, i) => (
          <Message key={i} />
        ))}
      </span>
    </Link>
  )
}
