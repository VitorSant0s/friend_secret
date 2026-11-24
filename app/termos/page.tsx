import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Termos e aviso de responsabilidade | Amigo Secreto",
  description:
    "Condições de uso do sorteio de amigo secreto: software livre, sem garantias e sem vínculo com o WhatsApp.",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#faf6ee]">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-4">
          <span className="text-3xl" aria-hidden>
            🎁
          </span>
          <div>
            <p className="text-xl font-bold leading-tight text-stone-900">
              Amigo Secreto
            </p>
            <p className="text-sm text-stone-600">
              Termos de uso e responsabilidade
            </p>
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

        <article className="mt-4 space-y-5 rounded-3xl border border-stone-200 bg-white p-5 text-base leading-7 text-stone-700 sm:p-8">
          <h1 className="text-2xl font-bold text-stone-900">
            Termos de uso e aviso de responsabilidade
          </h1>

          <p>
            Ao usar este site, você concorda com as condições abaixo. Se não
            concordar, não use a ferramenta.
          </p>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-stone-900">
              1. O que é este serviço
            </h2>
            <p>
              É uma ferramenta gratuita e de código aberto para organizar
              sorteios de amigo secreto e enviar os nomes por mensagem privada.
              A conexão com o WhatsApp é feita por uma biblioteca não oficial,
              nos mesmos moldes de um cliente alternativo de WhatsApp Web.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-stone-900">
              2. Fornecido como está
            </h2>
            <p>
              O software é distribuído sob a licença MIT, <strong>sem
              garantias</strong> de qualquer tipo. Não há promessa de
              disponibilidade, de funcionamento sem falhas, de entrega das
              mensagens, de acerto do sorteio ou de segurança absoluta.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-stone-900">
              3. Sem vínculo com o WhatsApp
            </h2>
            <p>
              Este projeto não é afiliado, endossado ou patrocinado pelo
              WhatsApp ou pela Meta. O uso está sujeito aos termos do próprio
              WhatsApp, que pode limitar ou bloquear contas que usam automação.
              Esse risco é de quem usa, não do autor da ferramenta.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-stone-900">
              4. Limitação de responsabilidade
            </h2>
            <p>
              Na máxima extensão permitida pela lei, o autor e quem hospeda o
              serviço não respondem por danos diretos ou indiretos, incluindo
              mensagens não entregues, sorteios errados, nomes trocados, presentes
              não recebidos, valores ou doações, perda de dados, bloqueio de
              conta, interrupção do serviço, lucros cessantes ou qualquer
              prejuízo decorrente do uso ou da impossibilidade de usar a
              ferramenta.
            </p>
            <p>
              Você é responsável pelo conteúdo que envia, pelas pessoas que
              inclui no sorteio e pelo uso que faz da sua conta do WhatsApp.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-stone-900">
              5. Doações
            </h2>
            <p>
              Doações são voluntárias e acontecem por PIX direto entre quem doa e
              quem recebe. O software não processa, não intermedeia e não garante
              reembolso de valores.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-stone-900">
              6. Seus dados
            </h2>
            <p>
              Nomes e telefones são usados apenas durante o sorteio e o envio, em
              memória. A sessão do navegador guarda um identificador cifrado; as
              credenciais do WhatsApp ficam no servidor por até 1 hora ou até
              você desconectar. Não há venda nem compartilhamento de dados.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-stone-900">
              7. Direitos garantidos por lei
            </h2>
            <p>
              Nada nestes termos exclui ou limita direitos que a legislação
              aplicável garanta a você, incluindo as normas de defesa do
              consumidor quando forem aplicáveis.
            </p>
          </section>

          <p className="rounded-2xl bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-600">
            Este é um aviso de uso e não constitui aconselhamento jurídico. Para
            uso comercial em escala, revise o texto com um advogado.
          </p>
        </article>
      </main>
    </div>
  )
}
