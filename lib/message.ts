import type { Delivery } from "./draw"

type Options = {
  date?: string
}

export function formatMessage(delivery: Delivery, options: Options = {}): string {
  const { person, ownTarget, extras } = delivery

  const lines = [
    `Oi, ${person.name}! 🎅`,
    "",
    `Seu amigo secreto é: *${ownTarget.name}*`,
  ]

  if (extras.length > 0) {
    lines.push("")
    lines.push("Também vou te passar o de quem não tem celular:")
    for (const extra of extras) {
      lines.push(
        `*${extra.forPerson.name}* tirou *${extra.target.name}* — avise ${extra.forPerson.name} pessoalmente, sem contar pra mais ninguém.`,
      )
    }
  }

  if (options.date) {
    lines.push("")
    lines.push(`O presente será entregue no dia ${options.date}.`)
  }

  lines.push("")
  lines.push("Segredo até o dia! 🤫")

  return lines.join("\n")
}
