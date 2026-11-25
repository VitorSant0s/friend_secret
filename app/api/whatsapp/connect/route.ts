import { clientIp, limitRequest, tooManyRequests } from "@/lib/api-limits"
import { audit } from "@/lib/audit"
import { invalidSession, requestSessionId } from "@/lib/api-session"
import { SessionExpiredError } from "@/lib/session"
import {
  TooManySessionsError,
  connect,
  sessionExists,
  sessionStatus,
} from "@/lib/whatsapp"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const ipLimit = limitRequest(request, "connect-ip", 60, 60_000)
  if (!ipLimit.allowed) return tooManyRequests(ipLimit)

  const id = requestSessionId(request)
  if (!id) return invalidSession()

  const isNew = !sessionExists(id)
  if (isNew) {
    const creationLimit = limitRequest(request, "connect-new", 10, 10 * 60_000)
    if (!creationLimit.allowed) return tooManyRequests(creationLimit)
  }

  audit({
    event: "connect.requested",
    sessionId: id,
    ip: clientIp(request),
    detail: { isNew },
  })

  try {
    await connect(id)
    return Response.json(await sessionStatus(id))
  } catch (error) {
    if (error instanceof TooManySessionsError) {
      audit({ event: "connect.rejected", sessionId: id, detail: { reason: "busy" } })
      return Response.json({ error: error.message }, { status: 429 })
    }
    if (error instanceof SessionExpiredError) {
      audit({ event: "connect.rejected", sessionId: id, detail: { reason: "expired" } })
      return Response.json(
        { error: error.message, expired: true },
        { status: 401 },
      )
    }
    audit({
      event: "connect.rejected",
      sessionId: id,
      detail: {
        reason: error instanceof Error ? error.message.slice(0, 160) : "unknown",
      },
    })
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    )
  }
}
