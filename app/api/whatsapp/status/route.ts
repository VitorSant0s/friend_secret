import { requestSessionId } from "@/lib/api-session"
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
  const id = requestSessionId(request)
  if (!id) return Response.json(EMPTY, { headers: { "Cache-Control": "no-store" } })

  try {
    return Response.json(await sessionStatus(id), {
      headers: { "Cache-Control": "no-store" },
    })
  } catch {
    return Response.json(EMPTY, { headers: { "Cache-Control": "no-store" } })
  }
}
