"use client"

import { useEffect, useMemo, useState } from "react"
import { apiUrl } from "@/lib/api-base"

const PRESETS = [1, 2, 5, 10]
const MIN = 1
const MAX = 1000

type DonationData = {
  configured: boolean
  code?: string
  qr?: string
  error?: string
}

export default function DonationCard() {
  const [amount, setAmount] = useState("1")
  const [custom, setCustom] = useState(false)
  const [data, setData] = useState<DonationData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const value = useMemo(() => Number(amount.replace(",", ".")), [amount])
  const valid = Number.isFinite(value) && value >= MIN && value <= MAX

  useEffect(() => {
    if (!valid) return

    const controller = new AbortController()
    const timer = setTimeout(() => {
      fetch(apiUrl(`/api/donation?amount=${value.toFixed(2)}`), {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const payload = (await response.json().catch(() => null)) as
            | DonationData
            | null
          if (!response.ok) {
            throw new Error(payload?.error ?? "Não foi possível gerar o PIX.")
          }
          return payload!
        })
        .then((payload) => {
          setData(payload)
          setError(null)
        })
        .catch((err) => {
          if (err instanceof Error && err.name === "AbortError") return
          setError(err instanceof Error ? err.message : String(err))
        })
    }, 350)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [valid, value])

  const choosePreset = (preset: number) => {
    setCustom(false)
    setAmount(String(preset))
    setCopied(false)
  }

  const startCustom = () => {
    setCustom(true)
    setAmount("")
    setCopied(false)
  }

  const copyCode = async () => {
    if (!data?.code) return
    try {
      await navigator.clipboard.writeText(data.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setError("Não foi possível copiar. Selecione o código e copie à mão.")
    }
  }

  return (
    <section className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="text-3xl" aria-hidden>
          ☕
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-semibold leading-tight text-stone-900 sm:text-xl">
            Apoie este trabalho
          </h2>
          <p className="mt-1 text-base leading-7 text-stone-700">
            O programa é gratuito. Se ele te ajudou, você pode deixar{" "}
            <strong>R$ 1</strong> de contribuição — ou escolher outro valor.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {PRESETS.map((preset) => {
          const selected = !custom && value === preset
          return (
            <button
              key={preset}
              type="button"
              aria-pressed={selected}
              onClick={() => choosePreset(preset)}
              className={`min-h-12 rounded-2xl border text-base font-semibold transition ${
                selected
                  ? "border-amber-600 bg-amber-600 text-white"
                  : "border-amber-300 bg-white text-stone-800 hover:bg-amber-100"
              }`}
            >
              R$ {preset}
            </button>
          )
        })}
        <button
          type="button"
          aria-pressed={custom}
          onClick={startCustom}
          className={`col-span-2 min-h-12 rounded-2xl border text-base font-semibold transition sm:col-span-1 ${
            custom
              ? "border-amber-600 bg-amber-600 text-white"
              : "border-amber-300 bg-white text-stone-800 hover:bg-amber-100"
          }`}
        >
          Outro valor
        </button>
      </div>

      {custom && (
        <div className="mt-3">
          <label
            htmlFor="donation-amount"
            className="text-base font-semibold text-stone-800"
          >
            Quanto você quer doar?
          </label>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-lg font-semibold text-stone-700">R$</span>
            <input
              id="donation-amount"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value)
                setCopied(false)
              }}
              inputMode="decimal"
              aria-invalid={!valid}
              aria-describedby={!valid ? "donation-hint" : undefined}
              placeholder="20,00"
              maxLength={7}
              autoFocus
              className="min-h-13 w-full max-w-40 rounded-2xl border border-stone-300 bg-white px-4 py-3 text-lg text-stone-900 outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
            />
          </div>
          {!valid && (
            <p id="donation-hint" className="mt-1 text-sm font-medium text-amber-900">
              Digite um valor entre R$ {MIN} e R$ {MAX}.
            </p>
          )}
        </div>
      )}

      {valid && data?.configured === false && (
        <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-stone-600">
          As doações ainda não estão configuradas. Quem administra o programa
          precisa informar a chave PIX.
        </p>
      )}

      {valid && data?.configured && data.qr && (
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.qr}
              alt={`QR code do PIX de R$ ${value.toFixed(2).replace(".", ",")}`}
              width={176}
              height={176}
              className="h-44 w-44 rounded-2xl border border-amber-200 bg-white p-2"
            />
            <p className="text-sm font-medium text-stone-700">
              R$ {value.toFixed(2).replace(".", ",")}
            </p>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-stone-700">
              PIX copia e cola
            </p>
            <textarea
              readOnly
              value={data.code}
              rows={4}
              aria-label="Código PIX copia e cola"
              className="mt-1 w-full resize-none break-all rounded-xl border border-amber-200 bg-white px-3 py-2 font-mono text-xs leading-5 text-stone-700"
            />
            <span role="status" className="sr-only">
              {copied ? "Código PIX copiado" : ""}
            </span>
            <button
              type="button"
              onClick={copyCode}
              className="mt-2 min-h-12 w-full rounded-2xl bg-amber-600 px-4 py-2.5 text-base font-semibold text-white transition hover:bg-amber-700"
            >
              {copied ? "Código copiado!" : "Copiar código PIX"}
            </button>
            <p className="mt-2 text-xs leading-5 text-stone-600">
              Abra o aplicativo do seu banco, escolha PIX e cole o código. O valor
              já vai preenchido.
            </p>
          </div>
        </div>
      )}

      {valid && data === null && !error && (
        <p className="mt-4 flex items-center gap-2 text-sm text-stone-600">
          Gerando o QR code…
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
