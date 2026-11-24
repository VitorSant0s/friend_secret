export type MessageKeyLike = {
  id?: string | null
  remoteJid?: string | null
  fromMe?: boolean | null
  participant?: string | null
}

export type DeleteForMeMod = {
  deleteForMe: {
    deleteMedia: boolean
    key: MessageKeyLike & { id: string }
    timestamp: number
  }
}

export type ChatModifier = {
  chatModify: (mod: DeleteForMeMod, jid: string) => Promise<void>
}

export type HideTarget = {
  chatJid: string
  key: MessageKeyLike | null | undefined
  timestamp: number
}

/**
 * "Apagar para mim": remove a mensagem da conversa de quem enviou.
 * O destinatário continua com a mensagem, sem aviso de exclusão.
 */
export async function hideMessageForSender(
  client: ChatModifier,
  target: HideTarget,
): Promise<boolean> {
  const id = target.key?.id
  if (!id) return false

  try {
    await client.chatModify(
      {
        deleteForMe: {
          deleteMedia: false,
          key: { ...target.key, id },
          timestamp: target.timestamp,
        },
      },
      target.chatJid,
    )
    return true
  } catch {
    return false
  }
}
