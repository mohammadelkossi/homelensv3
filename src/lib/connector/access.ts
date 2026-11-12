// Who is calling the Claude/ChatGPT connector, and how much of their monthly
// allowance they have left.

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js"
import { STRIPE_PRO_STATUS_LIFETIME } from "@/lib/report-generation"

/** New analyses a Lifetime member can run through the connector each calendar month. */
export const CONNECTOR_MONTHLY_ANALYSES = 10
/** A 'pending' row older than this is a crashed request, not a report in progress. */
const PENDING_STALE_MS = 5 * 60 * 1000
/** Asking for the same listing again within this window returns the stored report, uncounted. */
export const REPEAT_ANALYSIS_WINDOW_MS = 24 * 60 * 60 * 1000

export function createAdminClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export type ConnectorCaller = { user: User; isLifetime: boolean }

/**
 * The HomeLens user behind a connector request, from the access token Supabase's
 * OAuth server issued when they approved the connection. Null if the token is
 * missing, expired or not ours.
 */
export async function authenticateConnectorRequest(request: Request, admin: SupabaseClient): Promise<ConnectorCaller | null> {
  const header = request.headers.get("authorization") ?? ""
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  if (!token) return null

  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return null

  const { data: profile } = await admin.from("profiles").select("stripe_status").eq("id", data.user.id).maybeSingle()
  return { user: data.user, isLifetime: profile?.stripe_status === STRIPE_PRO_STATUS_LIFETIME }
}

export type Allowance = { used: number; limit: number; remaining: number; resetsOn: string }

function monthStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

/** Analyses counted this calendar month (UTC): finished ones, plus any still being built. */
export async function getAllowance(admin: SupabaseClient, userId: string, now = new Date()): Promise<Allowance> {
  const { data, error } = await admin
    .from("connector_reports")
    .select("status, created_at")
    .eq("user_id", userId)
    .eq("kind", "analysis")
    .gte("created_at", monthStart(now).toISOString())
  if (error) throw new Error(`Could not read connector usage: ${error.message}`)

  const used = (data ?? []).filter(
    (row) => row.status === "done" || now.getTime() - new Date(row.created_at as string).getTime() < PENDING_STALE_MS
  ).length
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return {
    used,
    limit: CONNECTOR_MONTHLY_ANALYSES,
    remaining: Math.max(0, CONNECTOR_MONTHLY_ANALYSES - used),
    resetsOn: nextMonth.toISOString().slice(0, 10),
  }
}

/** Holds one of this month's analyses while the report is built. Returns the row id. */
export async function reserveAnalysis(admin: SupabaseClient, userId: string, propertyUrl: string): Promise<number> {
  const { data, error } = await admin
    .from("connector_reports")
    .insert({ user_id: userId, kind: "analysis", status: "pending", property_url: propertyUrl })
    .select("id")
    .single()
  if (error || !data) throw new Error(`Could not record connector usage: ${error?.message ?? "no row returned"}`)
  return data.id as number
}

/** Gives the analysis back when the report could not be built. */
export async function releaseAnalysis(admin: SupabaseClient, rowId: number): Promise<void> {
  const { error } = await admin.from("connector_reports").delete().eq("id", rowId)
  if (error) console.error("[connector] could not release a failed analysis:", error.message)
}
