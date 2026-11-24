import { describe, expect, it } from "vitest"
import {
  type Assignment,
  buildDeliveryPlan,
  drawSecretSanta,
  Participant,
  validateSetup,
} from "./draw"

function people(n: number): Participant[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `Pessoa ${i}`,
    hasPhone: true,
  }))
}

function assertValidDraw(
  participants: Participant[],
  assignment: Record<string, string>,
) {
  const ids = participants.map((p) => p.id)
  const targets = new Set(Object.values(assignment))

  expect(Object.keys(assignment).sort()).toEqual([...ids].sort())
  expect(targets.size).toBe(ids.length)
  for (const id of ids) {
    expect(assignment[id]).not.toBe(id)
  }
  for (const id of ids) {
    const target = assignment[id]
    expect(assignment[target]).not.toBe(id)
  }
}

describe("drawSecretSanta", () => {
  it("dá um alvo para cada pessoa, nunca ela mesma", () => {
    const participants = people(8)
    const assignment = drawSecretSanta(participants)

    for (const p of participants) {
      expect(assignment[p.id]).toBeDefined()
      expect(assignment[p.id]).not.toBe(p.id)
    }
  })

  it("distribui cada pessoa como alvo de exatamente uma pessoa", () => {
    const participants = people(10)
    const assignment = drawSecretSanta(participants)

    assertValidDraw(participants, assignment)
  })

  it("nunca cria par trocado", () => {
    const participants = people(6)

    for (let run = 0; run < 500; run++) {
      const assignment = drawSecretSanta(participants)
      for (const [giver, target] of Object.entries(assignment)) {
        expect(assignment[target]).not.toBe(giver)
      }
    }
  })

  it("exige pelo menos quatro participantes", () => {
    expect(() => drawSecretSanta(people(3))).toThrow(/quatro/i)
  })

  it("aceita randomizador injetado e o usa", () => {
    const participants = people(4)
    const calls: number[] = []
    const rng = (max: number) => {
      calls.push(max)
      return 0
    }

    const assignment = drawSecretSanta(participants, rng)

    expect(calls.length).toBeGreaterThan(0)
    assertValidDraw(participants, assignment)
  })
})

describe("validateSetup", () => {
  it("aceita configuração sem representantes", () => {
    const participants = people(4)
    expect(() => validateSetup(participants, {})).not.toThrow()
  })

  it("exige representante para quem não tem celular", () => {
    const participants = people(4).map((p) =>
      p.id === "p3" ? { ...p, hasPhone: false } : p,
    )
    expect(() => validateSetup(participants, {})).toThrow(/representante/i)
  })

  it("recusa representante que não está no grupo", () => {
    const participants = people(4).map((p) =>
      p.id === "p3" ? { ...p, hasPhone: false } : p,
    )
    expect(() => validateSetup(participants, { p3: "fantasma" })).toThrow(
      /representante/i,
    )
  })

  it("recusa representante sem celular", () => {
    const participants = people(4).map((p) =>
      p.id === "p2" || p.id === "p3" ? { ...p, hasPhone: false } : p,
    )
    expect(() => validateSetup(participants, { p3: "p2" })).toThrow(
      /celular/i,
    )
  })

  it("recusa pessoa sem celular que representa a si mesma", () => {
    const participants = people(4).map((p) =>
      p.id === "p3" ? { ...p, hasPhone: false } : p,
    )
    expect(() => validateSetup(participants, { p3: "p3" })).toThrow(
      /representante/i,
    )
  })
})

describe("buildDeliveryPlan", () => {
  it("manda só um nome para quem tem celular", () => {
    const participants = people(4)
    const assignment: Assignment = { p0: "p1", p1: "p2", p2: "p3", p3: "p0" }

    const plan = buildDeliveryPlan(participants, {}, assignment)

    expect(plan).toHaveLength(4)
    for (const delivery of plan) {
      expect(delivery.extras).toEqual([])
      expect(delivery.ownTarget.id).toBe(assignment[delivery.person.id])
    }
  })

  it("manda dois nomes para o representante e nenhum para quem não tem celular", () => {
    const participants = people(4).map((p) =>
      p.id === "p3" ? { ...p, hasPhone: false } : p,
    )
    const assignment: Assignment = { p0: "p1", p1: "p2", p2: "p3", p3: "p0" }

    const plan = buildDeliveryPlan(participants, { p3: "p0" }, assignment)

    expect(plan.map((d) => d.person.id).sort()).toEqual(["p0", "p1", "p2"])
    const representative = plan.find((d) => d.person.id === "p0")!
    expect(representative.ownTarget.id).toBe("p1")
    expect(representative.extras).toHaveLength(1)
    expect(representative.extras[0].forPerson.id).toBe("p3")
    expect(representative.extras[0].target.id).toBe("p0")
  })

  it("junta vários representados na mesma mensagem do representante", () => {
    const participants = people(5).map((p) =>
      p.id === "p3" || p.id === "p4" ? { ...p, hasPhone: false } : p,
    )
    const assignment: Assignment = { p0: "p1", p1: "p2", p2: "p3", p3: "p4", p4: "p0" }

    const plan = buildDeliveryPlan(
      participants,
      { p3: "p0", p4: "p0" },
      assignment,
    )

    const representative = plan.find((d) => d.person.id === "p0")!
    expect(representative.extras.map((e) => e.forPerson.id).sort()).toEqual([
      "p3",
      "p4",
    ])
  })
})
