export const SESSION_TTL_MS = 15 * 60 * 1000

const SESSION_ID_PATTERN = /^[a-zA-Z0-9-]{16,64}$/

export function isValidSessionId(value: unknown): value is string {
  return typeof value === "string" && SESSION_ID_PATTERN.test(value)
}

export function sessionExpiresAt(createdAt: number): number {
  return createdAt + SESSION_TTL_MS
}

export function sessionIsExpired(createdAt: number, now = Date.now()): boolean {
  return now >= sessionExpiresAt(createdAt)
}

export function hasExpired(expiresAt: number, now = Date.now()): boolean {
  return now >= expiresAt
}

export class SessionExpiredError extends Error {
  constructor() {
    super("A conexão de 15 minutos terminou. Leia o código do WhatsApp de novo.")
    this.name = "SessionExpiredError"
  }
}
