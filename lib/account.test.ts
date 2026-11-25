import { describe, expect, it } from "vitest"
import { maskAccount } from "./account"

describe("maskAccount", () => {
  it("mostra só o começo e os últimos dígitos", () => {
    expect(maskAccount("5511999999999@s.whatsapp.net")).toBe(
      "+55 11 *****-9999",
    )
  })

  it("ignora o sufixo de aparelho", () => {
    expect(maskAccount("5511999999999:12@s.whatsapp.net")).toBe(
      "+55 11 *****-9999",
    )
  })

  it("devolve nulo sem identificação", () => {
    expect(maskAccount(null)).toBeNull()
    expect(maskAccount(undefined)).toBeNull()
    expect(maskAccount("")).toBeNull()
  })

  it("devolve nulo quando não há dígitos suficientes", () => {
    expect(maskAccount("123@s.whatsapp.net")).toBeNull()
  })
})
