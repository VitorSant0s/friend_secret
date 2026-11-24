import { describe, expect, it } from "vitest"
import { buildPixPayload, crc16 } from "./pix"

type Tlv = { id: string; value: string }

function parseTlv(payload: string): Tlv[] {
  const items: Tlv[] = []
  let index = 0
  while (index < payload.length) {
    const id = payload.slice(index, index + 2)
    const length = Number(payload.slice(index + 2, index + 4))
    const value = payload.slice(index + 4, index + 4 + length)
    items.push({ id, value })
    index += 4 + length
  }
  return items
}

function find(items: Tlv[], id: string): Tlv | undefined {
  return items.find((item) => item.id === id)
}

describe("crc16", () => {
  it("bate com o vetor conhecido CRC-16/CCITT-FALSE", () => {
    expect(crc16("123456789")).toBe("29B1")
  })
})

describe("buildPixPayload", () => {
  const base = {
    key: "pix@exemplo.com",
    merchantName: "Maria Silva",
    merchantCity: "Sao Paulo",
  }

  it("monta os campos obrigatórios do PIX", () => {
    const payload = buildPixPayload({ ...base, amount: 1 })
    const items = parseTlv(payload)

    expect(find(items, "00")?.value).toBe("01")
    expect(find(items, "53")?.value).toBe("986")
    expect(find(items, "58")?.value).toBe("BR")
    expect(find(items, "59")?.value).toBe("MARIA SILVA")
    expect(find(items, "60")?.value).toBe("SAO PAULO")
  })

  it("coloca a chave e o GUI dentro do campo do recebedor", () => {
    const payload = buildPixPayload({ ...base, amount: 1 })
    const merchant = parseTlv(parseTlv(payload).find((i) => i.id === "26")!.value)

    expect(find(merchant, "00")?.value).toBe("br.gov.bcb.pix")
    expect(find(merchant, "01")?.value).toBe("pix@exemplo.com")
  })

  it("grava o valor com duas casas", () => {
    const payload = buildPixPayload({ ...base, amount: 1 })

    expect(find(parseTlv(payload), "54")?.value).toBe("1.00")
    expect(buildPixPayload({ ...base, amount: 2.5 })).toContain("54042.50")
  })

  it("termina com o CRC calculado sobre o resto do código", () => {
    const payload = buildPixPayload({ ...base, amount: 3 })

    expect(payload.endsWith("6304" + crc16(payload.slice(0, -4)))).toBe(true)
  })

  it("limpa acentos e caracteres especiais do nome e da cidade", () => {
    const payload = buildPixPayload({
      key: "pix@exemplo.com",
      merchantName: "João & Cia.",
      merchantCity: "São Paulo - SP",
      amount: 1,
    })
    const items = parseTlv(payload)

    expect(find(items, "59")?.value).toBe("JOAO CIA")
    expect(find(items, "60")?.value).toBe("SAO PAULO SP")
  })

  it("respeita os limites de tamanho do nome e da cidade", () => {
    const payload = buildPixPayload({
      key: "pix@exemplo.com",
      merchantName: "Nome Muito Comprido Que Nao Cabe No Campo",
      merchantCity: "Cidade Com Nome Bem Comprido",
      amount: 1,
    })
    const items = parseTlv(payload)

    expect(find(items, "59")!.value.length).toBeLessThanOrEqual(25)
    expect(find(items, "60")!.value.length).toBeLessThanOrEqual(15)
  })

  it("recusa valor zero, negativo ou absurdo", () => {
    expect(() => buildPixPayload({ ...base, amount: 0 })).toThrow(/valor/i)
    expect(() => buildPixPayload({ ...base, amount: -1 })).toThrow(/valor/i)
    expect(() => buildPixPayload({ ...base, amount: 1001 })).toThrow(/valor/i)
  })

  it("recusa chave vazia", () => {
    expect(() => buildPixPayload({ ...base, key: "  ", amount: 1 })).toThrow(/chave/i)
  })
})
