# 🎁 Amigo Secreto

Sorteio de amigo secreto para um grupo do WhatsApp, feito para rodar **no seu
computador**. Ele conecta na sua conta como o WhatsApp Web, lê os participantes
do grupo, faz o sorteio e envia uma mensagem privada para cada pessoa.

Cada navegador tem a **própria sessão**, independente: dois navegadores são dois
aparelhos conectados, cada um com seu QR code. A sessão é guardada no servidor
até a pessoa desconectar ou completar **1 hora** — e essa hora começa a contar no
momento em que o QR code é lido.

Quem não tem celular continua participando normalmente: o nome do amigo secreto
dessa pessoa é entregue a um **representante**, que avisa pessoalmente quem ela
tirou. A pessoa sem celular compra e entrega o presente dela como todo mundo.

## Requisitos

- Node.js 20 ou mais novo (`node -v`)
- WhatsApp no celular, para escanear o QR code

## Como rodar

```bash
npm install
npm run dev
```

Abra <http://localhost:3000> no navegador.

## Como usar

1. **Conectar o WhatsApp** — clique em *Conectar WhatsApp* e escaneie o QR code
   em *Aparelhos conectados*, no celular.
2. **Escolher o grupo** — a lista vem direto do seu WhatsApp.
3. **Marcar as exceções** — desmarque quem não participa do sorteio. Para quem
   não tem celular, desmarque *tem celular* e escolha quem vai avisar essa
   pessoa. Para alguém que nem está no grupo, use **Pessoa de fora do grupo**:
   digite o nome e escolha quem avisa. Ela participa do sorteio normalmente e o
   nome dela chega só ao representante, que avisa pessoalmente.
4. **Data e envio** — opcionalmente informe o dia da entrega, confira a prévia
   das mensagens e clique em *Sortear e enviar*.

O sorteio precisa de pelo menos 4 participantes e garante que ninguém tira a si mesmo e que não se formam pares
trocados (A tira B e B tira A).

As mensagens saem com um intervalo de 2,5 a 5 segundos entre elas. O resultado
do sorteio **não é salvo em lugar nenhum**: se algo falhar, é preciso sortear de
novo.

### Privacidade do sorteio

Depois de cada envio, o motor usa o "apagar para mim" do WhatsApp: a mensagem
sai da **sua conversa**, mas o participante continua com o nome que recebeu.
Assim o organizador não fica sabendo quem tirou quem.

- A mensagem some da sua conversa em alguns segundos, quando o WhatsApp
  sincroniza. Se você estiver com o aplicativo aberto, pode vê-la de relance e a
  notificação do celular pode aparecer no momento do envio.
- A mensagem que é o **seu próprio amigo secreto** não é apagada: ela fica na
  sua conversa, para você saber quem tirou. As demais são ocultadas.
- Se o "apagar para mim" falhar para alguém, a tela avisa na lista e no resumo;
  nesse caso a mensagem fica na sua conversa e pode ser apagada à mão.
- Isso vale só para os envios feitos por este programa, e não apaga nada no
  aparelho de quem recebeu.

## Doações por PIX (opcional)

No fim da página existe um bloco de contribuição: R$ 1 por padrão, com opções de
R$ 1, 2, 5, 10 e um campo para outro valor. O QR code e o código "copia e cola"
são gerados na hora, com o valor escolhido já preenchido.

Para ativar, crie um arquivo `.env.local` na pasta do projeto:

```bash
PIX_KEY=sua-chave-pix
PIX_NAME=Seu Nome
PIX_CITY=Sua Cidade
```

A chave pode ser telefone, e-mail, CPF/CNPJ ou chave aleatória. Depois reinicie o
`npm run dev`. Sem essas variáveis o bloco aparece com o aviso de que as doações
não estão configuradas. Nenhuma cobrança é feita automaticamente: a pessoa paga
no aplicativo do banco dela.

## O que fica guardado

- **No navegador:** apenas um identificador aleatório da sessão, cifrado com
  AES-GCM. A chave é uma chave não exportável guardada no IndexedDB daquele
  navegador. Esse bilhete sozinho não dá acesso a nada, e ele é apagado ao
  completar 1 hora (ou ao clicar em *Desconectar*).
- **No servidor:** as credenciais do WhatsApp ficam em
  `.whatsapp-sessions/<sessão>` (ignorada pelo git), uma pasta por navegador, e
  um arquivo de controle com o início e o fim da validade. Ao escanear, o
  WhatsApp grava as credenciais nessa pasta; ao expirar ou desconectar, o
  servidor encerra a conexão e apaga tudo. Sem credenciais, o WhatsApp pede o QR
  code de novo.
- **Reinício do motor:** a sessão e a validade continuam no disco. Depois de
  pareada, a conexão volta sozinha no próximo acesso, sem novo QR code.
- O sorteio em si existe apenas na memória durante o envio.
- A chave PIX (se configurada) fica só no servidor e vira um QR code; nada é
  cobrado automaticamente.

## Aviso

Cada navegador conectado conta como um aparelho no WhatsApp, e o WhatsApp
permite cerca de 4 aparelhos por conta. Esse limite é por conta, não por
servidor: seis pessoas, cada uma com o próprio celular, são seis contas
diferentes e podem usar ao mesmo tempo. O limite de sessões do servidor é
configurado em `MAX_SESSIONS`.

A conexão usa a biblioteca não oficial Baileys, a mesma tecnologia que outros
clientes alternativos usam. Não é a API oficial do WhatsApp. Para um uso
esporádico, como um amigo secreto por ano, o risco de bloqueio é baixo, mas
existe. Não use para disparos em massa.

