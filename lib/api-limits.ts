import { rateLimiter, type RateLimitResult } from "./rate-limit"

/** IP real atrás do nginx; em desenvolvimento, sem proxy, usa "local". */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()

  const real = request.headers.get("x-real-ip")
  if (real) return real.trim()

  return "local"
}

export function limitRequest(
  request: Request,
  bucket: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  return rateLimiter().hit(`${bucket}:${clientIp(request)}`, limit, windowMs)
}

export function tooManyRequests(result: RateLimitResult): Response {
  const seconds = Math.max(1, Math.ceil(result.retryAfterMs / 1000))
  return Response.json(
    {
      error:
        "Muitas requisições em pouco tempo. Aguarde alguns instantes e tente de novo.",
    },
    { status: 429, headers: { "Retry-After": String(seconds) } },
  )
}
