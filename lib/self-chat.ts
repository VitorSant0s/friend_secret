export type OwnUser = {
  id?: string | null
  lid?: string | null
  phoneNumber?: string | null
}

/** Remove o sufixo de aparelho (":12") e deixa só usuário@servidor. */
export function normalizeJid(jid: string): string {
  const [user, server] = jid.split("@")
  if (!server) return jid.trim()
  return `${user.split(":")[0]}@${server}`
}

/** Evita apagar a mensagem quando o organizador envia para si mesmo. */
export function isOwnChat(
  user: OwnUser | null | undefined,
  jid: string,
): boolean {
  if (!user) return false

  const target = normalizeJid(jid)
  const own = [user.id, user.lid, user.phoneNumber]
    .filter((value): value is string => Boolean(value))
    .map(normalizeJid)

  return own.includes(target)
}
