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
