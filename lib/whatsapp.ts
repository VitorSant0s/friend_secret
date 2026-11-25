import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type GroupMetadata,
  type WASocket,
} from "@whiskeysockets/baileys"
import pino from "pino"
import QRCode from "qrcode"
import { maskAccount } from "@/lib/account"
import { delay } from "@/lib/delay"
import { hideMessageForSender } from "@/lib/hide-message"
import { isOwnChat } from "@/lib/self-chat"
import {
  SESSION_TTL_MS,
  SessionExpiredError,
  hasExpired,
  sessionExpiresAt,
} from "@/lib/session"

export type ConnectionStatus = "idle" | "connecting" | "qr" | "connected" | "error"

export type ConnectionSnapshot = {
  status: ConnectionStatus
  qr: string | null
  /** Número mascarado, só para reconhecer a conta conectada. */
  account: string | null
  error: string | null
  expiresAt: number | null
}

export type GroupSummary = {
  id: string
  subject: string
  count: number
}

export type GroupParticipant = {
  id: string
  name: string
}

type Session = {
  id: string
  createdAt: number
  expiresAt: number
  status: ConnectionStatus
  qr: string | null
  me: string | null
  error: string | null
  sock: WASocket | null
  starting: Promise<void> | null
  retry: ReturnType<typeof setTimeout> | null
  closing: boolean
  sending: boolean
  groups: Map<string, GroupMetadata> | null
  groupsAt: number
  contacts: Map<string, string>
}

type SessionMeta = {
  createdAt: number
  expiresAt: number
}

type Store = {
  map: Map<string, Session>
  pending: Map<string, Promise<Session>>
  sweeper: ReturnType<typeof setInterval> | null
}

const ROOT = path.join(process.cwd(), ".whatsapp-sessions")
const MAX_SESSIONS = Math.max(1, Number(process.env.MAX_SESSIONS ?? 25) || 25)

export class TooManySessionsError extends Error {
  constructor() {
    super("Muitas sessões abertas agora. Tente de novo em alguns minutos.")
    this.name = "TooManySessionsError"
  }
}

const globalForWhatsApp = globalThis as unknown as {
  __amigoSecretoSessions?: Store
}

function store(): Store {
  if (!globalForWhatsApp.__amigoSecretoSessions) {
    globalForWhatsApp.__amigoSecretoSessions = {
      map: new Map(),
      pending: new Map(),
      sweeper: null,
    }
  }
  return globalForWhatsApp.__amigoSecretoSessions
}

function authFolder(id: string): string {
  return path.join(ROOT, id)
}

function metaFile(id: string): string {
  return path.join(ROOT, `${id}.meta.json`)
}

async function readMeta(id: string): Promise<SessionMeta | null> {
  try {
    const raw = await readFile(metaFile(id), "utf8")
    const parsed = JSON.parse(raw) as { createdAt?: unknown; expiresAt?: unknown }
    if (typeof parsed.createdAt !== "number") return null
    return {
      createdAt: parsed.createdAt,
      expiresAt:
        typeof parsed.expiresAt === "number"
          ? parsed.expiresAt
          : sessionExpiresAt(parsed.createdAt),
    }
  } catch {
    return null
  }
}

async function writeMeta(id: string, meta: SessionMeta): Promise<void> {
  await mkdir(ROOT, { recursive: true })
  await writeFile(metaFile(id), JSON.stringify(meta), "utf8")
}

function startSweeper(): void {
  const state = store()
  if (state.sweeper) return

  const sweep = () => {
    const now = Date.now()
    for (const session of state.map.values()) {
      if (now >= session.expiresAt) {
        void destroySession(session.id)
      }
    }
    void sweepDisk(now)
  }

  sweep()
  state.sweeper = setInterval(sweep, 60_000)

  state.sweeper.unref?.()
}

async function sweepDisk(now: number): Promise<void> {
  let entries: string[]
  try {
    entries = await readdir(ROOT)
  } catch {
    return
  }

  for (const entry of entries) {
    if (!entry.endsWith(".meta.json")) continue
    const id = entry.slice(0, -".meta.json".length)
    const meta = await readMeta(id)
    if (meta && hasExpired(meta.expiresAt, now)) {
      await destroySession(id)
    }
  }
}

