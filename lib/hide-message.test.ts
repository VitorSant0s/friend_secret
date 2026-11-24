import { describe, expect, it, vi } from "vitest"
import { hideMessageForSender, type DeleteForMeMod } from "./hide-message"

type Call = { mod: DeleteForMeMod; jid: string }

function fakeClient(impl?: () => Promise<void>) {
  const calls: Call[] = []
  return {
    calls,
    chatModify: vi.fn(async (mod: DeleteForMeMod, jid: string) => {
      calls.push({ mod, jid })
      if (impl) await impl()
    }),
  }
}

describe("hideMessageForSender", () => {
  const key = { id: "ABC123", remoteJid: "5511999999999@s.whatsapp.net", fromMe: true }

  it("apaga a mensagem só para quem enviou, na conversa certa", async () => {
    const client = fakeClient()

    const hidden = await hideMessageForSender(client, {
      chatJid: "5511999999999@s.whatsapp.net",
      key,
      timestamp: 1_700_000_000,
    })

    expect(hidden).toBe(true)
    expect(client.calls).toHaveLength(1)
    expect(client.calls[0].jid).toBe("5511999999999@s.whatsapp.net")
    expect(client.calls[0].mod).toEqual({
      deleteForMe: {
        deleteMedia: false,
        key,
        timestamp: 1_700_000_000,
      },
    })
  })

  it("não chama nada quando a mensagem não tem identificação", async () => {
    const client = fakeClient()

    const hidden = await hideMessageForSender(client, {
      chatJid: "5511999999999@s.whatsapp.net",
      key: null,
      timestamp: 1,
    })

    expect(hidden).toBe(false)
    expect(client.chatModify).not.toHaveBeenCalled()
  })

  it("devolve false quando o WhatsApp recusa a ação", async () => {
    const client = fakeClient(async () => {
      throw new Error("falhou")
    })

    await expect(
      hideMessageForSender(client, {
        chatJid: "5511999999999@s.whatsapp.net",
        key,
        timestamp: 1,
      }),
    ).resolves.toBe(false)
  })

  it("não apaga mídia", async () => {
    const client = fakeClient()

    await hideMessageForSender(client, {
      chatJid: "5511999999999@s.whatsapp.net",
      key,
      timestamp: 1,
    })

    expect(client.calls[0].mod.deleteForMe.deleteMedia).toBe(false)
  })
})
