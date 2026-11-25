/**
 * Mostra apenas o necessário para a pessoa reconhecer a conta conectada,
 * sem devolver o número inteiro na API.
 */
export function maskAccount(jid: string | null | undefined): string | null {
  if (!jid) return null

  const digits = jid.split("@")[0].split(":")[0]
  if (digits.length < 8) return null

  return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} *****-${digits.slice(-4)}`
}
