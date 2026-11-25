export type LegalConfig = {
  operatorName: string
  contactEmail: string
  dpoEmail: string
  hosting: string
  logRetention: string
  minimumAge: number
}

/**
 * Preencha estes campos antes de publicar. Enquanto algum campo estiver vazio
 * ou com o texto "PREENCHER", as páginas de termos exibem um aviso.
 */
export const legalConfig: LegalConfig = {
  operatorName: "PREENCHER: nome público ou nome do projeto",
  contactEmail: "PREENCHER: e-mail de contato do projeto",
  dpoEmail: "PREENCHER: e-mail do encarregado de dados",
  hosting: "PREENCHER: provedores de hospedagem e região",
  logRetention: "PREENCHER: prazo de guarda dos logs de acesso",
  minimumAge: 18,
}

export const LEGAL_VERSION = "1.0"
export const LEGAL_DATE = "25 de novembro de 2026"

const REQUIRED_FIELDS: (keyof LegalConfig)[] = [
  "operatorName",
  "contactEmail",
  "dpoEmail",
  "hosting",
  "logRetention",
]

export function missingLegalFields(config: LegalConfig = legalConfig): string[] {
  return REQUIRED_FIELDS.filter((field) => {
    const value = String(config[field] ?? "").trim()
    return !value || value.toUpperCase().startsWith("PREENCHER")
  })
}
