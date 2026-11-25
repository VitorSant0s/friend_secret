import { limitRequest, tooManyRequests } from "@/lib/api-limits"
import { invalidSession, requestSessionId } from "@/lib/api-session"
import { sessionStatus } from "@/lib/whatsapp"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const EMPTY = {
  status: "idle",
  qr: null,
  account: null,
  error: null,
  expiresAt: null,
  expired: true,
} as const

export async function GET(request: Request) {
  const ipLimit = limitRequest(request, "status-ip", 600, 60_000)
  if (!ipLimit.allowed) return tooManyRequests(ipLimit)

  const id = requestSessionId(request)
  if (!id) return invalidSession()

  const sessionLimit = limitRequest(
    request,
    `status-session-${id}`,
    180,
    60_000,
  )
  if (!sessionLimit.allowed) return tooManyRequests(sessionLimit)

  try {
    return Response.json(await sessionStatus(id), {
      headers: { "Cache-Control": "no-store" },
    })
  } catch {
    return Response.json(EMPTY, { headers: { "Cache-Control": "no-store" } })
  }
}
