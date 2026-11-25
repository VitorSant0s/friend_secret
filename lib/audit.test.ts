import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { DatabaseSync } from "node:sqlite"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { AuditStore, hashValue } from "./audit"

let dir = ""
let dbPath = ""
let store: AuditStore

function open() {
  return new DatabaseSync(dbPath)
}

function rows() {
  const db = open()
  const result = db.prepare("SELECT * FROM audit_log ORDER BY id").all() as {
    event: string
    session_ref: string | null
    account: string | null
    ip_hash: string | null
    detail: string | null
    created_at: string
  }[]
  db.close()
  return result
}

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "amigo-audit-"))
  dbPath = path.join(dir, "audit.sqlite")
  store = new AuditStore({ path: dbPath, retentionDays: 30, salt: "sal-de-teste" })
})

afterEach(() => {
  store.close()
  rmSync(dir, { recursive: true, force: true })
})

describe("hashValue", () => {
  it("é determinístico e não devolve o valor original", () => {
    const first = hashValue("sal", "123.456.789-00")
    expect(first).toBe(hashValue("sal", "123.456.789-00"))
    expect(first).not.toContain("123")
    expect(hashValue("outro-sal", "123")).not.toBe(first)
  })
})

describe("AuditStore", () => {
  it("grava evento com sessão e IP em hash", () => {
    store.record(
      {
        event: "session.created",
        sessionId: "sessao-secreta-123",
        ip: "203.0.113.9",
        account: "+55 11 *****-1234",
      },
      new Date("2026-01-01T12:00:00Z"),
    )

    const list = rows()
    expect(list).toHaveLength(1)
    expect(list[0].event).toBe("session.created")
    expect(list[0].session_ref).toBe(hashValue("sal-de-teste", "sessao-secreta-123"))
    expect(list[0].session_ref).not.toContain("sessao-secreta")
    expect(list[0].ip_hash).toBe(hashValue("sal-de-teste", "203.0.113.9"))
    expect(list[0].ip_hash).not.toContain("203.0.113")
    expect(list[0].account).toBe("+55 11 *****-1234")
    expect(list[0].created_at).toBe("2026-01-01T12:00:00.000Z")
  })

  it("grava detalhes como JSON sem quebrar", () => {
    store.record({ event: "send.completed", detail: { sent: 3, failed: 0 } })

    expect(JSON.parse(rows()[0].detail ?? "{}")).toEqual({ sent: 3, failed: 0 })
  })

  it("apaga registros mais antigos que a retenção", () => {
    const old = new Date("2025-01-01T00:00:00Z")
    store.record({ event: "antigo" }, old)
    store.record({ event: "novo" }, new Date("2026-01-01T00:00:00Z"))

    store.purge(new Date("2026-01-02T00:00:00Z"))

    expect(rows().map((row) => row.event)).toEqual(["novo"])
  })

  it("não derruba o app quando não consegue abrir o banco", () => {
    const broken = new AuditStore({
      path: "/proc/nao-existe/audit.sqlite",
      retentionDays: 30,
      salt: "sal",
    })

    expect(() =>
      broken.record({ event: "teste", ip: "127.0.0.1" }),
    ).not.toThrow()
    broken.close()
  })
})
