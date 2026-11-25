# Licença e responsabilidade

## Licença

Este projeto é distribuído sob a licença **MIT** — veja o arquivo
[LICENSE](LICENSE). Você pode usar, copiar, modificar, publicar e vender o
software, desde que mantenha o aviso de copyright e a licença.

O software é fornecido **"como está"**, sem garantias de qualquer tipo, e os
autores não respondem por danos decorrentes do uso.

## Documentos do serviço publicado

A licença cobre o código. Para quem usa o site publicado, valem os documentos da
aplicação:

- **Termos de Uso** — `/termos`
- **Política de Privacidade (LGPD)** — `/privacidade`

Eles tratam de: declarações do organizador (autorização dos participantes),
riscos do WhatsApp (bloqueio, entrega), doações, propriedade intelectual,
limitação de responsabilidade com ressalva dos direitos do consumidor, dados
pessoais, bases legais, retenção, compartilhamento, transferência internacional,
segurança, incidentes (3 dias úteis, conforme Resolução ANPD 15/2024) e direitos
do titular (art. 18 da LGPD).

## Antes de publicar

1. Preencha os dados em [`lib/legal.ts`](lib/legal.ts): nome público (ou nome
   do projeto), e-mail de contato, e-mail do encarregado, hospedagem e prazo de
   guarda dos logs. Enquanto houver campos vazios ou com "PREENCHER", as páginas
   mostram um aviso vermelho. Não é preciso publicar CPF, CNPJ, endereço ou
   telefone; use um e-mail dedicado ao projeto.
2. Ajuste a retenção de logs do servidor para o prazo informado na Política.
   Os serviços do `docker-compose.yml` já limitam o tamanho dos logs; guarda por
   tempo exige rotação externa (ex.: logrotate).
3. Revise os textos com um advogado, especialmente se o uso for comercial ou
   envolver dados de terceiros em escala.
4. O aceite é obrigatório antes de enviar o sorteio e aparece no diálogo de
   confirmação, com links para os dois documentos.

## Não é aconselhamento jurídico

Estes textos são um ponto de partida técnico, não uma opinião jurídica. Para
produção, recomenda-se revisão por advogado, com atenção à LGPD, ao CDC, ao
Marco Civil e aos termos do WhatsApp.
