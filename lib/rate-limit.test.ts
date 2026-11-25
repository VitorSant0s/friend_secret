import { describe, expect, it } from "vitest"
import { RateLimiter } from "./rate-limit"

describe("RateLimiter", () => {
  it("libera até o limite dentro da janela", () => {
    const limiter = new RateLimiter()
    for (let i = 0; i < 3; i++) {
      expect(limiter.hit("ip", 3, 1000, 0).allowed).toBe(true)
    }
    expect(limiter.hit("ip", 3, 1000, 0).allowed).toBe(false)
  })

  it("informa quanto tempo falta para tentar de novo", () => {
    const limiter = new RateLimiter()
    limiter.hit("ip", 1, 10_000, 1000)
    const blocked = limiter.hit("ip", 1, 10_000, 4000)

    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfterMs).toBe(7000)
  })

  it("libera de novo depois da janela", () => {
    const limiter = new RateLimiter()
    expect(limiter.hit("ip", 1, 1000, 0).allowed).toBe(true)
    expect(limiter.hit("ip", 1, 1000, 500).allowed).toBe(false)
    expect(limiter.hit("ip", 1, 1000, 1000).allowed).toBe(true)
  })

  it("separa contadores por chave", () => {
    const limiter = new RateLimiter()
    limiter.hit("a", 1, 1000, 0)
    expect(limiter.hit("b", 1, 1000, 0).allowed).toBe(true)
  })
})
