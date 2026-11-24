import { invalidSession, requestSessionId } from "@/lib/api-session"
import { destroySession } from "@/lib/whatsapp"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const id = requestSessionId(request)
  if (!id) return invalidSession()

  await destroySession(id)

  return Response.json({
    status: "idle",
    qr: null,
    me: null,
    error: null,
    expiresAt: null,
    expired: false,
  })
}
