import { audit } from "@/lib/audit"
import { clientIp } from "@/lib/api-limits"
import { isValidSessionId } from "@/lib/session"

const lastAuthLog = new Map<string, number>()

function logInvalidSession(request: Request): void {
  const ip = clientIp(request)
  const path = new URL(request.url).pathname
  const key = `${ip}:${path}`
  const now = Date.now()

  if (now - (lastAuthLog.get(key) ?? 0) < 5 * 60_000) return
  lastAuthLog.set(key, now)
  if (lastAuthLog.size > 1000) lastAuthLog.clear()

  audit({ event: "auth.invalid", ip, detail: { path } })
}

export function requestSessionId(request: Request): string | null {
  const value = request.headers.get("x-session-id")
  if (!isValidSessionId(value)) {
    logInvalidSession(request)
    return null
  }
  return value
}

export function invalidSession(): Response {
  return Response.json(
    {
      error: "Sua conexão expirou. Recarregue a página.",
      expired: true,
    },
    { status: 401 },
  )
}