## Licença, termos e privacidade

O código é aberto sob a licença **MIT** (veja [LICENSE](LICENSE)): pode usar,
copiar, modificar e vender, mantendo o aviso de copyright. O software é
fornecido "como está", sem garantias.

O site publicado tem dois documentos, com aceite obrigatório antes de enviar o
sorteio:

- **Termos de Uso** em `/termos`: declarações do organizador, uso aceitável,
  riscos do WhatsApp, doações, propriedade intelectual e limitação de
  responsabilidade.
- **Política de Privacidade** em `/privacidade`: controlador e operador, dados
  tratados, bases legais, retenção, compartilhamento, segurança, incidentes e
  direitos do titular (LGPD).

Antes de colocar em produção, preencha em [`lib/legal.ts`](lib/legal.ts) o nome
público, o e-mail de contato, o e-mail do encarregado, a hospedagem e o prazo de
logs. Enquanto faltar algum, as páginas mostram um aviso vermelho. O guia está
em [DISCLAIMER.md](DISCLAIMER.md).

Não é necessário publicar CPF, CNPJ, endereço ou telefone. A LGPD exige a
identificação e o contato do controlador; use um e-mail dedicado ao projeto em
vez do pessoal. Se você não quiser aparecer nem pelo nome, a alternativa é
operar por uma pessoa jurídica ou não publicar o serviço.

Ajuste a guarda dos logs para o prazo informado. O compose limita o tamanho dos
logs; para prazo por tempo, use rotação externa (logrotate).

Não é aconselhamento jurídico: para produção, revise com um advogado.

## Publicar: Netlify (site) + VPS (motor)

A conexão do WhatsApp precisa de um processo sempre ligado, com disco e
WebSocket. Por isso o site no Netlify é só a interface, e o motor fica numa VPS.

```
navegador → Netlify (interface estática)
          → VPS (API + WhatsApp + PIX)
```

### 1. Motor na VPS

Precisa de uma VPS com Docker e Docker Compose, um subdomínio (por exemplo
`api.seudominio.com`) apontando para o IP da VPS, e as portas 80 e 443 abertas.

```bash
git clone <seu-repositorio> amigo-secreto
cd amigo-secreto
cp .env.example .env
# edite o .env: DOMAIN, CERTBOT_EMAIL, ALLOWED_ORIGIN, PIX_KEY, PIX_NAME, PIX_CITY
docker compose up -d --build
docker compose logs -f app
```

O nginx emite o certificado com o Let's Encrypt e renova sozinho. Na primeira
subida, o DNS do domínio já precisa apontar para a VPS e as portas 80 e 443
precisam estar abertas — senão a emissão falha e o nginx reinicia. Confira com:

```bash
curl https://api.seudominio.com/api/whatsapp/status
```

- As sessões ficam no volume `sessions` e sobrevivem a reinícios e atualizações.
- A API responde com `Cache-Control: no-store`, devolve o número conectado
  mascarado (`+55 11 *****-1234`) e não libera CORS sem `ALLOWED_ORIGIN`.
- **Uma instância só.** Não escale horizontalmente: cada instância teria
  conexões e arquivos separados.
- Atualizar: `git pull && docker compose up -d --build`.
- Firewall: deixe exposto apenas 22, 80 e 443.
- Se o certificado não sair: `docker compose logs nginx`, confira
  `dig +short api.seudominio.com` e as portas 80/443, depois rode
  `docker compose up -d`.
- O motor aceita no máximo `MAX_SESSIONS` sessões ao mesmo tempo; acima disso
  responde com "muitas sessões abertas", protegendo a memória da máquina.

### 2. Site no Netlify

1. Conecte o mesmo repositório no Netlify. O `netlify.toml` já define o build
   (`npm run build:netlify`) e a pasta publicada (`out`).
2. Em *Site settings → Environment variables*, crie
   `NEXT_PUBLIC_API_URL=https://api.seudominio.com` (a URL do motor).
3. Faça o deploy e copie a URL final do site.
4. Volte ao `.env` da VPS, coloque essa URL em `ALLOWED_ORIGIN` e rode
   `docker compose up -d` para liberar o CORS. Com `ALLOWED_ORIGIN` vazio, a API
   só responde ao próprio domínio; não use `*` em produção.
5. Abra o site publicado e escaneie o QR code.

O build do Netlify gera um site estático e tira temporariamente as rotas de API
do pacote, porque exportação estática não aceita servidor. Sorteio, sessão e
doação continuam funcionando no navegador, chamando o motor na VPS.

### 3. Rodando local

Sem `NEXT_PUBLIC_API_URL`, o site conversa com o próprio servidor:

```bash
npm run dev
```

## Desenvolvimento

```bash
npm test               # sorteio, mensagens, PIX e sessão
npm run lint
npm run build          # servidor (VPS)
npm run build:netlify  # site estático em out/ (precisa de NEXT_PUBLIC_API_URL)
```

### Teste de sessões simultâneas

Com o motor rodando e um limite definido:

```bash
MAX_SESSIONS=6 npm start

# em outro terminal
USERS=6 CAP=6 node scripts/security-test.mjs
```

O teste cria seis sessões ao mesmo tempo e confere que: cada uma recebe um QR
code diferente, todas têm validade própria, a sétima é recusada com 429,
desconectar uma não derruba as outras e as pastas de credenciais são separadas.
Use `KEEP=1` para não apagar as sessões no fim.

O pareamento de verdade exige um celular por sessão; o teste valida o servidor,
os limites e o isolamento.
