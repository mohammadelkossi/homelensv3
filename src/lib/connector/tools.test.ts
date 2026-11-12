import { describe, expect, it } from "vitest"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import type { SupabaseClient, User } from "@supabase/supabase-js"
import { registerConnectorTools } from "./tools"
import { CONNECTOR_MONTHLY_ANALYSES } from "./access"

/** A Supabase stand-in: every query on `connector_reports` resolves to `usageRows`. */
function fakeAdmin(usageRows: { status: string; created_at: string }[]): SupabaseClient {
  const query: Record<string, unknown> = {}
  for (const method of ["select", "eq", "gte", "order", "limit"]) query[method] = () => query
  query.then = (resolve: (value: { data: unknown[]; error: null }) => void) => resolve({ data: usageRows, error: null })
  return { from: () => query } as unknown as SupabaseClient
}

async function connect(isLifetime: boolean, usageRows: { status: string; created_at: string }[] = []) {
  const server = new McpServer({ name: "homelens", version: "test" })
  registerConnectorTools(server, fakeAdmin(usageRows), { user: { id: "user-1" } as User, isLifetime })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: "test", version: "1" })
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)])
  return client
}

const text = (result: unknown) => (result as { content: { text: string }[] }).content[0].text

describe("connector tools", () => {
  it("offers the four tools", async () => {
    const client = await connect(true)
    const { tools } = await client.listTools()
    expect(tools.map((t) => t.name).sort()).toEqual(["analyse_property", "get_allowance", "get_report", "list_reports"])
  })

  it("turns away accounts that aren't Lifetime", async () => {
    const client = await connect(false)
    const result = await client.callTool({ name: "get_allowance", arguments: {} })
    expect(result.isError).toBe(true)
    expect(text(result)).toContain("Pro Lifetime")
  })

  it("reports the allowance left this month", async () => {
    const now = new Date().toISOString()
    const client = await connect(true, [
      { status: "done", created_at: now },
      { status: "done", created_at: now },
      { status: "pending", created_at: now },
      // A request that crashed long ago no longer holds a slot.
      { status: "pending", created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() },
    ])
    const allowance = JSON.parse(text(await client.callTool({ name: "get_allowance", arguments: {} })))
    expect(allowance).toMatchObject({ used: 3, limit: CONNECTOR_MONTHLY_ANALYSES, remaining: CONNECTOR_MONTHLY_ANALYSES - 3 })
  })

  it("rejects a link that isn't a Rightmove listing before spending anything", async () => {
    const client = await connect(true)
    const result = await client.callTool({ name: "analyse_property", arguments: { rightmove_url: "https://www.zoopla.co.uk/for-sale/details/1" } })
    expect(result.isError).toBe(true)
    expect(text(result)).toContain("Rightmove listing link")
  })

  it("refuses a new analysis once the month's allowance is used", async () => {
    const now = new Date().toISOString()
    const full = Array.from({ length: CONNECTOR_MONTHLY_ANALYSES }, () => ({ status: "done", created_at: now }))
    // The fake returns rows without a stored report, so the repeat-listing shortcut doesn't fire.
    const client = await connect(true, full)
    const result = await client.callTool({ name: "analyse_property", arguments: { rightmove_url: "https://www.rightmove.co.uk/properties/123456789" } })
    expect(result.isError).toBe(true)
    expect(text(result)).toContain("have been used")
  })
})
