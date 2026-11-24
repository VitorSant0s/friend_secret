import { describe, expect, it } from "vitest"
import { buildPeople } from "./participants"

const group = [
  { id: "g1", name: "Ana" },
  { id: "g2", name: "Bia" },
]

describe("buildPeople", () => {
  it("aceita pessoa de fora do grupo, sempre sem celular", () => {
    const people = buildPeople(group, [
      { id: "externo-1", name: "Maria", hasPhone: true, external: true },
      { id: "g1", hasPhone: true },
      { id: "g2", hasPhone: true },
    ])

    expect(people[0]).toEqual({
      id: "externo-1",
      name: "Maria",
      hasPhone: false,
    })
  })

  it("exige nome para quem está fora do grupo", () => {
    expect(() =>
      buildPeople(group, [{ id: "externo-1", external: true }]),
    ).toThrow(/nome/i)
    expect(() =>
      buildPeople(group, [{ id: "externo-1", name: "  ", external: true }]),
    ).toThrow(/nome/i)
  })

  it("usa o nome corrigido para quem está no grupo", () => {
    const people = buildPeople(group, [{ id: "g1", name: "Ana Paula" }])

    expect(people[0].name).toBe("Ana Paula")
  })

  it("usa o nome do grupo quando não veio nome", () => {
    const people = buildPeople(group, [{ id: "g1" }])

    expect(people[0].name).toBe("Ana")
    expect(people[0].hasPhone).toBe(true)
  })

  it("recusa pessoa que não está no grupo e não foi marcada como externa", () => {
    expect(() => buildPeople(group, [{ id: "fantasma" }])).toThrow(/grupo/i)
  })

  it("recusa identificadores repetidos", () => {
    expect(() =>
      buildPeople(group, [{ id: "g1" }, { id: "g1" }]),
    ).toThrow(/repetidos/i)
  })

  it("recusa participante sem identificação", () => {
    expect(() => buildPeople(group, [{ name: "Sem id" }])).toThrow(
      /identificação/i,
    )
  })

  it("limpa o nome de quem está fora", () => {
    const people = buildPeople(group, [
      { id: "externo-1", name: "  Maria\n*Silva* ", external: true },
    ])

    expect(people[0].name).toBe("Maria Silva")
  })
})
