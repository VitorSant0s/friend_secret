import { apiUrl } from "@/lib/api-base"
import { isValidSessionId, sessionExpiresAt } from "@/lib/session"

/**
 * A sessão do navegador guarda apenas um identificador aleatório.
 * As credenciais do WhatsApp ficam no servidor; o que existe aqui é o bilhete
 * cifrado que aponta para elas.
 */

const STORAGE_KEY = "amigo-secreto.sessao.v1"
const DB_NAME = "amigo-secreto"
const DB_STORE = "chaves"
const DB_KEY = "sessao"

export type BrowserSession = {
  id: string
  expiresAt: number
}

type Sealed = { v: 1; iv: string; data: string }
type Plain = { v: 0; id: string; expiresAt: number }
type Stored = Sealed | Plain

let cached: BrowserSession | null = null
let pending: Promise<BrowserSession> | null = null

function hasWindow(): boolean {
  return typeof window !== "undefined"
}

function randomId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1)
      request.onupgradeneeded = () => {
        request.result.createObjectStore(DB_STORE)
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () =>
        reject(request.error ?? new Error("Banco local indisponível."))
    })
  }
  return dbPromise
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DB_STORE, "readonly")
    const request = transaction.objectStore(DB_STORE).get(key)
    request.onsuccess = () => resolve((request.result as T) ?? null)
    request.onerror = () => reject(request.error)
  })
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(DB_STORE, "readwrite")
    transaction.objectStore(DB_STORE).put(value, key)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(DB_STORE, "readwrite")
    transaction.objectStore(DB_STORE).delete(key)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

function subtleAvailable(): boolean {
  return typeof crypto !== "undefined" && Boolean(crypto.subtle)
}

async function encryptionKey(create: boolean): Promise<CryptoKey | null> {
  if (!subtleAvailable()) return null

  try {
    const existing = await idbGet<CryptoKey>(DB_KEY)
    if (existing) return existing
    if (!create) return null

    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    )
    await idbSet(DB_KEY, key)
    return key
  } catch {
    return null
  }
}

async function seal(session: BrowserSession): Promise<Stored> {
  const key = await encryptionKey(true)
  if (!key) return { v: 0, ...session }

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plain = new TextEncoder().encode(JSON.stringify(session))
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain)

  return {
    v: 1,
    iv: bytesToBase64(iv),
    data: bytesToBase64(new Uint8Array(encrypted)),
  }
}

function isValidPayload(value: unknown): value is BrowserSession {
  if (!value || typeof value !== "object") return false
  const candidate = value as { id?: unknown; expiresAt?: unknown }
  return (
    isValidSessionId(candidate.id) &&
    typeof candidate.expiresAt === "number" &&
    Number.isFinite(candidate.expiresAt)
  )
}

async function unseal(stored: Stored): Promise<BrowserSession | null> {
  if (stored.v === 0) {
    return isValidPayload(stored) ? stored : null
  }

  const key = await encryptionKey(false)
  if (!key) return null

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(stored.iv) },
      key,
      base64ToBytes(stored.data),
    )
    const parsed: unknown = JSON.parse(new TextDecoder().decode(decrypted))
    return isValidPayload(parsed) ? parsed : null
  } catch {
    return null
  }
}

function forgetStored(): void {
  if (!hasWindow()) return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // localStorage pode estar bloqueado; seguir sem sessão antiga
  }
}

async function loadStored(): Promise<BrowserSession | null> {
  if (!hasWindow()) return null

  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
  if (!raw) return null

  try {
    const stored = JSON.parse(raw) as Stored
    const session = await unseal(stored)
    if (!session) {
      forgetStored()
      return null
    }
    if (Date.now() >= session.expiresAt) {
      forgetStored()
      return null
    }
    return session
  } catch {
    forgetStored()
    return null
  }
}

async function saveStored(session: BrowserSession): Promise<void> {
  if (!hasWindow()) return
  try {
    const stored = await seal(session)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // sem localStorage o app continua funcionando, só não lembra a sessão
  }
}

export async function ensureSession(): Promise<BrowserSession> {
  if (!hasWindow()) {
    throw new Error("A sessão do WhatsApp só funciona no navegador.")
  }

  if (cached && Date.now() < cached.expiresAt) return cached
  if (pending) return pending

  pending = (async () => {
    const loaded = await loadStored()
    if (loaded) {
      cached = loaded
      return loaded
    }

    const fresh: BrowserSession = {
      id: randomId(),
      expiresAt: sessionExpiresAt(Date.now()),
    }
    await saveStored(fresh)
    cached = fresh
    return fresh
  })()

  try {
    return await pending
  } finally {
    pending = null
  }
}

/** Adota a validade que o servidor informou (a sessão passa a contar do pareamento). */
export async function refreshSessionExpiry(expiresAt: number): Promise<void> {
  if (!Number.isFinite(expiresAt) || !cached) return
  if (expiresAt <= cached.expiresAt) return

  cached = { ...cached, expiresAt }
  await saveStored(cached)
}

export async function expireSession(): Promise<void> {
  cached = null
  pending = null
  forgetStored()
  if (subtleAvailable()) {
    try {
      await idbDelete(DB_KEY)
    } catch {
      // a chave pode não existir
    }
  }
}

function withSessionHeader(headers: HeadersInit | undefined, id: string): Headers {
  const result = new Headers(headers)
  result.set("x-session-id", id)
  return result
}

export async function apiJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const session = await ensureSession()
  const response = await fetch(apiUrl(url), {
    ...init,
    cache: "no-store",
    headers: withSessionHeader(init.headers, session.id),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(
      (data as { error?: string } | null)?.error ??
        "Não foi possível concluir a ação. Tente de novo.",
    )
  }
  return data as T
}

export async function apiFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const session = await ensureSession()
  return fetch(apiUrl(url), {
    ...init,
    cache: "no-store",
    headers: withSessionHeader(init.headers, session.id),
  })
}
