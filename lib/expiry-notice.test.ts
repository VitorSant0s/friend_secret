import { describe, expect, it } from "vitest"
import { EXPIRY_NOTICE, expiryNotice } from "./expiry-notice"

describe("expiryNotice", () => {
  it("avisa só quem chegou a conectar ou recebeu o código", () => {
    expect(expiryNotice("connected")).toBe(EXPIRY_NOTICE)
    expect(expiryNotice("qr")).toBe(EXPIRY_NOTICE)
  })

  it("não avisa quem nunca conectou", () => {
    expect(expiryNotice("idle")).toBeUndefined()
    expect(expiryNotice("error")).toBeUndefined()
    expect(expiryNotice(null)).toBeUndefined()
    expect(expiryNotice(undefined)).toBeUndefined()
  })
})
