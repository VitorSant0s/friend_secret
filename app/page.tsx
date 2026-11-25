"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import DonationCard from "@/app/donation-card"
import Guide from "@/app/guide"
import { formatMessage } from "@/lib/message"
import {
  apiFetch,
  apiJson,
  ensureSession,
  expireSession,
  refreshSessionExpiry,
  type BrowserSession,
} from "@/lib/session-client"

type ConnectionStatus = "idle" | "connecting" | "qr" | "connected" | "error"

type Snapshot = {
  status: ConnectionStatus
  qr: string | null
  account: string | null
  error: string | null
  expiresAt?: number | null
}

type Group = { id: string; subject: string; count: number }

type Row = {
  id: string
  name: string
  participates: boolean
  hasPhone: boolean
  representative: string
  /** Pessoa que não está no grupo do WhatsApp. */
  external?: boolean
}

type ProgressLine = {
  index: number
  total: number
  name: string
  ok: boolean
  hidden?: boolean
  self?: boolean
  error?: string
}

type Summary = {
  sent: number
  failed: number
  hidden: number
  hideFailed: number
  self: number
}

type DialogKind = "send" | "logout" | null

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function Spinner({ big = false }: { big?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block animate-spin rounded-full border-2 border-stone-300 border-t-emerald-700 ${
        big ? "h-6 w-6" : "h-4 w-4"
      }`}
    />
  )
}

function Card({
  step,
  title,
  action,
  children,
}: {
  step: number
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-base font-bold text-white">
          {step}
        </span>
        <h2 className="flex-1 text-lg font-semibold leading-tight text-stone-900 sm:text-xl">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Dialog({
  open,
  title,
  children,
  confirmLabel,
  confirmTone = "emerald",
  confirmDisabled = false,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  children: React.ReactNode
  confirmLabel: string
  confirmTone?: "emerald" | "red"
  confirmDisabled?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return

    const panel = panelRef.current
    const selector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

    previousFocus.current = document.activeElement as HTMLElement | null
    panel?.querySelector<HTMLElement>(selector)?.focus()

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (event.key !== "Tab" || !panel) return

      const items = [...panel.querySelectorAll<HTMLElement>(selector)]
      if (items.length === 0) return

      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus.current?.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={panelRef}
        className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl"
      >
        <h3 className="text-xl font-bold text-stone-900">{title}</h3>
        <div className="mt-3 space-y-3 text-base leading-7 text-stone-700">
          {children}
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`min-h-13 rounded-2xl px-5 py-3 text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
              confirmTone === "red"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-emerald-700 hover:bg-emerald-800"
            }`}
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-13 rounded-2xl border border-stone-300 px-5 py-3 text-base font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

const STEPS = ["WhatsApp", "Grupo", "Pessoas", "Enviar"]

export default function Home() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [groups, setGroups] = useState<Group[]>([])
  const [groupId, setGroupId] = useState("")
  const [groupSubject, setGroupSubject] = useState("")
  const [rows, setRows] = useState<Row[]>([])
  const [date, setDate] = useState("")
  const [groupsLoaded, setGroupsLoaded] = useState(false)
  const [loadingPeople, setLoadingPeople] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState<ProgressLine[]>([])
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [session, setSession] = useState<BrowserSession | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [externalName, setExternalName] = useState("")
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [guideHint, setGuideHint] = useState(false)
  const autoStarted = useRef(false)
  const restarting = useRef(false)

  const connected = snapshot?.status === "connected"
  const loadingGroups = connected && !groupsLoaded

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        setGuideHint(!window.localStorage.getItem("amigo-secreto.guia.v1"))
      } catch {
        setGuideHint(true)
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  const markGuideSeen = useCallback(() => {
    try {
      window.localStorage.setItem("amigo-secreto.guia.v1", "1")
    } catch {
      // sem localStorage, o convite pode voltar; o guia continua no topo
    }
    setGuideHint(false)
  }, [])

  const openGuide = useCallback(() => {
    markGuideSeen()
    setGuideOpen(true)
  }, [markGuideSeen])

  const restartSession = useCallback(async (message?: string) => {
    if (restarting.current) return
    restarting.current = true
    try {
      await expireSession()
      autoStarted.current = false
      setSnapshot(null)
      setGroups([])
      setGroupsLoaded(false)
      setGroupId("")
      setGroupSubject("")
      setRows([])
      setProgress([])
      setSummary(null)
      setTotal(0)
      setError(message ?? null)
      setSession(await ensureSession())
    } finally {
      restarting.current = false
    }
  }, [])

  // A sessão deste navegador vive no localStorage, cifrada, e dura 1 hora.
  useEffect(() => {
    let active = true

    ensureSession()
      .then((value) => {
        if (active) setSession(value)
      })
      .catch((error) => {
        if (active) setError(errorMessage(error))
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!session) return

    const remaining = session.expiresAt - Date.now()
    const timer = setTimeout(() => {
      void restartSession(
        "A sessão de 1 hora terminou. Escaneie o código do WhatsApp de novo para continuar.",
      )
    }, Math.max(remaining, 0))

    return () => clearTimeout(timer)
  }, [session, restartSession])

  useEffect(() => {
    let active = true

    const tick = async () => {
      try {
        const data = await apiJson<Snapshot & { expired?: boolean }>(
          "/api/whatsapp/status",
        )
        if (!active) return
        if (data.expired) {
          void restartSession(
            "A sessão de 1 hora terminou. Escaneie o código do WhatsApp de novo para continuar.",
          )
          return
        }

        const serverExpiry = data.expiresAt
        if (typeof serverExpiry === "number") {
          await refreshSessionExpiry(serverExpiry)
          setSession((previous) =>
            previous && serverExpiry > previous.expiresAt
              ? { ...previous, expiresAt: serverExpiry }
              : previous,
          )
        }

        setSnapshot(data)
      } catch {
        // o servidor local pode estar reiniciando; a próxima rodada resolve
      }
    }

    tick()
    const timer = setInterval(tick, 2500)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [restartSession])

  // O QR code aparece sozinho: assim que a página abre, já inicia a conexão.
  useEffect(() => {
    if (autoStarted.current) return
    if (!snapshot || snapshot.status !== "idle") return
    autoStarted.current = true
    apiJson<Snapshot>("/api/whatsapp/connect", { method: "POST" })
      .then((data) => setSnapshot(data))
      .catch(() => {
        autoStarted.current = false
      })
  }, [snapshot])

  useEffect(() => {
    if (!connected) return
    let cancelled = false

    apiJson<{ groups: Group[] }>("/api/groups")
      .then((data) => {
        if (!cancelled) setGroups(data.groups)
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setGroupsLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [connected])

  const handleConnect = useCallback(async () => {
    setError(null)
    setConnecting(true)
    try {
      const data = await apiJson<Snapshot>("/api/whatsapp/connect", {
        method: "POST",
      })
      setSnapshot(data)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setConnecting(false)
    }
  }, [])

  const runLogout = useCallback(async () => {
    setError(null)
    try {
      const data = await apiJson<Snapshot>("/api/whatsapp/logout", {
        method: "POST",
      })
      setSnapshot(data)
      setGroups([])
      setGroupsLoaded(false)
      setGroupId("")
      setGroupSubject("")
      setRows([])
      setProgress([])
      setSummary(null)
      autoStarted.current = false
    } catch (err) {
      setError(errorMessage(err))
    }
  }, [])

  const chooseGroup = useCallback(
    async (id: string) => {
      const sameGroup = id === groupId
      setGroupId(id)
      setGroupSubject("")
      setProgress([])
      setSummary(null)
      setError(null)
      if (!id) {
        setRows([])
        return
      }

      setLoadingPeople(true)
      try {
        const data = await apiJson<{
          subject: string
          participants: { id: string; name: string }[]
        }>(`/api/participants?groupId=${encodeURIComponent(id)}`)

        setGroupSubject(data.subject)
        setRows((previous) => {
          const externals = sameGroup
            ? previous.filter((row) => row.external)
            : []
          const previousById = new Map(previous.map((row) => [row.id, row]))

          const groupRows: Row[] = data.participants.map((participant) => {
            const old = previousById.get(participant.id)
            return {
              ...participant,
              participates: old?.participates ?? true,
              hasPhone: old?.hasPhone ?? true,
              representative: old?.representative ?? "",
              external: false,
            }
          })

          const validRepresentatives = new Set(
            groupRows
              .filter((row) => row.participates && row.hasPhone)
              .map((row) => row.id),
          )

          return [
            ...groupRows,
            ...externals.map((row) => ({
              ...row,
              representative: validRepresentatives.has(row.representative)
                ? row.representative
                : "",
            })),
          ]
        })
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setLoadingPeople(false)
      }
    },
    [groupId],
  )

  const addExternal = useCallback(() => {
    const name = externalName.trim()
    if (!name) return

    const suffix =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

    setSummary(null)
    setProgress([])
    setRows((previous) => [
      ...previous,
      {
        id: `externo-${suffix}`,
        name,
        participates: true,
        hasPhone: false,
        representative: "",
        external: true,
      },
    ])
    setExternalName("")
  }, [externalName])

  const removeExternal = useCallback((id: string) => {
    setSummary(null)
    setProgress([])
    setRows((previous) => previous.filter((row) => row.id !== id))
  }, [])

  const patchRow = useCallback((id: string, patch: Partial<Row>) => {
    setSummary(null)
    setProgress([])
    setRows((previous) =>
      previous
        .map((row) => (row.id === id ? { ...row, ...patch } : row))
        .map((row) => {
          const lostPhone = patch.hasPhone === false && row.representative === id
          const leftGroup = patch.participates === false && row.representative === id
          if (lostPhone || leftGroup) {
            return { ...row, representative: "" }
          }
          return row
        }),
    )
  }, [])

  const activeRows = useMemo(() => rows.filter((row) => row.participates), [rows])
  const phoneLessRows = useMemo(
    () => activeRows.filter((row) => !row.hasPhone),
    [activeRows],
  )

  const representatives = useMemo(
    () => activeRows.filter((row) => row.hasPhone),
    [activeRows],
  )

  const namelessRows = useMemo(
    () =>
      activeRows.filter(
        (row) => !row.name.trim() || /^[\d+()\s.-]+$/.test(row.name.trim()),
      ),
    [activeRows],
  )

  const validationError = useMemo(() => {
    if (!groupId) return "Escolha o grupo do amigo secreto."
    if (activeRows.length < 4) return "Selecione pelo menos quatro pessoas."
    if (activeRows.some((row) => !row.name.trim())) {
      return "Escreva o nome de todas as pessoas."
    }
    const missing = phoneLessRows.find((row) => !row.representative)
    if (missing) {
      return `Falta escolher quem vai avisar ${missing.name}.`
    }
    return null
  }, [groupId, activeRows, phoneLessRows])

  const sampleName = activeRows[0]?.name ?? "Ana"
  const previewDate = date.trim() || undefined

  const previewNormal = formatMessage(
    {
      person: { id: "sample", name: sampleName, hasPhone: true },
      ownTarget: { id: "target", name: "Fulano do grupo", hasPhone: true },
      extras: [],
    },
    { date: previewDate },
  )

  const samplePhoneLess = phoneLessRows[0]
  const sampleRepresentativeName =
    activeRows.find((row) => row.id === samplePhoneLess?.representative)?.name ??
    "a pessoa que avisa"
  const previewRepresentative = samplePhoneLess
    ? formatMessage(
        {
          person: { id: "rep", name: sampleRepresentativeName, hasPhone: true },
          ownTarget: { id: "target", name: "Fulano do grupo", hasPhone: true },
          extras: [
            {
              forPerson: {
                id: samplePhoneLess.id,
                name: samplePhoneLess.name,
                hasPhone: false,
              },
              target: { id: "target2", name: "Sicrana do grupo", hasPhone: true },
            },
          ],
        },
        { date: previewDate },
      )
    : null

  const runSend = useCallback(async () => {
    setError(null)
    setSummary(null)
    setProgress([])
    setTotal(activeRows.length)
    setSending(true)

    try {
      const response = await apiFetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          date: date.trim(),
          people: activeRows.map((row) => ({
            id: row.id,
            name: row.name.trim(),
            hasPhone: row.hasPhone,
            external: row.external === true,
          })),
          representatives: Object.fromEntries(
            phoneLessRows.map((row) => [row.id, row.representative]),
          ),
        }),
      })

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null)
        throw new Error(
          (data as { error?: string } | null)?.error ??
            "Não foi possível começar o envio.",
        )
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.trim()) continue
          const event = JSON.parse(line) as
            | ({ type: "progress" } & ProgressLine)
            | ({ type: "done" } & Summary)
            | { type: "error"; message: string }
            | { type: "start"; total: number }

          if (event.type === "progress") {
            setProgress((previous) => [...previous, event])
          } else if (event.type === "done") {
            setSummary({
              sent: event.sent,
              failed: event.failed,
              hidden: event.hidden ?? 0,
              hideFailed: event.hideFailed ?? 0,
              self: event.self ?? 0,
            })
          } else if (event.type === "error") {
            setError(event.message)
          }
        }
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }, [activeRows, date, groupId, phoneLessRows])

  const requestSend = useCallback(() => {
    if (validationError) {
      setError(validationError)
      return
    }
    setAcceptedTerms(false)
    setDialog("send")
  }, [validationError])

  const currentStep = !connected
    ? 0
    : !groupId || rows.length === 0
      ? 1
      : validationError
        ? 2
        : 3

  const minutesLeft = session
    ? Math.max(0, Math.round((session.expiresAt - now) / 60000))
    : null

  const done = Boolean(summary && summary.failed === 0)
  const summaryHasProblem = Boolean(
    summary && (summary.failed > 0 || summary.hideFailed > 0),
  )
  const canSend = !sending && !done
  const percent = total > 0 ? Math.round((progress.length / total) * 100) : 0

  return (
    <div className="min-h-screen bg-[#faf6ee]">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-emerald-700 focus:px-4 focus:py-3 focus:text-base focus:font-semibold focus:text-white"
      >
        Pular para o conteúdo
      </a>

      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-4">
          <span className="text-3xl" aria-hidden>
            🎁
          </span>
          <div className="flex-1">
            <h1 className="text-xl font-bold leading-tight text-stone-900">
              Amigo Secreto
            </h1>
            <p className="text-sm text-stone-600">
              Sorteio fácil, direto no WhatsApp
            </p>
          </div>
          <button
            type="button"
            onClick={openGuide}
            aria-label="Abrir o guia rápido"
            className="min-h-11 shrink-0 rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            Guia
          </button>
        </div>
      </header>

      <main
        id="conteudo"
        className="mx-auto w-full max-w-2xl px-4 pb-36 pt-5 sm:pb-12"
      >
        {guideHint && (
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <p className="text-base font-semibold text-emerald-950">
                Primeira vez por aqui?
              </p>
              <p className="text-sm leading-6 text-emerald-900">
                O guia mostra o passo a passo, do QR code ao envio. É opcional e
                pode ser fechado quando quiser.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={openGuide}
                className="min-h-11 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Abrir guia
              </button>
              <button
                type="button"
                onClick={markGuideSeen}
                className="min-h-11 rounded-xl border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100"
              >
                Agora não
              </button>
            </div>
          </div>
        )}

        <ol className="mb-5 flex items-center justify-between gap-1">
          {STEPS.map((label, index) => {
            const active = index === currentStep
            const complete = index < currentStep
            return (
              <li
                key={label}
                aria-current={active ? "step" : undefined}
                aria-label={`Etapa ${index + 1}: ${label}${
                  complete ? " (concluída)" : active ? " (atual)" : ""
                }`}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                <span
                  aria-hidden
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                    active
                      ? "bg-emerald-700 text-white"
                      : complete
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-stone-200 text-stone-600"
                  }`}
                >
                  {complete ? "✓" : index + 1}
                </span>
                <span
                  className={`text-xs font-medium ${
                    active ? "text-emerald-800" : "text-stone-600"
                  }`}
                >
                  {label}
                </span>
              </li>
            )
          })}
        </ol>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-base leading-6 text-red-800"
          >
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <Card step={1} title="Conectar o WhatsApp">
            {connected ? (
              <div className="flex flex-col gap-4">
                <div
                  role="status"
                  className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3"
                >
                  <span
                    aria-hidden
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-base font-bold text-white"
                  >
                    ✓
                  </span>
                  <div>
                    <p className="text-base font-semibold text-emerald-900">
                      WhatsApp conectado
                    </p>
                    <p className="text-sm text-emerald-800">
                      {snapshot?.account ?? "Conta conectada"}
                    </p>
                    {minutesLeft !== null && (
                      <p className="mt-1 text-xs text-emerald-800">
                        Esta sessão vale por 1 hora — restam cerca de{" "}
                        {minutesLeft} min.
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-base leading-7 text-stone-700">
                  As mensagens vão sair do seu WhatsApp. Você pode desconectar
                  quando terminar.
                </p>
                <button
                  type="button"
                  onClick={() => setDialog("logout")}
                  disabled={sending}
                  className="min-h-12 rounded-2xl border border-stone-300 px-5 py-2.5 text-base font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50 sm:self-start"
                >
                  Desconectar
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-base leading-7 text-stone-700">
                  Abra o WhatsApp no celular, toque em{" "}
                  <strong>Aparelhos conectados</strong> e aponte a câmera para o
                  código abaixo.
                </p>

                {snapshot?.status === "qr" && snapshot.qr ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="rounded-3xl border border-stone-200 bg-white p-3 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={snapshot.qr}
                        alt="QR code para conectar o WhatsApp. Abra o aplicativo no celular, entre em Aparelhos conectados e aponte a câmera."
                        width={288}
                        height={288}
                        className="h-64 w-64 sm:h-72 sm:w-72"
                      />
                    </div>
                    <p className="text-center text-sm leading-6 text-stone-600">
                      O código se renova sozinho. Se ficar parado, aguarde alguns
                      segundos.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-stone-50 px-4 py-8 text-center">
                    <p className="flex items-center justify-center gap-3 text-base font-medium text-stone-700">
                      <Spinner big /> Preparando o código…
                    </p>
                    <p className="mt-2 text-sm text-stone-600">
                      Isso leva alguns segundos. A conexão vale por 1 hora.
                    </p>
                  </div>
                )}

                {snapshot?.status === "qr" ? (
                  <p className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-base font-medium text-emerald-900">
                    <Spinner /> Aguardando a leitura do código…
                  </p>
                ) : snapshot?.status === "error" ? (
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={connecting}
                    className="min-h-13 rounded-2xl bg-emerald-700 px-5 py-3 text-base font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Tentar de novo
                  </button>
                ) : null}

                {snapshot?.error && (
                  <p className="text-base text-stone-700">{snapshot.error}</p>
                )}
              </div>
            )}
          </Card>

          <Card step={2} title="Escolher o grupo">
            <div className="flex items-center gap-2">
              <select
                aria-label="Escolher o grupo do amigo secreto"
                value={groupId}
                onChange={(event) => chooseGroup(event.target.value)}
                disabled={!connected || loadingGroups || sending}
                className="min-h-13 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-base text-stone-800 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:bg-stone-100"
              >
                <option value="">
                  {connected ? "Toque para escolher" : "Conecte o WhatsApp primeiro"}
                </option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.subject} ({group.count} pessoas)
                  </option>
                ))}
              </select>
              {loadingGroups && <Spinner />}
            </div>

            {loadingPeople && (
              <p className="mt-3 flex items-center gap-2 text-base text-stone-700">
                <Spinner /> Carregando as pessoas…
              </p>
            )}
          </Card>

          {rows.length > 0 && (
            <>
              <Card
                step={3}
                title="Quem participa"
                action={
                  <button
                    type="button"
                    onClick={() => chooseGroup(groupId)}
                    disabled={loadingPeople || sending}
                    className="rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
                  >
                    Atualizar
                  </button>
                }
              >
                <div className="mb-4 space-y-2 text-base leading-7 text-stone-700">
                  <p>
                    Todos já estão marcados. <strong>Desmarque</strong> quem não
                    vai participar do amigo secreto.
                  </p>
                  <p>
                    Se alguém <strong>não tem celular</strong>, desmarque “Tem
                    celular?” e escolha quem vai avisar essa pessoa.
                  </p>
                </div>

                {namelessRows.length > 0 && (
                  <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                    O WhatsApp não enviou o nome de{" "}
                    {namelessRows.length === 1
                      ? "1 pessoa"
                      : `${namelessRows.length} pessoas`}
                    . Toque no nome para corrigir — é esse nome que vai aparecer
                    nas mensagens.
                  </div>
                )}

                <ul className="flex flex-col gap-2.5">
                  {rows.map((row) => (
                    <li
                      key={row.id}
                      className={`overflow-hidden rounded-2xl border ${
                        row.participates
                          ? "border-stone-200 bg-white"
                          : "border-stone-200 bg-stone-50"
                      }`}
                    >
                      <div className="flex min-h-14 items-center gap-3 px-3 py-2">
                        {row.external ? (
                          <span
                            aria-hidden
                            className="flex h-6 w-6 shrink-0 items-center justify-center text-lg"
                          >
                            👤
                          </span>
                        ) : (
                          <input
                            id={`part-${row.id}`}
                            type="checkbox"
                            aria-label={`Incluir ${row.name || "esta pessoa"} no sorteio`}
                            checked={row.participates}
                            onChange={(event) =>
                              patchRow(row.id, {
                                participates: event.target.checked,
                              })
                            }
                            className="h-6 w-6 shrink-0 accent-emerald-700"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          {editingId === row.id ? (
                            <input
                              autoFocus
                              value={row.name}
                              aria-label="Nome da pessoa"
                              onChange={(event) =>
                                patchRow(row.id, { name: event.target.value })
                              }
                              onBlur={() => setEditingId(null)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === "Escape") {
                                  setEditingId(null)
                                }
                              }}
                              maxLength={60}
                              className="w-full rounded-lg border border-emerald-400 bg-white px-2 py-1 text-lg font-medium text-stone-900 outline-none focus:ring-4 focus:ring-emerald-100"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingId(row.id)}
                              title="Toque para corrigir o nome"
                              aria-label={`Corrigir o nome de ${row.name || "quem está sem nome"}`}
                              className="flex w-full items-center gap-2 text-left"
                            >
                              <span
                                className={`min-w-0 flex-1 break-words text-base font-medium sm:text-lg leading-6 ${
                                  row.participates
                                    ? "text-stone-900"
                                    : "text-stone-400 line-through"
                                }`}
                              >
                                {row.name.trim() || "Sem nome"}
                              </span>
                              <span aria-hidden className="shrink-0 text-sm">
                                ✏️
                              </span>
                            </button>
                          )}
                        </div>

                        {row.external ? (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
                            de fora
                          </span>
                        ) : row.participates ? (
                          <div className="flex shrink-0 items-center gap-2">
                            <label
                              htmlFor={`phone-${row.id}`}
                              className="cursor-pointer text-sm font-medium text-stone-600"
                            >
                              celular
                            </label>
                            <input
                              id={`phone-${row.id}`}
                              type="checkbox"
                              aria-label={`${row.name || "Esta pessoa"} tem celular`}
                              checked={row.hasPhone}
                              onChange={(event) =>
                                patchRow(row.id, {
                                  hasPhone: event.target.checked,
                                })
                              }
                              className="h-6 w-6 accent-emerald-700"
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-stone-500">fora</span>
                        )}
                      </div>

                      {row.participates && !row.hasPhone && (
                        <div className="border-t border-stone-100 px-3 pb-3 pt-2">
                          <div className="flex items-center justify-between gap-3">
                            <label
                              htmlFor={`rep-${row.id}`}
                              className="text-base font-semibold text-stone-800"
                            >
                              Quem vai avisar {row.name}?
                            </label>
                            {row.external && (
                              <button
                                type="button"
                                onClick={() => removeExternal(row.id)}
                                aria-label={`Remover ${row.name || "pessoa"} do sorteio`}
                                className="shrink-0 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                              >
                                Remover
                              </button>
                            )}
                          </div>
                          <select
                            id={`rep-${row.id}`}
                            value={row.representative}
                            onChange={(event) =>
                              patchRow(row.id, {
                                representative: event.target.value,
                              })
                            }
                            className={`mt-2 min-h-13 w-full rounded-2xl border px-4 py-3 text-base text-stone-800 outline-none focus:ring-4 focus:ring-emerald-100 ${
                              row.representative
                                ? "border-stone-300 bg-white"
                                : "border-amber-400 bg-amber-50"
                            }`}
                          >
                            <option value="">Escolha uma pessoa</option>
                            {representatives
                              .filter((candidate) => candidate.id !== row.id)
                              .map((candidate) => (
                                <option key={candidate.id} value={candidate.id}>
                                  {candidate.name}
                                </option>
                              ))}
                          </select>
                          <p className="mt-2 text-sm leading-6 text-stone-600">
                            {row.external
                              ? `Como ${row.name} não está no grupo, o nome vai só para quem avisa, pessoalmente.`
                              : `Essa pessoa recebe o nome de ${row.name} e avisa pessoalmente. ${row.name} continua dando presente.`}
                          </p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>

                <div className="mt-4 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-3">
                  <p className="text-base font-semibold text-stone-800">
                    Pessoa de fora do grupo
                  </p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">
                    Ela participa do sorteio e dá presente, mas não está no
                    grupo: quem avisa recebe o nome e conta pessoalmente.
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={externalName}
                      onChange={(event) => setExternalName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          addExternal()
                        }
                      }}
                      aria-label="Nome da pessoa de fora do grupo"
                      placeholder="Nome da pessoa"
                      maxLength={60}
                      className="min-h-12 w-full rounded-2xl border border-stone-300 bg-white px-4 py-2.5 text-base text-stone-900 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                    />
                    <button
                      type="button"
                      onClick={addExternal}
                      disabled={!externalName.trim()}
                      className="min-h-12 shrink-0 rounded-2xl bg-emerald-700 px-5 py-2.5 text-base font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>

                <p className="mt-4 text-sm text-stone-600">
                  {activeRows.length} pessoas no sorteio
                  {phoneLessRows.length > 0 &&
                    ` · ${phoneLessRows.length} sem celular${
                      activeRows.filter((row) => row.external).length > 0
                        ? ` (${activeRows.filter((row) => row.external).length} de fora)`
                        : ""
                    } · ${
                      phoneLessRows.filter((row) => row.representative).length
                    } com quem avisa`}
                </p>
              </Card>

              <Card step={4} title="Data e envio">
                <label
                  htmlFor="date"
                  className="block text-base font-semibold text-stone-800"
                >
                  Dia da entrega (opcional)
                </label>
                <input
                  id="date"
                  value={date}
                  onChange={(event) => {
                    setDate(event.target.value)
                    setSummary(null)
                    setProgress([])
                  }}
                  placeholder="Por exemplo: 20/12"
                  maxLength={60}
                  className="mt-2 min-h-13 w-full rounded-2xl border border-stone-300 px-4 py-3 text-base text-stone-800 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                />

                <details className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <summary className="cursor-pointer text-base font-semibold text-stone-800">
                    Ver como as mensagens ficam
                  </summary>
                  <div className="mt-3 space-y-3">
                    <div>
                      <p className="mb-1.5 text-sm font-semibold text-stone-600">
                        Para quem tem celular
                      </p>
                      <pre className="whitespace-pre-wrap rounded-xl bg-white p-3 font-sans text-sm leading-6 text-stone-800">
                        {previewNormal}
                      </pre>
                    </div>
                    {previewRepresentative && (
                      <div>
                        <p className="mb-1.5 text-sm font-semibold text-stone-600">
                          Para quem vai avisar alguém
                        </p>
                        <pre className="whitespace-pre-wrap rounded-xl bg-white p-3 font-sans text-sm leading-6 text-stone-800">
                          {previewRepresentative}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>

                <div className="mt-5">
                  <button
                    type="button"
                    onClick={requestSend}
                    disabled={!canSend || Boolean(validationError)}
                    className="hidden min-h-14 w-full rounded-2xl bg-emerald-700 px-5 py-3.5 text-lg font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 sm:block"
                  >
                    {sending
                      ? `Enviando… ${progress.length} de ${total}`
                      : done
                        ? "Sorteio concluído"
                        : summary && summary.failed > 0
                          ? "Refazer sorteio"
                          : "Sortear e enviar"}
                  </button>

                  {validationError && (
                    <p className="mt-2 text-sm font-medium text-amber-800">
                      {validationError}
                    </p>
                  )}

                  {sending && (
                    <div className="mt-4" aria-live="polite" aria-busy="true">
                      <div className="h-3 w-full overflow-hidden rounded-full bg-stone-200">
                        <div
                          className="h-full rounded-full bg-emerald-700 transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <p className="mt-2 text-base text-stone-700">
                        Enviando para {progress.at(-1)?.name ?? "…"} —{" "}
                        {progress.length} de {total}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-stone-600">
                        Não feche esta página. As mensagens saem uma de cada vez
                        e são apagadas da sua conversa depois do envio.
                      </p>
                    </div>
                  )}
                </div>

                {summary && (
                  <div
                    className={`mt-5 rounded-2xl border p-4 ${
                      summaryHasProblem
                        ? "border-amber-300 bg-amber-50"
                        : "border-emerald-200 bg-emerald-50"
                    }`}
                    aria-live="polite"
                  >
                    <p className="text-lg font-bold text-stone-900">
                      {summary.failed > 0
                        ? "Envio terminou com falhas"
                        : summary.hideFailed > 0
                          ? "Enviado com um detalhe"
                          : "Tudo enviado!"}
                    </p>
                    <p className="mt-1 text-base leading-7 text-stone-700">
                      {summary.sent} mensagens enviadas
                      {summary.failed > 0 && ` e ${summary.failed} não saíram`}.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-stone-600">
                      {summary.hideFailed > 0
                        ? `${summary.hideFailed} ${
                            summary.hideFailed === 1
                              ? "mensagem ficou"
                              : "mensagens ficaram"
                          } na sua conversa do WhatsApp. Apague à mão se quiser.`
                        : "As mensagens foram apagadas da sua conversa; os participantes continuam com o nome."}
                    </p>
                    {summary.self > 0 && (
                      <p className="mt-1 text-sm leading-6 text-stone-600">
                        A sua própria mensagem, com o seu amigo secreto, foi
                        mantida na sua conversa.
                      </p>
                    )}
                    <p className="mt-1 text-sm leading-6 text-stone-600">
                      Confira no WhatsApp. O sorteio não fica salvo: se algo deu
                      errado, refaça e avise quem já recebeu.
                    </p>
                  </div>
                )}

                {progress.length > 0 && (
                  <details className="mt-4 rounded-2xl border border-stone-200">
                    <summary className="cursor-pointer px-4 py-3 text-base font-semibold text-stone-800">
                      Ver {progress.length} mensagens enviadas
                    </summary>
                    <ul className="max-h-64 divide-y divide-stone-100 overflow-y-auto">
                      {progress.map((line) => (
                        <li
                          key={`${line.index}-${line.name}`}
                          className="flex items-center gap-2 px-4 py-2.5 text-base"
                        >
                          <span aria-hidden>
                            {!line.ok
                              ? "❌"
                              : line.self
                                ? "ℹ️"
                                : line.hidden === false
                                  ? "⚠️"
                                  : "✅"}
                          </span>
                          <span className="flex-1 text-stone-800">
                            {line.name}
                            {line.ok && line.self && (
                              <span className="block text-xs text-stone-600">
                                sua mensagem — mantida na sua conversa
                              </span>
                            )}
                            {line.ok && !line.self && line.hidden === false && (
                              <span className="block text-xs text-amber-800">
                                enviada, mas ficou na sua conversa
                              </span>
                            )}
                          </span>
                          {!line.ok && (
                            <span className="max-w-[55%] truncate text-sm text-red-700">
                              {line.error}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </Card>
            </>
          )}
        </div>

        {groupSubject && rows.length > 0 && (
          <p className="mt-5 text-center text-sm text-stone-500">
            Grupo: {groupSubject}
          </p>
        )}

        <DonationCard />

        <footer className="mt-6 border-t border-stone-200 pb-2 pt-5 text-center text-sm leading-6 text-stone-600">
          <p>
            Software livre, licença MIT — fornecido como está, sem garantias.
          </p>
          <p className="mt-1">
            Uso por sua conta e risco. Sem vínculo com o WhatsApp ou a Meta.
          </p>
          <nav
            aria-label="Documentos legais"
            className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1"
          >
            <Link
              href="/termos"
              className="font-semibold text-emerald-800 underline underline-offset-4"
            >
              Termos de Uso
            </Link>
            <Link
              href="/privacidade"
              className="font-semibold text-emerald-800 underline underline-offset-4"
            >
              Política de Privacidade
            </Link>
          </nav>
        </footer>
      </main>

      {rows.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 p-3 backdrop-blur sm:hidden">
          <div className="mx-auto w-full max-w-2xl">
            <p className="mb-2 flex items-center justify-between text-sm text-stone-600">
              <span>{activeRows.length} pessoas no sorteio</span>
              {sending && <span>{progress.length} de {total}</span>}
            </p>
            <button
              type="button"
              onClick={requestSend}
              disabled={!canSend || Boolean(validationError)}
              className="min-h-14 w-full rounded-2xl bg-emerald-700 px-5 py-3 text-lg font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending
                ? `Enviando… ${progress.length} de ${total}`
                : done
                  ? "Sorteio concluído"
                  : summary && summary.failed > 0
                    ? "Refazer sorteio"
                    : "Sortear e enviar"}
            </button>
          </div>
        </div>
      )}

      {guideOpen && (
        <Guide
          initialStep={summary ? 4 : Math.min(currentStep, 3)}
          onClose={() => setGuideOpen(false)}
        />
      )}

      <Dialog
        open={dialog === "send"}
        title="Confirmar o sorteio?"
        confirmLabel="Sim, sortear e enviar"
        confirmDisabled={!acceptedTerms}
        onClose={() => setDialog(null)}
        onConfirm={() => {
          setDialog(null)
          void runSend()
        }}
      >
        <p>
          O sorteio será feito agora para <strong>{activeRows.length} pessoas</strong>{" "}
          e cada uma vai receber uma mensagem privada.
        </p>
        {phoneLessRows.length > 0 && (
          <p>
            {phoneLessRows.length}{" "}
            {phoneLessRows.length === 1 ? "pessoa não tem" : "pessoas não têm"}{" "}
            celular: quem avisa recebe o nome dela na mesma mensagem.
          </p>
        )}
        <p>
          Depois do envio, a mensagem é apagada da <strong>sua conversa</strong>{" "}
          — os participantes continuam com o nome, e você não vê os sorteios
          depois. A sua própria mensagem, com o seu amigo secreto, fica com
          você.
        </p>
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900">
          Depois de enviar não dá para desfazer.
        </p>

        <label
          htmlFor="accept-terms"
          className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm leading-6 text-stone-700"
        >
          <input
            id="accept-terms"
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-emerald-700"
          />
          <span>
            Declaro que avisei as pessoas incluídas e tenho autorização para
            usar o nome e o número delas neste sorteio. Li e aceito os{" "}
            <a
              href="/termos"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-emerald-800 underline underline-offset-2"
            >
              Termos de Uso
            </a>{" "}
            e a{" "}
            <a
              href="/privacidade"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-emerald-800 underline underline-offset-2"
            >
              Política de Privacidade
            </a>
            .
          </span>
        </label>
      </Dialog>

      <Dialog
        open={dialog === "logout"}
        title="Desconectar o WhatsApp?"
        confirmLabel="Sim, desconectar"
        confirmTone="red"
        onClose={() => setDialog(null)}
        onConfirm={() => {
          setDialog(null)
          void runLogout()
        }}
      >
        <p>
          Você vai precisar ler o código com o celular de novo para usar o
          programa.
        </p>
      </Dialog>
    </div>
  )
}
