// The tools Claude and ChatGPT can call on a HomeLens member's behalf.

import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { generatePropertyReport, ReportGenerationError, type PropertyReportCore } from "@/lib/property-report"
import { extractRightmoveId } from "@/lib/supply-demand"
import { buildFullReport, type ConnectorPreferences } from "@/lib/connector/full-report"
import {
  getAllowance,
  releaseAnalysis,
  reserveAnalysis,
  REPEAT_ANALYSIS_WINDOW_MS,
  type ConnectorCaller,
} from "@/lib/connector/access"

/** The core scrape gets this long; the connector route allows longer than the website's 60s. */
const CORE_BUDGET_SECS = 120

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean }

const reply = (data: unknown): ToolResult => ({ content: [{ type: "text", text: JSON.stringify(data) }] })
const refuse = (message: string): ToolResult => ({ content: [{ type: "text", text: message }], isError: true })

const LIFETIME_ONLY =
  "The HomeLens connector is part of Pro Lifetime. This account isn't on that plan yet: it can be upgraded at https://homelens.co/pricing."

const preferencesSchema = z
  .object({
    minBedrooms: z.number().int().min(1).max(10).optional().describe("Fewest bedrooms the buyer wants"),
    minBathrooms: z.number().int().min(1).max(10).optional().describe("Fewest bathrooms the buyer wants"),
    propertyType: z
      .enum(["detached", "semi-detached", "terraced", "flat", "bungalow"])
      .optional()
      .describe("The type of home the buyer wants"),
    minSizeSqm: z.number().min(10).max(1000).optional().describe("Smallest floor area the buyer wants, in square metres"),
    wantsGarden: z.boolean().optional(),
    wantsParking: z.boolean().optional(),
    wantsGarage: z.boolean().optional(),
  })
  .optional()
  .describe("What the buyer is looking for, if they have said. Used only for the must-haves part of the score.")

