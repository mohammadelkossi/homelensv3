import { createClient } from "@supabase/supabase-js"

/**
 * "Effective today" for any rolling window (last 12 months, last 2 years, etc.)
 * queried against price_paid_data. Anchoring to wall-clock `new Date()` silently
 * returns zero rows whenever the Land Registry import falls behind real time by
 * more than the window itself — which it will, periodically, since HM Land
 * Registry publishes with a lag and imports aren't necessarily run every month.
 * Anchoring to the table's own most recent date instead makes every rolling
 * window self-correcting: it always reaches back from whatever data actually
 * exists, rather than assuming the import is always fresh.
 */
export async function getPricePaidDataEffectiveToday(): Promise<Date> {
  const fallback = new Date()
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return fallback

  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { data, error } = await supabase
      .from("price_paid_data")
      .select("date_of_transfer")
      .order("date_of_transfer", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data?.date_of_transfer) return fallback

    const latest = new Date(data.date_of_transfer)
    if (Number.isNaN(latest.getTime())) return fallback

    // If the import is somehow ahead of wall-clock time, wall-clock is still
    // the more sensible anchor (shouldn't happen, but don't return a future date).
    return latest > fallback ? fallback : latest
  } catch (error) {
    console.error("Error fetching price_paid_data latest date:", error)
    return fallback
  }
}
