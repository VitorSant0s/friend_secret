"use client"

import { useEffect, useRef, useState } from "react"

type GuideStep = {
  emoji: string
  title: string
  body: React.ReactNode
}

const STEPS: GuideStep[] = [
  {
    emoji: "🔗",
    title: "Conectar o WhatsApp",
    body: (
      <>
        <p>
          Abra o WhatsApp no celular, toque em <strong>Aparelhos conectados</strong>{" "}
          e aponte a câmera para o código que aparece na tela.
        </p>
        <p>
          A conexão vale por <strong>1 hora</strong>. Cada navegador é uma conexão
          separada, como um aparelho a mais.
        </p>
      </>
    ),
  },
  {
    emoji: "👥",
    title: "Escolher o grupo",
    body: (
      <>
        <p>
          Toque no campo <strong>Escolher o grupo</strong> e selecione o grupo do
          amigo secreto. A lista de pessoas vem do WhatsApp.
        </p>
        <p>
          Se algum nome aparecer como número, toque no nome e escreva o nome certo
          — é ele que vai na mensagem.
        </p>
      </>
    ),
  },
  {
    emoji: "✍️",
    title: "Ajustar as pessoas",
    body: (
      <>
        <p>
          Todos entram marcados. <strong>Desmarque</strong> quem não participa do
          sorteio.
        </p>
        <p>
          Quem <strong>não tem celular</strong> precisa de um representante, que
          recebe o nome e avisa pessoalmente. Para quem nem está no grupo, use{" "}
          <strong>Pessoa de fora do grupo</strong> e digite o nome.
        </p>
      </>
    ),
  },
  {
    emoji: "🎁",
    title: "Sortear e enviar",
    body: (
      <>
        <p>
          O dia da entrega é opcional. Confira a prévia, marque o aceite dos
          termos e toque em <strong>Sortear e enviar</strong>.
        </p>
        <p>
          As mensagens saem uma de cada vez. Elas são apagadas da sua conversa
          depois do envio, menos a sua, com o seu próprio amigo secreto.
        </p>
      </>
    ),
  },
  {
    emoji: "✅",
    title: "Depois do envio",
    body: (
      <>
        <p>
          Confira no WhatsApp se as mensagens chegaram. Se algo falhar, corrija e
          refaça o sorteio, avisando quem já recebeu.
        </p>
        <p>
          Termos e privacidade ficam no rodapé. O guia pode ser aberto de novo pelo
          botão <strong>Guia</strong>, no topo.
        </p>
      </>
    ),
  },
]

export default function Guide({
  initialStep = 0,
  onClose,
}: {
  initialStep?: number
  onClose: () => void
}) {
  const safeInitial = Math.min(Math.max(initialStep, 0), STEPS.length - 1)
  const [step, setStep] = useState(safeInitial)
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const panel = panelRef.current
    const selector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

    const previousFocus = document.activeElement as HTMLElement | null
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
      previousFocus?.focus()
    }
  }, [])

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-stone-900/50 p-3 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Guia rápido"
    >
      <div
        ref={panelRef}
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-xl"
      >
        <div className="flex items-center gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
          <span className="text-2xl" aria-hidden>
            🧭
          </span>
          <p className="flex-1 text-base font-semibold text-stone-900">
            Guia rápido
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar o guia"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 text-lg font-bold text-stone-700 transition hover:bg-stone-50"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-4 sm:px-6">
          <ol className="flex items-center gap-1.5" aria-label="Passos do guia">
            {STEPS.map((item, index) => (
              <li key={item.title} className="flex-1">
                <button
                  type="button"
                  onClick={() => setStep(index)}
                  aria-label={`Ir para o passo ${index + 1}: ${item.title}`}
                  aria-current={index === step ? "step" : undefined}
                  className={`h-2 w-full rounded-full transition ${
                    index === step
                      ? "bg-emerald-700"
                      : index < step
                        ? "bg-emerald-300"
                        : "bg-stone-200"
                  }`}
                />
              </li>
            ))}
          </ol>

          <div className="mt-5">
            <p className="text-sm font-medium text-stone-500">
              Passo {step + 1} de {STEPS.length}
            </p>
            <h2 className="mt-1 flex items-center gap-2 text-xl font-bold text-stone-900">
              <span aria-hidden>{current.emoji}</span>
              {current.title}
            </h2>
            <div className="mt-3 space-y-3 text-base leading-7 text-stone-700">
              {current.body}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-stone-100 px-5 py-4 sm:flex sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={() => setStep((value) => Math.max(0, value - 1))}
            disabled={step === 0}
            className="min-h-12 rounded-2xl border border-stone-300 px-5 py-2.5 text-base font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLast) {
                onClose()
                return
              }
              setStep((value) => Math.min(STEPS.length - 1, value + 1))
            }}
            className="min-h-12 rounded-2xl bg-emerald-700 px-5 py-2.5 text-base font-semibold text-white transition hover:bg-emerald-800 sm:flex-none"
          >
            {isLast ? "Concluir" : "Próximo"}
          </button>
        </div>
      </div>
    </div>
  )
}
