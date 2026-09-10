# Área da gestora, desenho

Branch `feature/area-gestora`, a partir de `develop`.

## O que é

Não é um formulário de preenchimento. É um **construtor de painel**: a gestora
cria a faixa, nomeia, descreve, escolhe o tipo de card, aponta a fonte de dados,
aplica filtro e publica. Sem código, sem deploy, sem nós no meio.

Nesta primeira versão **todo dado é manual**. A leitura automática do Jira volta
depois, e o modelo já nasce preparado para isso: um conjunto de dados é uma
tabela nomeada com campos tipados, e de onde vieram as linhas é detalhe de
origem, não de estrutura.

## Modelo de dados

Sete tabelas, prefixo por domínio, no padrão harpix (minúsculo, PK identity).

### Domínio `dad_`, os dados

| Tabela         | O que guarda                                                                         |
| -------------- | ------------------------------------------------------------------------------------ |
| `dad_conjunto` | Uma tabela nomeada pela gestora. Ex.: Documentações de API, Metas da semana, Riscos. |
| `dad_campo`    | As colunas daquele conjunto, com tipo: texto, número, data, opção, booleano.         |
| `dad_registro` | As linhas, em `jsonb` chaveado pela `chave` do campo.                                |

O **tipo do campo é a peça central do construtor**. É ele que decide quais
operadores de filtro aparecem, quais métricas fecham conta e quais gráficos
fazem sentido. Sem tipo, o construtor ofereceria soma para texto e o painel
mostraria zero sem reclamar.

### Domínio `pnl_`, o desenho

| Tabela       | O que guarda                                                                           |
| ------------ | -------------------------------------------------------------------------------------- |
| `pnl_painel` | O painel: slug, nome, descrição, publicado, e `controles`, a barra de filtros do topo. |
| `pnl_faixa`  | O container: título, descrição, número de colunas, ordem.                              |
| `pnl_card`   | O cartão: tipo, título, **definição**, `config` e ordem.                               |

### Domínio `seg_`

`seg_perfil` guarda o nome legível de quem edita, para o painel poder dizer
"atualizado por Alline em 10/09" em vez de mostrar um uuid.

## Duas regras cravadas no schema

**1. Card sem definição não passa.** `pnl_card.definicao` existe porque número
sem frase que o explique foi exatamente o que produziu os indicadores
irreproduzíveis do painel anterior, o 1,72x que era 0,91x e as "semanas para
acabar 1,1" num plano que ia até novembro. O construtor exige a frase antes de
deixar salvar.

**2. Todo dado manual carrega autor e data.** `atualizado_por` e `atualizado_em`
aparecem na tela, não só no banco. Em duas semanas ninguém lembra se aquele
número foi medido ou lembrado, e é aí que opinião vira indicador.

## Tipos de card

| Tipo        | Para que serve                                   | Config mínima                              |
| ----------- | ------------------------------------------------ | ------------------------------------------ |
| `numero`    | KPI grande, com variação contra período anterior | conjunto, métrica, campo                   |
| `progresso` | Realizado contra meta                            | conjunto, métrica, campo da meta           |
| `barra`     | Comparar categorias                              | conjunto, campo de categoria, métrica      |
| `linha`     | Série no tempo                                   | conjunto, campo de data, métrica           |
| `pizza`     | Composição de um todo                            | conjunto, campo de categoria, métrica      |
| `tabela`    | A lista crua, com colunas escolhidas             | conjunto, campos visíveis                  |
| `lista`     | Itens com status, tipo riscos e bloqueios        | conjunto, campo de título, campo de status |
| `texto`     | Nota de leitura da gestão                        | só o texto                                 |

## Métricas

`contagem`, `soma`, `média`, `mínimo`, `máximo`, `último valor`, `distintos`.

Cada uma só é oferecida para tipo de campo compatível. Soma de texto não existe
no menu, então não pode ser escolhida por engano.

## Filtros

Dois níveis, e é isso que responde ao "filtros funcionais" e ao "comparativo com
datas anteriores".

**Filtro do card.** Lista de `{campo, operador, valor}`, com operadores por
tipo: texto tem `é`, `contém`, `começa com`, `está em`; número e data têm `=`,
`≠`, `>`, `≥`, `<`, `≤`, `entre`; opção tem `é` e `está em`; booleano tem `é`.

