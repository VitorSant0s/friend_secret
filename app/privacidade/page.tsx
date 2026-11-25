import type { Metadata } from "next"
import Link from "next/link"
import { LegalSection, LegalShell } from "@/app/legal-shell"
import { LEGAL_DATE, LEGAL_VERSION, legalConfig } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Política de Privacidade | Amigo Secreto",
  description:
    "Como o sorteio de amigo secreto trata dados pessoais, por quanto tempo guarda, com quem compartilha e como exercer seus direitos.",
}

function EmailLink({ value }: { value: string }) {
  const usable = value.includes("@") && !value.toUpperCase().startsWith("PREENCHER")
  return usable ? (
    <a className="font-semibold text-emerald-800 underline underline-offset-4" href={`mailto:${value}`}>
      {value}
    </a>
  ) : (
    <span className="font-semibold">{value}</span>
  )
}

export default function PrivacyPage() {
  const { operatorName, document, city, contactEmail, dpoEmail, hosting, logRetention } =
    legalConfig

  return (
    <LegalShell
      title="Política de Privacidade"
      subtitle={`Versão ${LEGAL_VERSION} — ${LEGAL_DATE}`}
    >
      <p>
        Esta Política explica como o <strong>Amigo Secreto</strong> trata dados
        pessoais, em conformidade com a LGPD (Lei nº 13.709/2018). Ela vale para
        quem organiza o sorteio e para quem participa do grupo incluído nele.
      </p>

      <LegalSection title="1. Quem é responsável pelos dados">
        <p>
          Para os dados de cadastro e de uso do organizador (número conectado,
          sessão e registros de acesso), o controlador é{" "}
          <strong>{operatorName}</strong>, documento {document}, em {city}.
          Contato: <EmailLink value={contactEmail} />. Encarregado de dados
          (DPO): <EmailLink value={dpoEmail} />.
        </p>
        <p>
          Para os dados das pessoas incluídas no sorteio (nomes e identificadores
          do WhatsApp), o <strong>organizador é o controlador</strong>: é ele quem
          decide quem entra, para qual finalidade e como avisa os participantes.
          Nós atuamos como <strong>operadores</strong>, tratando esses dados apenas
          para executar o sorteio e enviar as mensagens, seguindo as instruções do
          organizador e esta Política.
        </p>
        <p>
          Se você é participante e quer exercer seus direitos, procure primeiro o
          organizador do sorteio. Também atendemos pedidos na medida das nossas
          obrigações legais.
        </p>
      </LegalSection>

      <LegalSection title="2. Quais dados tratamos">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Do organizador:</strong> número do WhatsApp conectado,
            credenciais da sessão, identificador de sessão e registros de acesso
            (endereço IP, data e hora, navegador).
          </li>
          <li>
            <strong>Dos participantes:</strong> nome exibido no WhatsApp,
            identificador ou número usado pelo WhatsApp e nomes digitados para
            pessoas de fora do grupo.
          </li>
          <li>
            <strong>Não tratamos:</strong> CPF, e-mail, endereço, dados bancários,
            dados de pagamento, conteúdo de conversas ou dados sensíveis.
          </li>
        </ul>
        <p>
          As mensagens enviadas são definidas pelo organizador. O Serviço as
          transmite e não guarda o texto nem o resultado do sorteio em banco de
          dados.
        </p>
      </LegalSection>

      <LegalSection title="3. Como os dados chegam">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Da conexão com o WhatsApp, feita pelo organizador por meio da
            biblioteca não oficial usada pelo Serviço.
          </li>
          <li>Dos nomes que o organizador digita para pessoas de fora do grupo.</li>
          <li>Dos registros automáticos do servidor, ao acessar o site.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Para que usamos e com qual base legal">
        <div className="overflow-x-auto">
          <table className="mt-2 w-full min-w-[38rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-stone-900">
                <th className="py-2 pr-3 font-semibold">Dado</th>
                <th className="py-2 pr-3 font-semibold">Finalidade</th>
                <th className="py-2 pr-3 font-semibold">Base legal (LGPD)</th>
                <th className="py-2 font-semibold">Retenção</th>
              </tr>
            </thead>
            <tbody className="align-top">
              <tr className="border-b border-stone-100">
                <td className="py-2 pr-3">Nome e identificador dos participantes</td>
                <td className="py-2 pr-3">Fazer o sorteio e enviar o nome</td>
                <td className="py-2 pr-3">Execução do serviço (art. 7º, V), com autorização dada pelo organizador</td>
                <td className="py-2">Memória, durante a sessão; não é gravado</td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="py-2 pr-3">Nomes de pessoas de fora do grupo</td>
                <td className="py-2 pr-3">Incluir no sorteio e avisar pelo representante</td>
                <td className="py-2 pr-3">Execução do serviço (art. 7º, V)</td>
                <td className="py-2">Memória, durante a sessão</td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="py-2 pr-3">Número conectado e credenciais</td>
                <td className="py-2 pr-3">Manter a conexão e enviar as mensagens</td>
                <td className="py-2 pr-3">Execução do serviço (art. 7º, V)</td>
                <td className="py-2">Até 1 hora ou ao desconectar</td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="py-2 pr-3">Identificador de sessão no navegador</td>
                <td className="py-2 pr-3">Manter a sessão daquele navegador</td>
                <td className="py-2 pr-3">Execução do serviço e legítimo interesse (art. 7º, IX)</td>
                <td className="py-2">1 hora, cifrado</td>
              </tr>
              <tr className="border-b border-stone-100">
                <td className="py-2 pr-3">IP, data/hora e navegador (logs)</td>
                <td className="py-2 pr-3">Segurança, prevenção a abuso e cumprimento de obrigação legal</td>
                <td className="py-2 pr-3">Legítimo interesse (art. 7º, IX) e obrigação legal (art. 7º, II)</td>
                <td className="py-2">{logRetention}</td>
              </tr>
              <tr>
                <td className="py-2 pr-3">Doações por PIX</td>
                <td className="py-2 pr-3">Gerar o QR code; não tratamos dados de pagamento</td>
                <td className="py-2 pr-3">—</td>
                <td className="py-2">Não se aplica</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Não usamos dados para publicidade, perfilamento ou decisões
          automatizadas sobre direitos. O sorteio é aleatório e não avalia
          comportamento.
        </p>
      </LegalSection>

      <LegalSection title="5. Com quem compartilhamos">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>WhatsApp/Meta:</strong> a conexão e o envio das mensagens
            passam pela plataforma, sujeitos aos termos e às políticas dela.
          </li>
          <li>
            <strong>Hospedagem:</strong> {hosting}. Os provedores tratam dados
            apenas para operar a infraestrutura.
          </li>
          <li>
            <strong>Autoridades:</strong> quando houver ordem judicial ou
            obrigação legal.
          </li>
        </ul>
        <p>
          Não vendemos dados pessoais, não cedemos para marketing e não usamos os
          dados para finalidade diferente das descritas aqui.
        </p>
      </LegalSection>

      <LegalSection title="6. Transferência internacional">
        <p>
          Os provedores de hospedagem e de infraestrutura podem processar dados
          fora do Brasil. Quando isso ocorrer, a transferência segue o art. 33 da
          LGPD, com garantias contratuais e medidas de segurança dos provedores.
          Ao usar o Serviço, você está ciente dessa possibilidade.
        </p>
      </LegalSection>

      <LegalSection title="7. Por quanto tempo guardamos">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Sessão do WhatsApp e credenciais: até <strong>1 hora</strong> após a
            conexão, ou até você desconectar. Depois são apagadas.
          </li>
          <li>
            Dados do sorteio: apenas em memória, durante a sessão; descartados no
            fim do envio ou da sessão.
          </li>
          <li>
            Identificador de sessão no navegador: cifrado, apagado em 1 hora ou
            quando você limpa os dados do navegador.
          </li>
          <li>Mensagens enviadas: ficam no WhatsApp dos envolvidos, não aqui.</li>
          <li>Registros de acesso: {logRetention}.</li>
        </ul>
        <p>
          Depois dos prazos, os dados são eliminados ou anonimizados, salvo quando
          a lei exigir guarda por mais tempo.
        </p>
      </LegalSection>

      <LegalSection title="8. Segurança">
        <p>
          Adotamos medidas técnicas e administrativas para proteger os dados,
          incluindo HTTPS, sessão do navegador cifrada com AES-GCM e chave não
          exportável, credenciais isoladas por sessão, expiração automática e
          limite de sessões simultâneas. Nenhum sistema é totalmente seguro;
          falhas e incidentes serão tratados conforme o item 9.
        </p>
      </LegalSection>

      <LegalSection title="9. Incidentes de segurança">
        <p>
          Se ocorrer um incidente que possa causar risco ou dano relevante aos
          titulares, comunicaremos a ANPD e as pessoas afetadas em até{" "}
          <strong>3 dias úteis</strong> a contar do conhecimento, nos termos da
          Resolução CD/ANPD nº 15/2024, com as informações e medidas cabíveis. Os
          prazos são contados em dobro para agentes de pequeno porte.
        </p>
      </LegalSection>

      <LegalSection title="10. Seus direitos">
        <p>
          Nos termos do art. 18 da LGPD, você pode pedir: confirmação de
          tratamento; acesso aos dados; correção; anonimização, bloqueio ou
          eliminação de dados desnecessários ou tratados irregularmente;
          portabilidade; eliminação de dados tratados com consentimento;
          informação sobre compartilhamento; informação sobre a possibilidade de
          não consentir; e revogação do consentimento.
        </p>
        <p>
          Para exercer, escreva para <EmailLink value={dpoEmail} /> ou{" "}
          <EmailLink value={contactEmail} />. Respondemos em até 15 dias, sem
          custo, salvo prazo legal diferente. Se você for participante do sorteio,
          o pedido deve ser dirigido primeiro ao organizador, que é o controlador
          desses dados.
        </p>
        <p>
          Você também pode apresentar reclamação à ANPD (Autoridade Nacional de
          Proteção de Dados).
        </p>
      </LegalSection>

      <LegalSection title="11. Cookies e armazenamento local">
        <p>
          Não usamos cookies de publicidade, rastreamento ou análise de
          comportamento. O navegador guarda apenas o identificador da sessão,
          cifrado, no <code>localStorage</code>, com a chave no{" "}
          <code>IndexedDB</code>. Limpar os dados do navegador encerra a sessão.
        </p>
        <p>
          O servidor registra acessos (IP, data/hora e navegador) para segurança e
          funcionamento, pelo prazo informado no item 7.
        </p>
      </LegalSection>

      <LegalSection title="12. Crianças e adolescentes">
        <p>
          O Serviço é destinado a maiores de {legalConfig.minimumAge} anos.
          Menores só podem participar com autorização e acompanhamento do
          responsável legal, e o organizador é responsável por obter essa
          autorização. Se identificarmos uso irregular, podemos remover os dados e
          suspender o acesso.
        </p>
      </LegalSection>

      <LegalSection title="13. Alterações desta Política">
        <p>
          Podemos atualizar esta Política. A versão vigente fica nesta página, com
          data e número de versão. Mudanças relevantes serão destacadas. O uso
          depois da publicação significa que você tomou conhecimento da nova
          versão.
        </p>
      </LegalSection>

      <LegalSection title="14. Contato">
        <p>
          Privacidade e dados pessoais: <EmailLink value={dpoEmail} />. Assuntos
          gerais: <EmailLink value={contactEmail} />. Responsável:{" "}
          {operatorName}, {city}.
        </p>
      </LegalSection>

      <LegalSection title="15. Legislação">
        <p>
          Esta Política é regida pela LGPD e pelas demais leis brasileiras
          aplicáveis. Em caso de dúvida, consulte também os{" "}
          <Link href="/termos" className="font-semibold text-emerald-800 underline underline-offset-4">
            Termos de Uso
          </Link>
          .
        </p>
      </LegalSection>
    </LegalShell>
  )
}
