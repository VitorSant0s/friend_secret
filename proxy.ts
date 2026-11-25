import { NextResponse, type NextRequest } from "next/server"

const ALLOWED_HEADERS = "content-type, x-session-id"

function corsHeaders(request: NextRequest): Record<string, string> {
  const configured = process.env.ALLOWED_ORIGIN?.trim()
  const origin = request.headers.get("origin")
  // Sem ALLOWED_ORIGIN, só o próprio domínio acessa (same-origin não precisa de CORS).
  const allowOrigin = !configured
    ? null
    : configured === "*"
      ? "*"
      : origin === configured
        ? origin
        : null

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  }

  if (!allowOrigin) return { Vary: "Origin" }
  headers["Access-Control-Allow-Origin"] = allowOrigin
  return headers
}

export function proxy(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(request),
    })
  }

  const response = NextResponse.next()
  for (const [key, value] of Object.entries(corsHeaders(request))) {
    response.headers.set(key, value)
  }
  response.headers.set("Cache-Control", "no-store")
  response.headers.set("X-Content-Type-Options", "nosniff")
  return response
}

export const config = {
  matcher: "/api/:path*",
}
