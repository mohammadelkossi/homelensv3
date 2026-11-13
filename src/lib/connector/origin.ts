/**
 * The public address this request arrived at. Behind Vercel or a tunnel the request
 * URL is the internal one, so the forwarded headers win.
 */
export function connectorOrigin(request: Request): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  if (!host) return new URL(request.url).origin
  const proto = request.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https")
  return `${proto.split(",")[0].trim()}://${host.split(",")[0].trim()}`
}

/**
 * The only scope assistants should ask for. Left to themselves they request every
 * scope Supabase advertises, including `openid`, and Supabase can't issue the ID token
 * that goes with it while this project signs tokens with HS256: the token request
 * fails with "Error generating ID token" (found 13 Nov 2026).
 */
export const CONNECTOR_SCOPE = "email"
