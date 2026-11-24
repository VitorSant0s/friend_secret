import { describe, expect, it } from "vitest"
import { formatMessage } from "./message"

const ana = { id: "a", name: "Ana", hasPhone: true }
const bia = { id: "b", name: "Bia", hasPhone: true }
const caio = { id: "c", name: "Caio", hasPhone: false }

describe("formatMessage", () => {
  it("diz o nome do amigo secreto de quem tem celular", () => {
    const text = formatMessage({
      person: ana,
      ownTarget: bia,
      extras: [],
    })

    expect(text).toContain("Ana")
    expect(text).toContain("Bia")
  })

  it("inclui a data do presente quando informada", () => {
    const text = formatMessage(
      { person: ana, ownTarget: bia, extras: [] },
      { date: "20/12" },
    )

    expect(text).toContain("20/12")
  })

  it("não fala de representados quando não há nenhum", () => {
    const text = formatMessage({ person: ana, ownTarget: bia, extras: [] })

    expect(text).not.toMatch(/celular/i)
  })

  it("avisa o representante sobre o amigo secreto de quem não tem celular", () => {
    const text = formatMessage({
      person: ana,
      ownTarget: bia,
      extras: [{ forPerson: caio, target: ana }],
    })

    expect(text).toContain("Caio")
    expect(text).toContain("Ana")
    expect(text).toMatch(/celular/i)
  })
})
