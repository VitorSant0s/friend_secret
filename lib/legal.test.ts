import { describe, expect, it } from "vitest"
import { missingLegalFields } from "./legal"

const complete = {
  operatorName: "Maria Silva",
  document: "000.000.000-00",
  city: "São Paulo/SP",
  contactEmail: "contato@exemplo.com",
  dpoEmail: "dpo@exemplo.com",
  hosting: "AWS e Netlify",
  logRetention: "6 meses",
  minimumAge: 18,
}

describe("missingLegalFields", () => {
  it("não falta nada quando tudo está preenchido", () => {
    expect(missingLegalFields(complete)).toEqual([])
  })

  it("aponta os campos vazios", () => {
    expect(
      missingLegalFields({ ...complete, contactEmail: "", city: "  " }),
    ).toEqual(["city", "contactEmail"])
  })

  it("aponta placeholders que ainda não foram trocados", () => {
    expect(
      missingLegalFields({
        ...complete,
        operatorName: "PREENCHER: nome ou razão social",
        dpoEmail: "PREENCHER: e-mail do encarregado",
      }),
    ).toEqual(["operatorName", "dpoEmail"])
  })
})
