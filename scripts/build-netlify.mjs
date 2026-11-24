import { execFileSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs"
import os from "node:os"
import path from "node:path"

/**
 * Build estático para o Netlify.
 *
 * O Netlify não pode segurar a conexão do WhatsApp, então o site publicado é só
 * a interface. As rotas de API e o proxy (CORS) saem temporariamente do projeto
 * porque exportação estática não aceita código de servidor.
 *
 * O endereço do motor vem de NEXT_PUBLIC_API_URL e é embutido no build.
 */

const root = process.cwd()
const staging = path.join(os.tmpdir(), `amigo-secreto-netlify-${process.pid}`)
const moves = []

function moveOut(relative) {
  const from = path.join(root, relative)
  if (!existsSync(from)) return
  const to = path.join(staging, relative.replace(/[\\/]/g, "-"))
  cpSync(from, to, { recursive: true })
  rmSync(from, { recursive: true, force: true })
  moves.push({ from, to })
}

function restore() {
  for (const item of moves.reverse()) {
    if (existsSync(item.to)) {
      cpSync(item.to, item.from, { recursive: true })
      rmSync(item.to, { recursive: true, force: true })
    }
  }
}

if (process.env.NETLIFY === "true" && !process.env.NEXT_PUBLIC_API_URL) {
  throw new Error(
    "Defina NEXT_PUBLIC_API_URL nas variáveis de ambiente do Netlify, apontando para o motor na VPS.",
  )
}

try {
  rmSync(path.join(root, ".next"), { recursive: true, force: true })
  mkdirSync(staging, { recursive: true })
  moveOut("app/api")
  moveOut("proxy.ts")

  execFileSync(
    process.execPath,
    [path.join("node_modules", "next", "dist", "bin", "next"), "build"],
    {
      stdio: "inherit",
      env: { ...process.env, NEXT_OUTPUT: "export" },
    },
  )
} finally {
  restore()
  rmSync(staging, { recursive: true, force: true })
}