function baseSnapshot(session: Session): ConnectionSnapshot {
  return {
    status: session.status,
    qr: session.qr,
    account: maskAccount(session.me),
    error: session.error ? session.error.slice(0, 160) : null,
    expiresAt: session.expiresAt,
  }
}

export async function ensureSession(id: string): Promise<Session> {
  const state = store()
  const existing = state.map.get(id)

  if (existing) {
    if (hasExpired(existing.expiresAt)) {
      await destroySession(id)
      throw new SessionExpiredError()
    }
    return existing
  }

  const inflight = state.pending.get(id)
  if (inflight) return inflight

  // A checagem e a reserva acontecem sem await, então duas requisições
  // simultâneas não conseguem passar do limite de sessões.
  if (state.map.size + state.pending.size >= MAX_SESSIONS) {
    for (const item of [...state.map.values()]) {
      if (hasExpired(item.expiresAt)) {
        state.map.delete(item.id)
        void destroySession(item.id)
      }
    }
    if (state.map.size + state.pending.size >= MAX_SESSIONS) {
      throw new TooManySessionsError()
    }
  }

  const task = (async () => {
    const meta = await readMeta(id)
    const now = Date.now()
    const createdAt = meta?.createdAt ?? now
    const expiresAt = meta?.expiresAt ?? sessionExpiresAt(createdAt)

    if (hasExpired(expiresAt)) {
      await destroySession(id)
      throw new SessionExpiredError()
    }

    const session: Session = {
      id,
      createdAt,
      expiresAt,
      status: "idle",
      qr: null,
      me: null,
      error: null,
      sock: null,
      starting: null,
      retry: null,
      closing: false,
      sending: false,
      groups: null,
      groupsAt: 0,
      contacts: new Map(),
    }

    await writeMeta(id, { createdAt, expiresAt })
    state.map.set(id, session)
    startSweeper()
    return session
  })()

  state.pending.set(id, task)

  try {
    return await task
  } finally {
    state.pending.delete(id)
  }
}

export function sessionExists(id: string): boolean {
  return store().map.has(id)
}

export async function destroySession(id: string): Promise<void> {
  const state = store()
  const session = state.map.get(id)
  state.map.delete(id)
  state.pending.delete(id)

  if (session) {
    if (session.retry) clearTimeout(session.retry)
    session.closing = true
    session.qr = null
    session.status = "idle"
    try {
      await session.sock?.logout()
    } catch {
      // a conexão pode já estar morta; apagar os arquivos resolve
    }
    try {
      session.sock?.end(undefined)
    } catch {
      // idem
    }
    session.sock = null
  }

  await rm(authFolder(id), { recursive: true, force: true }).catch(() => {})
  await rm(metaFile(id), { force: true }).catch(() => {})
}

export async function sessionStatus(
  id: string,
): Promise<ConnectionSnapshot & { expired: boolean }> {
  const state = store()
  const session = state.map.get(id)

  if (session) {
    if (hasExpired(session.expiresAt)) {
      await destroySession(id)
      return {
        status: "idle",
        qr: null,
        account: null,
        error: null,
        expiresAt: null,
        expired: true,
      }
    }
    return { ...baseSnapshot(session), expired: false }
  }

  const meta = await readMeta(id)
  if (meta !== null) {
    if (hasExpired(meta.expiresAt)) {
      await destroySession(id)
      return {
        status: "idle",
        qr: null,
        account: null,
        error: null,
        expiresAt: null,
        expired: true,
      }
    }
    return {
      status: "idle",
      qr: null,
      account: null,
      error: null,
      expiresAt: meta.expiresAt,
      expired: false,
    }
  }

  return {
    status: "idle",
    qr: null,
    account: null,
    error: null,
    expiresAt: null,
    expired: false,
  }
}

