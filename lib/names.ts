/** Limpa o nome que vai nas mensagens: sem quebras de linha nem marcação. */
export function sanitizeName(value: string | null | undefined): string {
  if (!value) return ""

  return value
    .replace(/[*_\n\r\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60)
    .trim()
}
