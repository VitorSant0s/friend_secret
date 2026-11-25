import { createHash, randomBytes } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"

const DAY_MS = 24 * 60 * 60 * 1000

/** Hash determinístico para não guardar sessão nem IP em texto puro. */
export function hashValue(salt: string, value: string): string {
  return createHash("sha256")
    .update(salt)
    .update(value)
    .digest("hex")
    .slice(0, 32)
}

export type AuditInput = {
  event: string
  /** Identificador da sessão; é gravado apenas como hash. */
  sessionId?: string | null
  /** Conta já mascarada pelo chamador. */
  account?: string | null
  /** IP bruto; é gravado apenas como hash. */
  ip?: string | null
  detail?: Record<string, unknown> | null
}

type AuditStoreOptions = {
  path: string
  retentionDays: number
  salt: string
}

export class AuditStore {
  private db: DatabaseSync | null = null
  private lastPurge = 0

  constructor(private readonly options: AuditStoreOptions) {
    try {
      mkdirSync(path.dirname(options.path), { recursive: true })
      const db = new DatabaseSync(options.path)
      db.exec("PRAGMA journal_mode = WAL")
      db.exec(`
        CREATE TABLE IF NOT EXISTS audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          created_at TEXT NOT NULL,
          event TEXT NOT NULL,
          session_ref TEXT,
          account TEXT,
          ip_hash TEXT,
          detail TEXT
        )
      `)
      db.exec(
        "CREATE INDEX IF NOT EXISTS audit_log_created_at ON audit_log(created_at)",
      )
      this.db = db
    } catch (error) {
      console.warn(
        "[auditoria] não foi possível abrir o banco:",
        error instanceof Error ? error.message : String(error),
      )
      this.db = null
    }
  }

  record(input: AuditInput, now: Date = new Date()): void {
    if (!this.db) return

    try {
      if (now.getTime() - this.lastPurge > DAY_MS) {
        this.purge(now)
        this.lastPurge = now.getTime()
      }

      const detail = input.detail
        ? JSON.stringify(input.detail).slice(0, 2000)
        : null

      this.db
        .prepare(
          `INSERT INTO audit_log
            (created_at, event, session_ref, account, ip_hash, detail)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          now.toISOString(),
          input.event,
          input.sessionId
            ? hashValue(this.options.salt, input.sessionId)
            : null,
          input.account ? input.account.slice(0, 40) : null,
          input.ip ? hashValue(this.options.salt, input.ip) : null,
          detail,
        )
    } catch {
      // auditoria nunca pode derrubar a operação principal
    }
  }

  purge(now: Date = new Date()): void {
    if (!this.db) return

    try {
      const cutoff = new Date(
        now.getTime() - this.options.retentionDays * DAY_MS,
      ).toISOString()
      this.db.prepare("DELETE FROM audit_log WHERE created_at < ?").run(cutoff)
    } catch {
      // se a limpeza falhar, tenta de novo no próximo ciclo
    }
  }

  close(): void {
    try {
      this.db?.close()
    } catch {
      // banco já fechado
    }
    this.db = null
  }
}

const DATA_DIR =
  process.env.AUDIT_DIR?.trim() || path.join(process.cwd(), ".data")
const DB_PATH =
  process.env.AUDIT_DB_PATH?.trim() || path.join(DATA_DIR, "audit.sqlite")
const RETENTION_DAYS = Math.min(
  3650,
  Math.max(1, Number(process.env.AUDIT_RETENTION_DAYS ?? 180) || 180),
)

function resolveSalt(): string {
  const fromEnv = process.env.AUDIT_SALT?.trim()
  if (fromEnv) return fromEnv

  const saltFile = path.join(DATA_DIR, "audit.salt")
  try {
    const saved = readFileSync(saltFile, "utf8").trim()
    if (saved) return saved
  } catch {
    // ainda não existe
  }

  const generated = randomBytes(32).toString("hex")
  try {
    mkdirSync(DATA_DIR, { recursive: true })
    writeFileSync(saltFile, generated, { mode: 0o600 })
  } catch {
    // sem disco para o sal, usa um sal por processo
  }
  return generated
}

const globalForAudit = globalThis as unknown as {
  __amigoSecretoAudit?: AuditStore
}

function store(): AuditStore {
  if (!globalForAudit.__amigoSecretoAudit) {
    globalForAudit.__amigoSecretoAudit = new AuditStore({
      path: DB_PATH,
      retentionDays: RETENTION_DAYS,
      salt: resolveSalt(),
    })
  }
  return globalForAudit.__amigoSecretoAudit
}

/** Registra um evento de auditoria. Nunca lança erro. */
export function audit(input: AuditInput): void {
  try {
    store().record(input)
  } catch {
    // silencioso por design
  }
}
