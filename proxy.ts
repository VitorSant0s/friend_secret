import { NextResponse, type NextRequest } from "next/server"

const ALLOWED_HEADERS = "content-type, x-session-id"

function corsHeaders(request: NextRequest): Record<string, string> {
  const configured = process.env.ALLOWED_ORIGIN?.trim() || "*"
  const origin = request.headers.get("origin")
  const allowOrigin =
    configured === "*" ? "*" : origin === configured ? origin : null

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  }

  if (allowOrigin) headers["Access-Control-Allow-Origin"] = allowOrigin
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
  return response
}

export const config = {
  matcher: "/api/:path*",
}
