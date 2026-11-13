import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
import { authenticateConnectorRequest, createAdminClient } from "@/lib/connector/access"
import { connectorOrigin, CONNECTOR_SCOPE } from "@/lib/connector/origin"
import { registerConnectorTools } from "@/lib/connector/tools"

// The HomeLens connector for Claude and ChatGPT (a remote MCP server).
//
// Members add this address as a custom connector, sign in with their HomeLens account
// (Supabase Auth is the OAuth server; see /oauth/consent), and their assistant can then
// generate and read reports. Stateless: every request carries the member's token and
// gets a fresh server, which suits serverless hosting.

// A full report (scrape, background lookups, offer) can take longer than the website's 60s.
export const maxDuration = 300

const INSTRUCTIONS =
  "HomeLens analyses UK homes for sale. Give analyse_property a Rightmove listing link to get a full report (score out of 999, recommended offer, price against the area, market, risks, nearby places). New analyses are limited each month, so read an existing report with list_reports and get_report when one exists, and don't analyse the same listing twice. Present reports as guidance, not a valuation, and quote only figures that appear in the report."

function unauthorized(request: Request): Response {
  const metadata = `${connectorOrigin(request)}/.well-known/oauth-protected-resource`
  return new Response(JSON.stringify({ error: "unauthorized", error_description: "Sign in to HomeLens to use this connector." }), {
    status: 401,
    headers: {
      "Content-Type": "application/json",
      "WWW-Authenticate": `Bearer resource_metadata="${metadata}", scope="${CONNECTOR_SCOPE}"`,
    },
  })
}

export async function POST(request: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "server_error", error_description: "The connector is not configured." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }

  const admin = createAdminClient()
  const caller = await authenticateConnectorRequest(request, admin)
  if (!caller) return unauthorized(request)

  const server = new McpServer({ name: "homelens", title: "HomeLens", version: "1.0.0" }, { instructions: INSTRUCTIONS })
  registerConnectorTools(server, admin, caller)

  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  await server.connect(transport)
  return transport.handleRequest(request)
}

// No server-to-client stream and no sessions to end: this server only answers requests.
const methodNotAllowed = () =>
  new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null }), {
    status: 405,
    headers: { "Content-Type": "application/json", Allow: "POST" },
  })

export const GET = methodNotAllowed
export const DELETE = methodNotAllowed
