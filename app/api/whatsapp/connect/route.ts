import { invalidSession, requestSessionId } from "@/lib/api-session"
import { SessionExpiredError } from "@/lib/session"
import { TooManySessionsError, connect, sessionStatus } from "@/lib/whatsapp"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const id = requestSessionId(request)
  if (!id) return invalidSession()

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