export async function connect(id: string): Promise<void> {
  const session = await ensureSession(id)

  if (session.status === "connected" || session.status === "qr") return
  if (session.starting) return session.starting

  if (session.retry) {
    clearTimeout(session.retry)
    session.retry = null
  }

  session.starting = (async () => {
    session.status = "connecting"
    session.error = null

    const { state: authState, saveCreds } = await useMultiFileAuthState(
      authFolder(id),
    )

    let version: [number, number, number] | undefined
    try {
      version = (await fetchLatestBaileysVersion()).version
    } catch {
      version = undefined
    }

    const sock = makeWASocket({
      auth: authState,
      version,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      browser: Browsers.ubuntu("Desktop"),
      syncFullHistory: false,
      markOnlineOnConnect: false,
      generateHighQualityLinkPreview: false,
    })

    session.sock = sock

    sock.ev.on("creds.update", saveCreds)
    sock.ev.on("contacts.upsert", (contacts) => rememberContacts(session, contacts))
    sock.ev.on("contacts.update", (contacts) => rememberContacts(session, contacts))
    sock.ev.on("messaging-history.set", (update) => {
      rememberContacts(session, update.contacts ?? [])
    })

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        session.status = "qr"
        session.qr = await QRCode.toDataURL(qr, { margin: 1, width: 360 })
        session.starting = null
      }

      if (connection === "open") {
        session.status = "connected"
        session.qr = null
        session.error = null
        session.starting = null
        session.me = sock.user?.id ?? null
        session.groups = null
        // A contagem de 15 minutos começa quando o QR é lido.
        session.expiresAt = Date.now() + SESSION_TTL_MS
        void writeMeta(id, {
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
        })
      }

      if (connection === "close") {
        const statusCode = (
          lastDisconnect?.error as { output?: { statusCode?: number } } | undefined
        )?.output?.statusCode
        const loggedOut = statusCode === DisconnectReason.loggedOut

        session.sock = null
        session.groups = null
        session.starting = null

        if (loggedOut) {
          await destroySession(id)
          return
        }

        if (session.closing) {
          session.closing = false
          session.status = "idle"
          return
        }

        session.status = "connecting"
        session.retry = setTimeout(() => {
          session.retry = null
          connect(id).catch((error) => {
            session.status = "error"
            session.error = error instanceof Error ? error.message : String(error)
          })
        }, 1500)
      }
    })
  })()

  try {
    await session.starting
  } catch (error) {
    session.status = "error"
    session.error = error instanceof Error ? error.message : String(error)
    session.starting = null
  }
}

function connectedSocket(session: Session): WASocket {
  if (session.status !== "connected" || !session.sock) {
    throw new Error("O WhatsApp não está conectado. Escaneie o código primeiro.")
  }
  return session.sock
}

async function allGroups(session: Session) {
  const fresh = session.groups && Date.now() - session.groupsAt < 20_000
  if (fresh) return session.groups!

  const sock = connectedSocket(session)
  const groups = await sock.groupFetchAllParticipating()
  session.groups = new Map(Object.entries(groups))
  session.groupsAt = Date.now()
  return session.groups
}

export async function listGroups(id: string): Promise<GroupSummary[]> {
  const session = await ensureSession(id)
  const groups = await allGroups(session)

  return [...groups.values()]
    .map((group) => ({
      id: group.id,
      subject: group.subject || "Sem nome",
      count: group.participants.length,
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject, "pt-BR"))
}

type ContactLike = {
  id?: string
  lid?: string
  phoneNumber?: string
  name?: string
  notify?: string
}

function contactKeys(contact: ContactLike): string[] {
  const keys = new Set<string>()
  for (const value of [contact.id, contact.lid, contact.phoneNumber]) {
    if (!value) continue
    keys.add(value)
    keys.add(value.split(":")[0])
  }
  return [...keys]
}

/** O WhatsApp nem sempre manda o nome do participante no grupo; os contatos ajudam. */
function rememberContacts(session: Session, contacts: ContactLike[]): void {
  for (const contact of contacts) {
    const name = contact.name?.trim() || contact.notify?.trim()
    if (!name) continue
    for (const key of contactKeys(contact)) {
      session.contacts.set(key, name)
    }
  }
}

function displayName(
  session: Session,
  participant: ContactLike & { id: string },
): string {
  const own = participant.name?.trim() || participant.notify?.trim()
  if (own) return own

  for (const key of contactKeys(participant)) {
    const known = session.contacts.get(key)
    if (known) return known
  }

  return participant.phoneNumber?.split("@")[0] ?? participant.id.split("@")[0]
}

export type GroupDetails = {
  id: string
  subject: string
  participants: (GroupParticipant & { jid: string })[]
}

export async function groupDetails(
  id: string,
  groupId: string,
): Promise<GroupDetails> {
  const session = await ensureSession(id)
  const groups = await allGroups(session)
  const group = groups.get(groupId)
  if (!group) throw new Error("Grupo não encontrado. Atualize a lista de grupos.")

  const seen = new Set<string>()
  const participants: (GroupParticipant & { jid: string })[] = []

  for (const participant of group.participants) {
    const jid = participant.phoneNumber || participant.id
    if (!jid || seen.has(jid)) continue
    seen.add(jid)
    participants.push({
      id: participant.id,
      name: displayName(session, participant),
      jid,
    })
  }

  participants.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))

  return { id: group.id, subject: group.subject, participants }
}

