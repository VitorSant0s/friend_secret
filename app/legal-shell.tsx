import Link from "next/link"
import { missingLegalFields } from "@/lib/legal"

export function LegalSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
      {children}
    </section>
  )
}

export function LegalShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  const missing = missingLegalFields()

  return (
    <div className="min-h-screen bg-[#faf6ee]">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-4">
          <span className="text-3xl" aria-hidden>
            🎁
          </span>
          <div>
            <Link
              href="/"
              className="text-xl font-bold leading-tight text-stone-900"
            >
              Amigo Secreto
            </Link>
            <p className="text-sm text-stone-600">{subtitle}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-8">
        <Link
          href="/"
          className="text-base font-semibold text-emerald-800 underline underline-offset-4"
        >
          ← Voltar ao sorteio
        </Link>

        {missing.length > 0 && (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-base leading-6 text-red-900"
          >
            <p className="font-semibold">Documento pendente de preenchimento.</p>
            <p className="mt-1 text-sm">
              Antes de publicar, preencha em <code>lib/legal.ts</code> os dados do
              responsável. Faltam: {missing.join(", ")}.
            </p>
          </div>
        )}

        <article className="mt-4 space-y-5 rounded-3xl border border-stone-200 bg-white p-5 text-base leading-7 text-stone-700 sm:p-8">
          <header className="space-y-1">
            <h1 className="text-2xl font-bold text-stone-900">{title}</h1>
            <p className="text-sm text-stone-500">{subtitle}</p>
          </header>

          {children}
        </article>

        <nav
          aria-label="Documentos legais"
          className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-stone-600"
        >
          <Link href="/termos" className="font-semibold underline underline-offset-4">
            Termos de Uso
          </Link>
          <Link href="/privacidade" className="font-semibold underline underline-offset-4">
            Política de Privacidade
          </Link>
        </nav>
      </main>
    </div>
  )
}
