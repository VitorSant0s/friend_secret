import { limitRequest, tooManyRequests } from "@/lib/api-limits"
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

  if (!sessionExists(id)) {
    const creationLimit = limitRequest(request, "connect-new", 10, 10 * 60_000)
    if (!creationLimit.allowed) return tooManyRequests(creationLimit)
  }

  try {
    await connect(id)
    return Response.json(await sessionStatus(id))
  } catch (error) {
    if (error instanceof TooManySessionsError) {
      return Response.json({ error: error.message }, { status: 429 })
    }
    if (error instanceof SessionExpiredError) {
      return Response.json(
        { error: error.message, expired: true },
        { status: 401 },
      )
    }
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    )
  }
}