async function sendingJid(
  sock: WASocket,
  participant: { id: string; phoneNumber?: string },
): Promise<string> {
  if (participant.phoneNumber) return participant.phoneNumber
  if (participant.id.endsWith("@s.whatsapp.net")) return participant.id

  if (participant.id.endsWith("@lid")) {
    try {
      const pn = await sock.signalRepository.lidMapping.getPNForLID(participant.id)
      if (pn) return pn
    } catch {
      // cai no LID mesmo
    }
  }

  return participant.id
}

export type SendTarget = {
  jid: string
  personName: string
  text: string
}

export async function sendMessages(
  id: string,
  targets: SendTarget[],
  onProgress: (progress: {
    index: number
    total: number
    name: string
    ok: boolean
    hidden?: boolean
    self?: boolean
    error?: string
  }) => void,
): Promise<{
  sent: number
  failed: number
  hidden: number
  hideFailed: number
  self: number
}> {
  const session = await ensureSession(id)
  if (session.sending) throw new Error("Já existe um envio em andamento.")
  session.sending = true

  let sent = 0
  let failed = 0
  let hidden = 0
  let hideFailed = 0
  let self = 0

  try {
    const sock = connectedSocket(session)

    for (let index = 0; index < targets.length; index++) {
      const target = targets[index]
      try {
        const message = await sock.sendMessage(target.jid, {
          text: target.text,
        })
        sent++

        // A mensagem do próprio organizador fica na conversa dele.
        const ownChat = isOwnChat(sock.user, target.jid)
        let wasHidden: boolean | undefined

        if (ownChat) {
          self++
        } else {
          const timestamp = Number(
            message?.messageTimestamp ?? Math.floor(Date.now() / 1000),
          )
          wasHidden = await hideMessageForSender(sock, {
            chatJid: target.jid,
            key: message?.key,
            timestamp,
          })
          if (wasHidden) hidden++
          else hideFailed++
        }

        onProgress({
          index,
          total: targets.length,
          name: target.personName,
          ok: true,
          hidden: wasHidden,
          self: ownChat,
        })
      } catch (error) {
        failed++
        onProgress({
          index,
          total: targets.length,
          name: target.personName,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        })
      }

      if (index < targets.length - 1) {
        await delay(2500 + Math.floor(Math.random() * 2500))
      }
    }
  } finally {
    session.sending = false
  }

  return { sent, failed, hidden, hideFailed, self }
}

export async function resolveTargets(
  id: string,
  groupId: string,
  personIds: string[],
): Promise<Map<string, string>> {
  const session = await ensureSession(id)
  const sock = connectedSocket(session)
  const groups = await allGroups(session)
  const group = groups.get(groupId)
  if (!group) throw new Error("Grupo não encontrado. Atualize a lista de grupos.")

  const byId = new Map(
    group.participants.map((participant) => [participant.id, participant]),
  )
  const result = new Map<string, string>()

  for (const personId of personIds) {
    const participant = byId.get(personId)
    if (!participant) {
      throw new Error(
        "Alguém da lista saiu do grupo. Atualize a lista e tente de novo.",
      )
    }
    result.set(personId, await sendingJid(sock, participant))
  }

  return result
}
