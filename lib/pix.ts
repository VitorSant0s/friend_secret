/**
 * Gera o BR Code do PIX (o "copia e cola" e o QR code).
 * Referência: Manual de Padrões para Iniciação do PIX, do Banco Central.
 */

export type PixInput = {
  key: string
  merchantName: string
  merchantCity: string
  amount: number
}

function tlv(id: string, value: string): string {
  if (value.length > 99) {
    throw new Error("Campo do PIX grande demais.")
  }
  return `${id}${value.length.toString().padStart(2, "0")}${value}`
}

function clean(text: string, maxLength: number): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
    .trim()
}

export function crc16(payload: string): string {
  let result = 0xffff

  for (let i = 0; i < payload.length; i++) {
    result ^= payload.charCodeAt(i) << 8
    for (let bit = 0; bit < 8; bit++) {
      result = result & 0x8000 ? (result << 1) ^ 0x1021 : result << 1
      result &= 0xffff
    }
  }

  return result.toString(16).toUpperCase().padStart(4, "0")
}

export function buildPixPayload({
  key,
  merchantName,
  merchantCity,
  amount,
}: PixInput): string {
  const cleanKey = key.trim()

  if (!cleanKey) {
    throw new Error("A chave PIX não foi configurada.")
  }
  if (cleanKey.length > 77) {
    throw new Error("A chave PIX é grande demais.")
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000) {
    throw new Error("Escolha um valor entre R$ 1 e R$ 1.000.")
  }

  const name = clean(merchantName, 25)
  const city = clean(merchantCity, 15)

  if (!name) throw new Error("O nome do recebedor não foi configurado.")
  if (!city) throw new Error("A cidade do recebedor não foi configurada.")

  const merchantAccount =
    tlv("00", "br.gov.bcb.pix") + tlv("01", cleanKey)

  const payload =
    "000201" +
    tlv("26", merchantAccount) +
    "52040000" +
    "5303986" +
    tlv("54", amount.toFixed(2)) +
    "5802BR" +
    tlv("59", name) +
    tlv("60", city) +
    tlv("62", tlv("05", "***")) +
    "6304"

  return payload + crc16(payload)
}
