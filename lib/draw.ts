export type Participant = {
  id: string
  name: string
  hasPhone: boolean
}

/** Quem dá presente para quem: giverId -> targetId. */
export type Assignment = Record<string, string>

/** Pessoa sem celular -> pessoa que recebe e repassa o nome dela. */
export type Representatives = Record<string, string>

export type Delivery = {
  person: Participant
  ownTarget: Participant
  extras: { forPerson: Participant; target: Participant }[]
}

type Rng = (max: number) => number

function shuffle<T>(items: T[], rng: Rng): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng(i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function isValid(ids: string[], targets: string[]): boolean {
  const targetIndex = new Map(targets.map((id, index) => [id, index]))

  for (let i = 0; i < ids.length; i++) {
    if (targets[i] === ids[i]) return false
    const j = targetIndex.get(ids[i])!
    if (targets[j] === ids[i]) return false
  }
  return true
}

export function drawSecretSanta(
  participants: Participant[],
  rng: Rng = Math.random,
): Assignment {
  if (participants.length < 4) {
    throw new Error("O sorteio precisa de pelo menos quatro participantes.")
  }

  const ids = participants.map((participant) => participant.id)

  for (let attempt = 0; attempt < 1000; attempt++) {
    const targets = shuffle(ids, rng)
    if (isValid(ids, targets)) {
      return Object.fromEntries(ids.map((id, index) => [id, targets[index]]))
    }
  }

  const ring = shuffle(ids, rng)
  return Object.fromEntries(
    ring.map((id, index) => [id, ring[(index + 1) % ring.length]]),
  )
}

export function validateSetup(
  participants: Participant[],
  representatives: Representatives,
): void {
  const byId = new Map(participants.map((participant) => [participant.id, participant]))

  for (const [representedId, representativeId] of Object.entries(representatives)) {
    const represented = byId.get(representedId)
    const representative = byId.get(representativeId)

    if (!represented) {
      throw new Error("O representante foi indicado para alguém que não está no grupo.")
    }
    if (!representative) {
      throw new Error("O representante indicado não está no grupo.")
    }
    if (representedId === representativeId) {
      throw new Error("Ninguém pode ser representante de si mesmo.")
    }
    if (!representative.hasPhone) {
      throw new Error(
        `${representative.name} não tem celular e não pode ser representante.`,
      )
    }
  }

  for (const participant of participants) {
    if (!participant.hasPhone && !representatives[participant.id]) {
      throw new Error(
        `${participant.name} não tem celular e precisa de um representante.`,
      )
    }
  }
}

export function buildDeliveryPlan(
  participants: Participant[],
  representatives: Representatives,
  assignment: Assignment,
): Delivery[] {
  const byId = new Map(participants.map((participant) => [participant.id, participant]))

  const plan: Delivery[] = []

  for (const person of participants) {
    if (!person.hasPhone) continue

    const ownTarget = byId.get(assignment[person.id])
    if (!ownTarget) {
      throw new Error(`O sorteio não definiu o amigo secreto de ${person.name}.`)
    }

    const extras = Object.entries(representatives)
      .filter(([, representativeId]) => representativeId === person.id)
      .map(([representedId]) => {
        const forPerson = byId.get(representedId)!
        const target = byId.get(assignment[representedId])
        if (!target) {
          throw new Error(
            `O sorteio não definiu o amigo secreto de ${forPerson.name}.`,
          )
        }
        return { forPerson, target }
      })

    plan.push({ person, ownTarget, extras })
  }

  return plan
}