export function registerConnectorTools(server: McpServer, admin: SupabaseClient, caller: ConnectorCaller) {
  const userId = caller.user.id

  server.registerTool(
    "analyse_property",
    {
      title: "Analyse a property",
      description:
        "Generate a full HomeLens report for one UK property from its Rightmove listing link: HomeLens score, recommended offer, price against the area, local market, planning and flood risks, crime, noise, broadband and what is nearby. Takes up to a minute or two. Each new analysis uses one of the member's monthly analyses; asking again for a listing analysed in the last 24 hours returns the stored report and uses none.",
      inputSchema: {
        rightmove_url: z
          .string()
          .describe("The Rightmove listing link, e.g. https://www.rightmove.co.uk/properties/123456789"),
        preferred_postcode: z
          .string()
          .optional()
          .describe("A postcode the buyer wants to be near (work, family), for the distance figure"),
        preferences: preferencesSchema,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ rightmove_url, preferred_postcode, preferences }): Promise<ToolResult> => {
      if (!caller.isLifetime) return refuse(LIFETIME_ONLY)

      const listingId = extractRightmoveId(rightmove_url)
      if (!listingId || !/rightmove\.co\.uk/i.test(rightmove_url)) {
        return refuse("That isn't a Rightmove listing link. It should look like https://www.rightmove.co.uk/properties/123456789.")
      }
      const url = `https://www.rightmove.co.uk/properties/${listingId}`

      // The same listing again within a day: hand back the stored report, uncounted.
      const { data: recent } = await admin
        .from("connector_reports")
        .select("id, report, created_at")
        .eq("user_id", userId)
        .eq("kind", "analysis")
        .eq("status", "done")
        .eq("property_url", url)
        .gte("created_at", new Date(Date.now() - REPEAT_ANALYSIS_WINDOW_MS).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
      if (recent?.[0]?.report) {
        return reply({ report: recent[0].report, reusedFromEarlierToday: true, allowance: await getAllowance(admin, userId) })
      }

      const before = await getAllowance(admin, userId)
      if (before.remaining <= 0) {
        return refuse(
          `This month's ${before.limit} connector analyses have been used. The allowance resets on ${before.resetsOn}. Reports already made can still be read with list_reports and get_report.`
        )
      }

      const rowId = await reserveAnalysis(admin, userId, url)
      try {
        const core = await generatePropertyReport({ url, postcode: preferred_postcode ?? null, budgetSecs: CORE_BUDGET_SECS })

        // Saved the same way the website saves it, so it appears in the member's account.
        const { data: saved, error: saveError } = await admin
          .from("saved_reports")
          .insert({ user_id: userId, property_url: url, report_data: core, report_version: 2 })
          .select("id")
          .single()
        if (saveError) console.error("[connector] failed to save report:", saveError.message)

        const report = await buildFullReport(core, preferences as ConnectorPreferences | undefined)
        const { error: updateError } = await admin
          .from("connector_reports")
          .update({ status: "done", report, saved_report_id: saved?.id ?? null })
          .eq("id", rowId)
        if (updateError) console.error("[connector] failed to store report:", updateError.message)

        return reply({ reportId: saved?.id ?? null, report, allowance: await getAllowance(admin, userId) })
      } catch (error) {
        await releaseAnalysis(admin, rowId)
        console.error("[connector] analysis failed:", error)
        const reason = error instanceof ReportGenerationError ? error.message : "an unexpected error"
        return refuse(`HomeLens couldn't analyse that listing (${reason}). It hasn't used one of this month's analyses. The listing may have been removed, or it may work on a second try.`)
      }
    }
  )

  server.registerTool(
    "list_reports",
    {
      title: "List my reports",
      description: "The member's saved HomeLens reports, newest first, from the website and the connector. Free: uses none of the monthly analyses.",
      inputSchema: { limit: z.number().int().min(1).max(50).optional().describe("How many to return (default 20)") },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ limit }): Promise<ToolResult> => {
      if (!caller.isLifetime) return refuse(LIFETIME_ONLY)
      const { data, error } = await admin
        .from("saved_reports")
        .select("id, created_at, property_url, address:report_data->>fullAddress, price:report_data->>price, propertyType:report_data->>propertyType, bedrooms:report_data->>bedrooms")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit ?? 20)
      if (error) return refuse("HomeLens couldn't load the saved reports just now.")
      return reply({ reports: (data ?? []).map((r) => ({ reportId: r.id, createdAt: r.created_at, rightmoveUrl: r.property_url, address: r.address, askingPrice: r.price, propertyType: r.propertyType, bedrooms: r.bedrooms })) })
    }
  )

  server.registerTool(
    "get_report",
    {
      title: "Get a report",
      description: "One saved HomeLens report in full, by the reportId from list_reports or analyse_property. Free: uses none of the monthly analyses.",
      inputSchema: { report_id: z.number().int().positive().describe("The reportId") },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ report_id }): Promise<ToolResult> => {
      if (!caller.isLifetime) return refuse(LIFETIME_ONLY)
      const { data: saved } = await admin
        .from("saved_reports")
        .select("id, created_at, property_url, report_data")
        .eq("id", report_id)
        .eq("user_id", userId)
        .maybeSingle()
      if (!saved) return refuse("There's no report with that id on this account.")

      const { data: stored } = await admin
        .from("connector_reports")
        .select("report")
        .eq("user_id", userId)
        .eq("saved_report_id", report_id)
        .eq("status", "done")
        .order("created_at", { ascending: false })
        .limit(1)
      if (stored?.[0]?.report) return reply({ reportId: saved.id, createdAt: saved.created_at, report: stored[0].report })

      // First made on the website, where the browser loads the market, risk and nearby
      // sections: build the full version now from the saved listing data, and keep it.
      try {
        const report = await buildFullReport(saved.report_data as PropertyReportCore)
        const { error } = await admin
          .from("connector_reports")
          .insert({ user_id: userId, kind: "enrichment", status: "done", property_url: saved.property_url, saved_report_id: saved.id, report })
        if (error) console.error("[connector] failed to store enriched report:", error.message)
        return reply({ reportId: saved.id, createdAt: saved.created_at, report, note: "Area figures are as of today, not the day the report was first made." })
      } catch (error) {
        console.error("[connector] could not build the full report:", error)
        return reply({ reportId: saved.id, createdAt: saved.created_at, listing: saved.report_data, note: "Only the listing data could be loaded for this older report." })
      }
    }
  )

  server.registerTool(
    "get_allowance",
    {
      title: "Check my allowance",
      description: "How many new property analyses the member has left this month through the connector, and when the allowance resets.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (): Promise<ToolResult> => {
      if (!caller.isLifetime) return refuse(LIFETIME_ONLY)
      return reply(await getAllowance(admin, userId))
    }
  )
}
