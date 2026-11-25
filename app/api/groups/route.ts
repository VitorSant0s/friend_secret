import { limitRequest, tooManyRequests } from "@/lib/api-limits"
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
    return Response.json({ groups: await listGroups(id) })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 },
    )
  }
}
