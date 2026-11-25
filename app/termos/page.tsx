import type { Metadata } from "next"
import Link from "next/link"
import { LegalSection, LegalShell } from "@/app/legal-shell"
import { LEGAL_DATE, LEGAL_VERSION, legalConfig } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Termos de Uso | Amigo Secreto",
  description:
    "Condições de uso do sorteio de amigo secreto: responsabilidades, riscos do WhatsApp, doações e limites de responsabilidade.",
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

export default function TermsPage() {
  const { operatorName, document, city, contactEmail, dpoEmail, minimumAge } =
    legalConfig

  return (
    <LegalShell
      title="Termos de Uso"
      subtitle={`Versão ${LEGAL_VERSION} — ${LEGAL_DATE}`}
    >
      <p>
        Estes Termos regulam o uso do <strong>Amigo Secreto</strong> (o
        “Serviço”), oferecido por {operatorName}, documento {document}, em{" "}
        {city} (“nós”). Ao usar o Serviço, você declara que leu e concorda com
        estes Termos e com a{" "}
        <Link href="/privacidade" className="font-semibold text-emerald-800 underline underline-offset-4">
          Política de Privacidade
        </Link>
        . Se não concordar, não use o Serviço.
      </p>

      <LegalSection title="1. O que é o Serviço">
        <p>
          É uma ferramenta gratuita para organizar sorteios de amigo secreto e
          enviar os nomes por mensagem privada no WhatsApp. O Serviço conecta à
          conta do organizador por uma biblioteca não oficial, no mesmo modelo de
          um cliente alternativo do WhatsApp Web.
        </p>
        <p>
          O resultado do sorteio não é armazenado pelo Serviço. Depois do envio,
          a mensagem é apagada da conversa de quem organizou (menos a mensagem do
          próprio amigo secreto do organizador), e quem recebeu continua com o
          nome.
        </p>
        <p>
          O Serviço é gratuito. Contribuições por PIX são opcionais, como
          explicado no item 6.
        </p>
      </LegalSection>

      <LegalSection title="2. Quem pode usar">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Pessoas com {minimumAge} anos ou mais. Menores de idade só podem usar
            com autorização e supervisão do responsável legal.
          </li>
          <li>
            Quem tem uma conta válida no WhatsApp e um celular para ler o código
            de conexão.
          </li>
          <li>
            Quem aceita que cada navegador conectado conta como um aparelho na
            conta do WhatsApp, respeitando os limites definidos pelo próprio
            WhatsApp.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Suas declarações como organizador">
        <p>Ao usar o Serviço, você declara e se responsabiliza por:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            ter avisado as pessoas incluídas no sorteio e ter autorização para
            usar o nome e o número delas para essa finalidade;
          </li>
          <li>
            ter autorização das pessoas de fora do grupo cujos nomes você
            digitar;
          </li>
          <li>
            escolher corretamente os participantes, os representantes e a pessoa
            que vai avisar quem não tem celular;
          </li>
          <li>
            não usar o Serviço para spam, assédio, discriminação, fraude,
            conteúdo ilícito ou qualquer finalidade proibida por lei;
          </li>
          <li>
            entender que as mensagens saem da sua conta do WhatsApp e que o
            WhatsApp pode restringir ou banir contas por uso automatizado;
          </li>
          <li>
            entregar os presentes e resolver os combinados do grupo, que são
            responsabilidade dos participantes.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Uso aceitável">
        <p>É proibido:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            usar o Serviço para mensagens em massa, automáticas ou não
            solicitadas;
          </li>
          <li>
            enviar mensagens para pessoas que não participam do sorteio ou que
            pediram para não receber contato;
          </li>
          <li>
            usar listas de terceiros, dados obtidos ilegalmente ou burlar limites
            técnicos do Serviço ou do WhatsApp;
          </li>
          <li>
            incluir menores de idade sem autorização do responsável legal;
          </li>
          <li>
            tentar acessar sessões de outras pessoas, interferir no Serviço ou
            usá-lo para prejudicar terceiros.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. WhatsApp e serviços de terceiros">
        <p>
          O Serviço <strong>não é afiliado, endossado ou patrocinado</strong> pelo
          WhatsApp ou pela Meta. A conexão está sujeita aos termos e às políticas
          do WhatsApp, que podem limitar, restringir ou encerrar contas que usem
          automação ou clientes não oficiais.
        </p>
        <p>
          Não garantimos que as mensagens serão entregues, lidas ou mantidas. A
          exclusão da mensagem na conversa de quem enviou depende do funcionamento
          do WhatsApp e pode não ser imediata. O Serviço não responde por decisões,
          falhas ou indisponibilidade do WhatsApp ou da Meta.
        </p>
      </LegalSection>

      <LegalSection title="6. Doações">
        <p>
          As contribuições são <strong>voluntárias</strong> e feitas por PIX
          diretamente entre quem doa e quem recebe. Não há contraprestação,
          vantagem, sorteio ou obrigação de fornecer o Serviço em troca da doação.
        </p>
        <p>
          O Serviço não processa pagamentos, não intermedeia valores, não armazena
          dados bancários e não garante reembolso. A doação não é compra de
          produto ou serviço.
        </p>
      </LegalSection>

      <LegalSection title="7. Propriedade intelectual">
        <p>
          O código-fonte é aberto sob a licença MIT, disponível no repositório do
          projeto. O nome, a identidade visual, os textos e a documentação do
          Serviço são protegidos e não podem ser usados de forma que sugira
          vínculo, endosso ou parceria sem autorização.
        </p>
        <p>
          O conteúdo que você envia é de sua responsabilidade. Você nos concede
          apenas a licença necessária para transmitir esse conteúdo pelo Serviço.
        </p>
      </LegalSection>

      <LegalSection title="8. Disponibilidade e mudanças">
        <p>
          O Serviço é fornecido “como está”. Não há garantia de disponibilidade
          contínua, de desempenho ou de correção de falhas. Podemos alterar,
          suspender ou encerrar o Serviço a qualquer momento, inclusive por
          manutenção, segurança ou mudanças no WhatsApp.
        </p>
      </LegalSection>

      <LegalSection title="9. Limitação de responsabilidade">
        <p>
          Na máxima extensão permitida pela lei, não respondemos por danos diretos
          ou indiretos decorrentes do uso ou da impossibilidade de usar o Serviço,
          incluindo: bloqueio ou restrição da conta do WhatsApp; mensagens não
          entregues, atrasadas ou lidas antes da exclusão; sorteios incorretos por
          dados errados informados pelo organizador; presentes não entregues ou
          trocados; doações; perda de dados; lucros cessantes; ou atos de
          participantes e terceiros.
        </p>
        <p>
          Você é responsável pelos dados que insere, pelas pessoas que inclui e
          pelo uso da sua conta. Se o uso indevido causar reclamação de terceiro,
          você concorda em nos manter indeneizados, na medida permitida pela lei.
        </p>
        <p>
          Nada nestes Termos exclui direitos garantidos por lei, inclusive os do
          consumidor, nem afasta responsabilidade por dolo ou culpa grave.
        </p>
      </LegalSection>

      <LegalSection title="10. Privacidade">
        <p>
          O tratamento de dados está descrito na{" "}
          <Link href="/privacidade" className="font-semibold text-emerald-800 underline underline-offset-4">
            Política de Privacidade
          </Link>
          . Para os dados dos participantes do grupo, o organizador é o
          controlador; nós atuamos como operadores, conforme explicado naquela
          política.
        </p>
      </LegalSection>

      <LegalSection title="11. Suspensão e encerramento">
        <p>
          Podemos suspender ou encerrar o acesso em caso de violação destes
          Termos, risco à segurança, determinação legal ou uso que possa prejudicar
          terceiros. Você pode encerrar o uso a qualquer momento, desconectando o
          WhatsApp na tela.
        </p>
      </LegalSection>

      <LegalSection title="12. Alterações destes Termos">
        <p>
          Podemos atualizar estes Termos. A versão vigente fica nesta página, com
          data e número de versão. Mudanças relevantes serão destacadas. O uso do
          Serviço depois da publicação significa que você aceita a nova versão.
        </p>
      </LegalSection>

      <LegalSection title="13. Contato">
        <p>
          Dúvidas sobre estes Termos: <EmailLink value={contactEmail} />.
          Assuntos de privacidade e dados pessoais: <EmailLink value={dpoEmail} />.
        </p>
      </LegalSection>

      <LegalSection title="14. Lei e foro">
        <p>
          Estes Termos são regidos pelas leis brasileiras, em especial a LGPD
          (Lei nº 13.709/2018), o Marco Civil da Internet (Lei nº 12.965/2014) e o
          Código de Defesa do Consumidor (Lei nº 8.078/1990), quando aplicável.
        </p>
        <p>
          Antes de qualquer medida judicial, as partes tentarão resolver o assunto
          de forma amigável. Fica eleito o foro do domicílio do consumidor quando
          a lei assim exigir; nos demais casos, a comarca de {city}.
        </p>
      </LegalSection>

      <LegalSection title="15. Disposições gerais">
        <p>
          Se alguma cláusula for considerada inválida, as demais continuam
          valendo. Estes Termos não criam sociedade, representação, emprego ou
          vínculo comercial entre você e nós.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
