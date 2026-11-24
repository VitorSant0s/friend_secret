import { describe, expect, it } from "vitest"
import {
  SESSION_TTL_MS,
  hasExpired,
  isValidSessionId,
  sessionExpiresAt,
  sessionIsExpired,
} from "./session"

describe("isValidSessionId", () => {
  it("aceita o formato gerado pelo navegador", () => {
    expect(isValidSessionId("3f0f0f2e-1f6b-4b7e-9f0e-5f0f0f0f0f0f")).toBe(true)
    expect(isValidSessionId("abcdef0123456789")).toBe(true)
  })

  it("recusa valores estranhos ou perigosos", () => {
    expect(isValidSessionId("")).toBe(false)
    expect(isValidSessionId("curto")).toBe(false)
    expect(isValidSessionId("../outra-pasta")).toBe(false)
    expect(isValidSessionId("sessao com espaço e bem comprida")).toBe(false)
    expect(isValidSessionId(undefined)).toBe(false)
    expect(isValidSessionId(42)).toBe(false)
  })
})

describe("expiração", () => {
  const now = 1_700_000_000_000

  it("vale por uma hora", () => {
    expect(SESSION_TTL_MS).toBe(60 * 60 * 1000)
  })

  it("continua válida antes de uma hora", () => {
    expect(sessionIsExpired(now - 59 * 60 * 1000, now)).toBe(false)
  })

  it("expira ao completar uma hora", () => {
    expect(sessionIsExpired(now - SESSION_TTL_MS, now)).toBe(true)
    expect(sessionIsExpired(now - SESSION_TTL_MS - 1, now)).toBe(true)
  })

  it("calcula o horário de expiração", () => {
    expect(sessionExpiresAt(now)).toBe(now + SESSION_TTL_MS)
  })

  it("compara pelo horário de expiração", () => {
    expect(hasExpired(now + 1, now)).toBe(false)
    expect(hasExpired(now, now)).toBe(true)
  })
})
