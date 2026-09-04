# Cockpit Upstream

Painel de parede da sala de guerra, lido ao vivo do Jira. Feito para ficar aberto
numa TV, sem ninguém logar, visível para a empresa inteira.

Pedido da Alline em 02/09/2026: contagem da produção do agente de história, horas
estimadas e apontadas, e a leitura de previsibilidade em cima.

## Como funciona

Duas metades, e a separação entre elas é o que permite não ter login:

- **Servidor** (`app/api/cockpit/route.ts`): guarda o token do Jira, roda as JQLs
  e devolve **só número agregado** em JSON. Cache de 60 segundos.
- **Front** (`app/page.tsx`): consome esse JSON e se atualiza sozinho a cada
  minuto. Não fala com o Jira, não conhece token nenhum.

Como a tela mostra apenas contagem, horas e percentual, um link vazado não
entrega backlog, título de história, chave nem nome de pessoa.

## Segredo

O token **nunca** entra no código nem no repositório. Ele vive em variável de
ambiente, e só o servidor enxerga.

```
JIRA_BASE_URL=https://harpix.atlassian.net
JIRA_EMAIL=<conta que gerou o token>
JIRA_API_TOKEN=<token do Jira>
```

Local: copie `.env.example` para `.env.local` e preencha. O `.gitignore` já
bloqueia os dois.

Vercel: `vercel env add JIRA_API_TOKEN production` (o terminal esconde o valor),
e o mesmo para `JIRA_BASE_URL` e `JIRA_EMAIL`.

**Use uma identidade de serviço, não a sua conta pessoal.** Token de pessoa morre
quando a pessoa rotaciona a senha ou sai, e o painel apaga sem ninguém entender
por quê.

## Rodar

```
npm install
npm run dev      # http://localhost:3000
npm run build
```

## As duas armadilhas que estão cravadas no código

Estão comentadas em `lib/consultas.ts` porque custaram caro para descobrir:

1. **`labels != "x"` não casa com item sem rótulo nenhum.** Todo negativo em JQL
   precisa de `labels IS EMPTY OR` do lado, senão devolve zero em silêncio.
2. **A estimativa mora na sub-tarefa, não na história.** Somar tempo em história
   devolve zero sem erro. Por isso `subtarefasWR` filtra por `issuetype =
"Sub-tarefa"`.

E uma regra de tela: **falha de leitura nunca vira zero**. Se o Jira não responde,
o painel mantém o último número bom e mostra um aviso vermelho por cima. Zero
calado num mural é pior que painel apagado, porque parece informação.

## Escopo das consultas

Projeto PTF, escopo da iniciativa `HPX-31` via `portfolioChildIssuesOf`. As JQLs
são as mesmas dos filtros `[UP] 1` a `[UP] 5` no Jira, conferidas na mão.
