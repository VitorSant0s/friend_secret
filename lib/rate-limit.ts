type Bucket = {
  count: number
  resetAt: number
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterMs: number
}

/** Contador de janela fixa por chave, mantido em memória. */
export class RateLimiter {
  private buckets = new Map<string, Bucket>()

  hit(
    key: string,
    limit: number,
    windowMs: number,
    now: number = Date.now(),
  ): RateLimitResult {
    const current = this.buckets.get(key)

    if (!current || now >= current.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs })
      this.prune(now)
      return { allowed: true, remaining: Math.max(0, limit - 1), retryAfterMs: 0 }
    }

    current.count += 1
    const allowed = current.count <= limit
    return {
      allowed,
      remaining: Math.max(0, limit - current.count),
      retryAfterMs: allowed ? 0 : Math.max(0, current.resetAt - now),
    }
  }

  private prune(now: number): void {
    if (this.buckets.size < 5000) return
    for (const [key, bucket] of this.buckets) {
      if (now >= bucket.resetAt) this.buckets.delete(key)
    }
  }
}

const globalForLimit = globalThis as unknown as {
  __amigoSecretoRateLimiter?: RateLimiter
}

export function rateLimiter(): RateLimiter {
  if (!globalForLimit.__amigoSecretoRateLimiter) {
    globalForLimit.__amigoSecretoRateLimiter = new RateLimiter()
  }
  return globalForLimit.__amigoSecretoRateLimiter
}
