import { isValidSessionId } from "@/lib/session"

export function requestSessionId(request: Request): string | null {
  const value = request.headers.get("x-session-id")
  return isValidSessionId(value) ? value : null
}

export function invalidSession(): Response {
  return Response.json(
    {
      error: "Sessão inválida ou expirada. Recarregue a página.",
      expired: true,
    },
    { status: 401 },
  )
}
