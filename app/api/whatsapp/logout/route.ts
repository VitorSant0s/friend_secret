import { limitRequest, tooManyRequests } from "@/lib/api-limits"
import { invalidSession, requestSessionId } from "@/lib/api-session"
import { destroySession } from "@/lib/whatsapp"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const ipLimit = limitRequest(request, "logout-ip", 30, 60_000)
  if (!ipLimit.allowed) return tooManyRequests(ipLimit)

  const id = requestSessionId(request)
  if (!id) return invalidSession()

  await destroySession(id)

  return Response.json({
    status: "idle",
    qr: null,
    account: null,
    error: null,
    expiresAt: null,
    expired: false,
  })
}
