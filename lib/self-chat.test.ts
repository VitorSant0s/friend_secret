import { describe, expect, it } from "vitest"
import { isOwnChat, normalizeJid } from "./self-chat"

const user = {
  id: "5511999999999:12@s.whatsapp.net",
  lid: "123456789012345@lid",
  phoneNumber: "5511999999999@s.whatsapp.net",
}

describe("normalizeJid", () => {
  it("remove o sufixo de aparelho", () => {
    expect(normalizeJid("5511999999999:12@s.whatsapp.net")).toBe(
      "5511999999999@s.whatsapp.net",
    )
    expect(normalizeJid("5511999999999@s.whatsapp.net")).toBe(
      "5511999999999@s.whatsapp.net",
    )
  })
})

describe("isOwnChat", () => {
  it("reconhece o número do próprio usuário, com ou sem aparelho", () => {
    expect(isOwnChat(user, "5511999999999@s.whatsapp.net")).toBe(true)
    expect(isOwnChat(user, "5511999999999:7@s.whatsapp.net")).toBe(true)
  })

  it("reconhece o próprio LID", () => {
    expect(isOwnChat(user, "123456789012345@lid")).toBe(true)
  })

  it("reconhece pelo phoneNumber quando o id é LID", () => {
    expect(
      isOwnChat(
        { id: "999@lid", phoneNumber: "5511999999999@s.whatsapp.net" },
        "5511999999999@s.whatsapp.net",
      ),
    ).toBe(true)
  })

  it("não confunde com outra pessoa", () => {
    expect(isOwnChat(user, "5511888888888@s.whatsapp.net")).toBe(false)
    expect(isOwnChat(user, "123456789012346@lid")).toBe(false)
  })

  it("devolve false sem usuário logado", () => {
    expect(isOwnChat(null, "5511999999999@s.whatsapp.net")).toBe(false)
    expect(isOwnChat(undefined, "5511999999999@s.whatsapp.net")).toBe(false)
  })
})
