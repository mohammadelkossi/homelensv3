import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import Link from "next/link"

export default async function AccountPage() {
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

  const { data, error } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-[#0A369D] hover:underline text-sm mb-4 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Account</h1>
        {data?.user ? (
          <p className="text-green-600 font-medium mb-4">You are logged in.</p>
        ) : (
          <p className="text-gray-600 mb-4">You are not logged in.</p>
        )}
        <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm overflow-auto">
          {JSON.stringify({ user: data?.user, error }, null, 2)}
        </pre>
      </div>
    </div>
  )
}
