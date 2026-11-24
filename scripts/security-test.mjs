/**
 * Teste de isolamento e carga das sessões.
 *
 * Cria várias sessões ao mesmo tempo (cada uma com seu QR code), confere que
 * são independentes, que o limite de sessões responde 429 e que desconectar uma
 * não afeta as outras.
 *
 * Uso:
 *   BASE_URL=http://localhost:3000 USERS=6 CAP=6 node scripts/security-test.mjs
 *
 * Observação: o pareamento de verdade (ler o QR com o celular) exige um telefone
 * por sessão. Este teste valida o servidor: QR distinto, credenciais separadas,
 * limites e isolamento.
 */

import { randomUUID } from "node:crypto"

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "")
const USERS = Math.max(1, Number(process.env.USERS ?? 5))
const CAP = process.env.CAP ? Number(process.env.CAP) : null
const KEEP = process.env.KEEP === "1"
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS ?? 120000)

let failures = 0

function check(ok, message, detail) {
  if (ok) {
    console.log(`  ok   ${message}`)
  } else {
    failures++
    console.log(`  FALHA ${message}${detail ? ` — ${detail}` : ""}`)
  }
}

async function api(path, { id, method = "GET" } = {}) {
  const headers = {}
  if (id) headers["x-session-id"] = id

  const response = await fetch(`${BASE}${path}`, { method, headers })
  const body = await response.json().catch(() => null)
  return { status: response.status, body }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForQr(ids) {
  const deadline = Date.now() + TIMEOUT_MS
  const ready = new Map()

  while (Date.now() < deadline && ready.size < ids.length) {
    await Promise.all(
      ids
        .filter((id) => !ready.has(id))
        .map(async (id) => {
          const { body } = await api("/api/whatsapp/status", { id })
          if (body?.status === "qr" && body.qr) ready.set(id, body.qr)
          if (body?.status === "error") throw new Error(`Sessão ${id}: ${body.error}`)
        }),
    )
    if (ready.size < ids.length) await sleep(1000)
  }

  return ready
}

async function main() {
  console.log(`\nServidor: ${BASE}`)
  console.log(`Sessões simultâneas: ${USERS}${CAP ? ` (limite esperado: ${CAP})` : ""}\n`)

  console.log("1) Requisição sem sessão")
  const anonymous = await api("/api/whatsapp/status")
  check(anonymous.status === 200 && anonymous.body?.expired === true, "sem cabeçalho é recusada")

  console.log("\n2) Abrindo sessões em paralelo")
  const ids = Array.from({ length: USERS }, () => randomUUID())
  const created = await Promise.all(
    ids.map((id) => api("/api/whatsapp/connect", { id, method: "POST" })),
  )
  check(
    created.every((result) => result.status === 200),
    `${USERS} sessões aceitas`,
    created.map((result) => result.status).join(","),
  )

  console.log("\n3) Cada sessão recebe seu próprio QR code")
  const qrs = await waitForQr(ids)
  check(qrs.size === USERS, `${USERS} QR codes gerados`, `obtidos: ${qrs.size}`)
  check(new Set(qrs.values()).size === USERS, "os QR codes são todos diferentes")

  const expiries = await Promise.all(
    ids.map((id) => api("/api/whatsapp/status", { id })),
  )
  const now = Date.now()
  check(
    expiries.every(({ body }) => body?.expiresAt > now),
    "cada sessão tem validade futura",
  )

  if (CAP) {
    console.log("\n4) Limite de sessões")
    const extra = randomUUID()
    const over = await api("/api/whatsapp/connect", { id: extra, method: "POST" })
    if (USERS >= CAP) {
      check(over.status === 429, `a sessão ${CAP + 1} é recusada com 429`, `status ${over.status}`)
    } else {
      check(over.status === 200, `a sessão ${USERS + 1} é aceita abaixo do limite`)
      ids.push(extra)
    }
  }

  console.log("\n5) Isolamento ao desconectar")
  if (ids.length < 2) {
    console.log("  ok   (pulado: precisa de pelo menos 2 sessões ativas)")
  } else {
  const removed = ids.shift()
  const logout = await api("/api/whatsapp/logout", { id: removed, method: "POST" })
  check(logout.status === 200, "logout da primeira sessão responde ok")

  const removedStatus = await api("/api/whatsapp/status", { id: removed })
  check(removedStatus.body?.status === "idle", "a sessão desconectada ficou idle")

  const survivors = await Promise.all(
    ids.map((id) => api("/api/whatsapp/status", { id })),
  )
  check(
    survivors.every(({ body }) => body?.status === "qr"),
    `${ids.length} sessões continuam ativas e independentes`,
    survivors.map(({ body }) => body?.status).join(","),
  )
  check(
    new Set(survivors.map(({ body }) => body?.qr)).size === ids.length,
    "cada sessão restante mantém o próprio QR code",
  )
  }

  if (!KEEP) {
    console.log("\n6) Encerrando as sessões de teste")
    await Promise.all(
      ids.map((id) => api("/api/whatsapp/logout", { id, method: "POST" })),
    )
  } else {
    console.log(`\n6) Sessões mantidas para inspeção: ${ids.length}`)
    console.log(ids.join("\n"))
  }

  console.log(failures === 0 ? "\nResultado: PASSOU\n" : `\nResultado: ${failures} falha(s)\n`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error("\nErro inesperado:", error)
  process.exit(1)
})
