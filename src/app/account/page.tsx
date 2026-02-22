import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

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

  let plan: "free" | "pro" = "free"
  if (user && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { data: profile } = await admin
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle()
    if (profile?.plan === "pro") plan = "pro"
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-8 max-w-2xl">
        <Link href="/" className="text-[#0A369D] hover:underline text-sm mb-6 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mb-4">Account</h1>
        {queryError === "no_subscription" && (
          <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-4 text-sm">
            We couldn’t find an active subscription to manage. If you believe this is an error, please contact support.
          </p>
        )}
        {!user ? (
          <p className="text-gray-600">You are not logged in.</p>
        ) : plan === "free" ? (
          <div className="space-y-2">
            <p className="text-gray-800">
              You are currently on the <strong>free</strong> plan.
            </p>
            <p className="text-gray-600">
              If you&apos;d like to upgrade, please{" "}
              <Link href="/pricing" className="text-[#0A369D] font-medium hover:underline">
                click here
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-gray-800">
              You are currently on the <strong>Pro</strong> plan.
            </p>
            <p className="text-gray-600">
              If you&apos;d like to cancel your Pro plan, change your card details or download an invoice, please{" "}
              <Link href="/api/stripe/portal" className="text-[#0A369D] font-medium hover:underline">
                click here
              </Link>{" "}
              to manage your subscription.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
