import { NextRequest, NextResponse } from "next/server"
import { connectorOrigin } from "@/lib/connector/origin"

// OAuth protected-resource metadata (RFC 9728). When Claude or ChatGPT is refused by
// /api/mcp, it reads this to learn where to send the user to sign in: Supabase Auth,
// which is this project's OAuth server.
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      resource: `${connectorOrigin(request)}/api/mcp`,
      authorization_servers: [`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1`],
      bearer_methods_supported: ["header"],
      resource_name: "HomeLens",
    },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=3600" } }
  )
}
