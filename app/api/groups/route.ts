import { clientIp, limitRequest, tooManyRequests } from "@/lib/api-limits"
import { audit } from "@/lib/audit"
import { invalidSession, requestSessionId } from "@/lib/api-session"
import { listGroups } from "@/lib/whatsapp"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const ipLimit = limitRequest(request, "groups-ip", 120, 60_000)
  if (!ipLimit.allowed) return tooManyRequests(ipLimit)

  const id = requestSessionId(request)
  if (!id) return invalidSession()

  try {
    const groups = await listGroups(id)
    audit({
      event: "groups.listed",
      sessionId: id,
      ip: clientIp(request),
      detail: { count: groups.length },
    })
    return Response.json({ groups })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    )
  }
}