**Controle do painel.** Uma barra no topo com um seletor de período e presets
(esta semana, semana passada, últimos 7 dias, mês, intervalo livre). Cada card
declara qual campo de data o período recorta. Card que não declara ignora o
período, e a tela diz isso, para ninguém achar que o filtro pegou.

**Comparação.** Quando o card tem período, ele calcula sozinho a janela anterior
de mesmo tamanho e mostra a variação. Métrica de estoque, tipo "quantos estão
bloqueados hoje", não ganha variação e o construtor não deixa ligar, porque
comparar estoque com o passado exige um histórico que ninguém está guardando.

## Fluxo da gestora

1. **Entrar.** `/entrar`, tela padrão harpix, e-mail e senha.
2. **Dados.** Cria o conjunto, define os campos e digita as linhas numa grade.
   Colar direto do Excel preenche o bloco inteiro, que é o único jeito realista
   de entrar com 161 conectores.
3. **Painel.** Cria o painel, adiciona faixa, adiciona card, escolhe tipo,
   aponta conjunto, escolhe métrica, aplica filtro, escreve a definição.
4. **Publicar.** O painel vira `/p/<slug>`, aberto, sem login.

## Rotas

| Rota                       | Quem vê                                 |
| -------------------------- | --------------------------------------- |
| `/`                        | Cockpit do Jira, como já é hoje         |
| `/entrar`                  | Público                                 |
| `/gestao`                  | Só logado: lista de painéis e conjuntos |
| `/gestao/dados/[conjunto]` | Só logado: grade de digitação           |
| `/gestao/painel/[id]`      | Só logado: construtor                   |
| `/p/[slug]`                | Público, o painel montado               |

## Segurança

- RLS ligada nas sete tabelas. Leitura pública, escrita só autenticada.
- **Consequência que tem que ficar dita:** quem tiver a URL do projeto e a chave
  `anon` lê tudo que for digitado ali. A leitura é pública porque o cockpit
  precisa abrir sem login, que é o requisito desde o começo. Então não digitar
  nada que não possa ser lido por quem tiver o link.
- A chave `service_role` **não entra no repositório** e não é necessária para o
  funcionamento. Ela foi exposta em conversa e precisa ser rotacionada.
- Variáveis: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no
  `.env.local`, preenchidas à mão.

## Stack

A mesma dos outros fronts da harpix, conferida em `hpx-svc-front`,
`hpx-vdm-front` e `hpx-rgt-web`: Tailwind v4, React Hook Form, Zod 4,
`@hookform/resolvers`, TanStack Query, recharts, lucide-react, sonner.

Fica de fora só o `next-i18next`: este painel é pt-BR e não tem segundo idioma
previsto, e i18n sem segundo idioma é cerimônia que atrasa cada tela.

## Design system

Extraído de `hpx-svc-front/src/styles/globals.css`, sem inventar valor:

- Fonte **Baloo 2** em tudo
- `primary #EF5727`, `secondary #FEF4F1`
- Cinzas: `100 #FAFAFA`, `200 #F4F4F6`, `300 #CCCCCC`, `400 #76767E`,
  `500 #45454A`, `600 #212123`
- `success #00A781`, `error #FF3D41`, `alert #FBBC75`, `info #A7CAF1`
- `radius 0.625rem`, `shadow-sm 1px 1px 8px rgba(0,0,0,.12)`,
  `shadow-md 0 4px 16px 4px rgba(0,0,0,.08)`
- Fundo branco, texto `grey-500`

Login segue o `AuthLayout` da esteira: card centralizado em `grey-200`,
`max-w-md`, `rounded-xl`, borda e `shadow-md`, marca **harpix** minúscula em
laranja no topo, e a estrutura `features/auth/components/login-form/` com
`login-form.tsx`, `login-schema.ts` e `use-login-form.ts`.

## Ordem de construção

1. Migration no Supabase. **Feito.**
2. Tailwind v4 com os tokens harpix, e as primitivas de UI.
3. Login e sessão.
4. Grade de dados com colar de planilha.
5. Construtor de painel.
6. Render público em `/p/[slug]`.
