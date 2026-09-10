# Construtor de painel, definição fechada

Editor visual no espírito do editor de tema de loja: ajustes à esquerda, prévia
ao vivo à direita, arrastar para posicionar. Tudo que muda aparece na hora, sem
salvar e recarregar.

## A tela

```
┌────────────┬──────────────────────────────────┬──────────────┐
│  ESTRUTURA │           PRÉVIA AO VIVO         │   AJUSTES    │
│            │                                  │              │
│ ▸ Cabeçalho│  ┌────────────────────────────┐  │  do que      │
│ ▾ Faixa 1  │  │ header do painel           │  │  estiver     │
│    ▸ Card A│  ├────────────────────────────┤  │  selecionado │
│    ▸ Card B│  │ ┌────┐┌────┐┌────┐┌────┐   │  │              │
│ ▾ Faixa 2  │  │ │card││card││card││card│   │  │              │
│    ▸ Card C│  │ └────┘└────┘└────┘└────┘   │  │              │
│ ▸ Rodapé   │  └────────────────────────────┘  │              │
│            │                                  │              │
│ + Faixa    │  [ Desktop | Tablet | Celular ]  │  [ Salvar ]  │
└────────────┴──────────────────────────────────┴──────────────┘
```

Três colunas no desktop. Abaixo de `lg` viram abas: Estrutura, Prévia, Ajustes.

**Clicar em qualquer coisa da prévia seleciona** e abre os ajustes dela. Clicar
na árvore faz o mesmo. Os dois caminhos levam ao mesmo lugar.

**Arrastar move.** Card entre posições e entre faixas, faixa para cima e para
baixo, coluna na grade de dados. Enquanto arrasta, o alvo mostra onde vai cair.

## Estados

- **Rascunho** e **publicado** são versões separadas. Editar não mexe no que
  está no ar. O botão diz `Publicar alterações` e mostra quantas mudanças.
- **Desfazer** e **refazer** na barra, teclado incluído.
- Salvamento automático a cada mudança, com indicador de "salvo".

## 1. Ajustes do painel

| Grupo         | Campos                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identificação | nome, descrição, endereço público (`/p/slug`)                                                                                                     |
| Preset        | harpix claro (o cockpit publicado hoje), harpix escuro (o da semana), personalizado                                                               |
| Cores         | acento, acento suave, fundo, superfície, superfície alternativa, texto, texto suave, texto fraco, borda, borda forte, positivo, negativo, atenção |
| Cabeçalho     | fundo, cor do texto, fixo ao rolar, mostrar marca, texto da marca, título, subtítulo, mostrar horário da última leitura                           |
| Forma         | raio da borda (0 a 24), sombra (nenhuma, sutil, média), densidade (compacta, confortável)                                                         |
| Tipografia    | fonte de título, fonte de corpo                                                                                                                   |
| Período       | preset padrão, quais presets aparecem para quem visita, permitir intervalo livre                                                                  |
| Rodapé        | texto de "como ler", opcional                                                                                                                     |

Os dois presets não são invenção: são cópia literal dos tokens de
`app/globals.css` e de `app/semana/semana.css`. Escolher um devolve exatamente
a tela que já existe.

## 2. Ajustes da faixa

| Campo          | Observação                                                |
| -------------- | --------------------------------------------------------- |
| Título         |                                                           |
| Descrição      | linha de contexto abaixo do título                        |
| Dica à direita | o texto pequeno alinhado à direita, tipo "últimos 7 dias" |
| Colunas        | 1 a 6, e quantas viram no tablet e no celular             |
| Espaçamento    | herda do painel ou próprio                                |
| Fundo          | transparente, superfície ou acento suave                  |
| Recolhível     | a faixa pode abrir e fechar no painel público             |
| Visível        | esconder sem apagar                                       |

## 3. Ajustes do card

### 3.1 O que ele é

Tipo: **número, progresso, barra, linha, pizza, tabela, lista, texto**.
Cada tipo mostra a frase do que ele responde, não do que ele desenha.

### 3.2 Onde ele mora

Faixa, posição na faixa, largura em colunas, altura (automática ou fixa).

### 3.3 De onde vem o número

| Campo         | Observação                                                            |
| ------------- | --------------------------------------------------------------------- |
| Conjunto      | a tabela de dados                                                     |
| Métrica       | contagem, soma, média, mínimo, máximo, último, distintos              |
| Campo         | só aparecem os compatíveis com a métrica                              |
| Filtros       | lista de `campo, operador, valor`, com os operadores do tipo do campo |
| Campo de data | qual data o período do painel recorta                                 |
| Comparar      | contra a janela anterior de mesmo tamanho                             |
| Subir é bom   | inverte a cor da variação, para bloqueio e retrabalho                 |

### 3.4 Como o número se lê

Formato (inteiro, decimal, **porcentagem**, horas, reais, texto), casas
decimais, prefixo, sufixo. Herda da coluna e pode sobrescrever a aparência,
nunca a natureza do dado.

### 3.5 Aparência

Destaque, cor própria do valor, ícone, mostrar rodapé com autor e data,
mostrar o total quando há filtro.

### 3.6 O texto

Título e **definição obrigatória**. É a frase que aparece embaixo do número.

## 4. Ajustes da coluna, na grade de dados

Nome, chave gerada, tipo, formato, casas, unidade, descrição, obrigatório,
valor padrão, opções da lista com cor por opção, largura na grade, congelar à
esquerda, ordem por arrastar.

**Na criação do conjunto** também se escolhe em qual painel ele aparece, e o
construtor já monta uma faixa com um card por coluna numérica, para o dado
nascer visível em vez de nascer numa tabela que ninguém abre.

## 5. Regras que o construtor impõe

1. **Card sem definição não salva.** Número sem frase que o explique foi o que
   produziu os indicadores irreproduzíveis do painel anterior.
2. **Métrica só aparece se o tipo do campo suporta.** Soma de texto não existe
   no menu, então não pode ser escolhida por engano.
3. **Comparar exige campo de data.** Sem período não há janela anterior, e um
   delta sem base é um delta inventado.
4. **Card sem campo de data declara que ignora o período**, na própria tela.
   Silêncio ali faz a pessoa achar que o filtro pegou.
5. **Nada mostra zero para dizer "não deu".** Sem base, mostra traço.
6. **Métrica de estoque não ganha variação.** Comparar estoque com o passado
   exige um histórico que ninguém está guardando.

## 6. Ordem de construção

1. Tema e presets, com prévia ao vivo. **Modelo pronto.**
2. Ações de faixa, card e coluna. **Prontas.**
3. Editor de três colunas com seleção e ajustes.
4. Arrastar e soltar, com `dnd-kit`.
5. Renderizador de card, com recharts nos gráficos.
6. Painel público em `/p/[slug]`, lendo o mesmo renderizador.
7. Grade de dados com colar de planilha.
8. Rascunho contra publicado, desfazer e refazer.
