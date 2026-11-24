import type { Participant } from "./draw"
import { sanitizeName } from "./names"

export type GroupPerson = {
  id: string
  name: string
}

export type RequestedPerson = {
  id?: string
  name?: string
  hasPhone?: boolean
  /** Pessoa que não está no grupo do WhatsApp e não tem celular. */
  external?: boolean
}

export function buildPeople(
  group: GroupPerson[],
  requested: RequestedPerson[],
): Participant[] {
  const groupById = new Map(group.map((person) => [person.id, person]))
  const seen = new Set<string>()

  return requested.map((person) => {
    const id = person.id?.trim()
    if (!id) throw new Error("Um dos participantes está sem identificação.")
    if (seen.has(id)) throw new Error("A lista tem participantes repetidos.")
    seen.add(id)

    if (person.external) {
      const name = sanitizeName(person.name)
      if (!name) {
        throw new Error("Uma pessoa de fora do grupo está sem nome.")
      }
      return { id, name, hasPhone: false }
    }

    const fromGroup = groupById.get(id)
    if (!fromGroup) {
      throw new Error(
        "Alguém da lista saiu do grupo. Atualize a lista de participantes.",
      )
    }

    return {
      id,
      name: sanitizeName(person.name) || fromGroup.name,
      hasPhone: person.hasPhone !== false,
    }
  })
}
