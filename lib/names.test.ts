import { describe, expect, it } from "vitest"
import { sanitizeName } from "./names"

describe("sanitizeName", () => {
  it("apara e junta espaços", () => {
    expect(sanitizeName("  Ana   Paula ")).toBe("Ana Paula")
  })

  it("remove quebras de linha e asteriscos que quebram a mensagem", () => {
    expect(sanitizeName("Ana\n*Paula*")).toBe("Ana Paula")
  })

  it("limita o tamanho", () => {
    expect(sanitizeName("a".repeat(120)).length).toBe(60)
  })

  it("devolve vazio para entrada vazia ou só símbolos", () => {
    expect(sanitizeName("   ")).toBe("")
    expect(sanitizeName("***")).toBe("")
    expect(sanitizeName(undefined)).toBe("")
    expect(sanitizeName(null)).toBe("")
  })
})
