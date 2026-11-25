import { audit } from "./audit"
import { rateLimiter, type RateLimitResult } from "./rate-limit"

/** IP real atrás do nginx; em desenvolvimento, sem proxy, usa "local". */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()

  const real = request.headers.get("x-real-ip")
  if (real) return real.trim()

  return "local"
}

const lastLimitLog = new Map<string, number>()

export function limitRequest(
  request: Request,
  bucket: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const ip = clientIp(request)
  const result = rateLimiter().hit(`${bucket}:${ip}`, limit, windowMs)

  if (!result.allowed) {
    const key = `${bucket}:${ip}`
    const now = Date.now()
    if (now - (lastLimitLog.get(key) ?? 0) >= 60_000) {
      lastLimitLog.set(key, now)
      if (lastLimitLog.size > 1000) lastLimitLog.clear()
      audit({ event: "rate.limited", ip, detail: { bucket } })
    }
  }

  return result
}

export function tooManyRequests(result: RateLimitResult): Response {
  const seconds = Math.max(1, Math.ceil(result.retryAfterMs / 1000))
  return Response.json(
    {
      error:
        "Muitas tentativas em pouco tempo. Aguarde alguns instantes e tente de novo.",
    },
    { status: 429, headers: { "Retry-After": String(seconds) } },
  )
}
