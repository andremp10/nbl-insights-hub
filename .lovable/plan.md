# Refino visual da resposta do assistente NBL

Aplicar a direção **B2B Dense Professional** ao bloco de resposta do assistente no chat, mantendo o conteúdo markdown vindo do n8n intacto e elevando apenas a apresentação.

## Mudanças

### 1. Headings (H2/H3) — `ChatMessage.tsx` markdownComponents
Transformar `## Resumo`, `## Dados detalhados`, `## Insight` em **section labels** padronizados:
- Barra vertical primary (`w-[2px] h-4 bg-primary`) à esquerda
- Texto `text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground`
- Espaçamento generoso acima (`mt-6`) para separar seções claramente

### 2. Números-chave em destaque — componente `<strong>`
Quando um `<strong>` contém um número/valor (regex: dígitos + opcional unidade tipo "pedidos", "unidades", "R$", "%"), renderizar como **chip inline**:
- `inline-flex items-baseline font-semibold text-primary bg-primary/5 px-1 rounded`
- Demais `<strong>` (texto puro como nome de produto) mantêm `text-foreground font-semibold`

### 3. Tabelas — refino dos componentes `table/thead/tbody/tr/td`
- Container: `border border-border rounded-sm overflow-hidden` (substitui `rounded-lg border-border/60`)
- Header: `bg-muted/40 border-b border-border` + `text-[11px] font-semibold text-muted-foreground uppercase tracking-wider`
- Linhas: remover zebra atual (`nth-child(even)`), usar `divide-y divide-border/50` + hover `bg-muted/20`
- Células numéricas: já detectadas, manter `font-mono tabular-nums text-right`, cor `text-foreground` (mais brilhante)
- Reduzir padding vertical (`py-2` em td) para densidade B2B

### 4. Insight (blockquote ou parágrafo final) — `<blockquote>` component
Adicionar componente `blockquote` ao markdownComponents:
- `bg-muted/30 border-l-2 border-primary p-4 italic text-foreground/90 leading-relaxed`
- Como o agente nem sempre usa blockquote, detectar no MarkdownBody se a última seção é "Insight"/"Insights" e envolver o conteúdo seguinte automaticamente — alternativa mais simples: instruir o prompt do n8n a usar `>` para o insight (fora do escopo desta task; aplicar via styling do blockquote já cobre quando vier).

### 5. Chips de metadata (Período/Escopo) — manter, refinar
Já existem via `<em>` detection. Pequenos ajustes:
- `bg-muted/40 border border-border` (mais sólido, menos transparente)
- Chip de "Escopo" ganha variante com borda primary suave: `border-primary/20 text-primary` quando começar com "Escopo:"

### 6. Container do bloco assistente — `pl-7` atual
- Adicionar `space-y-4` no wrapper interno para respiro entre seções
- Sem card/borda externa (manter flat, conforme memória "no glassmorphism, flat chat UI")

## Arquivo afetado
- `src/components/chat/ChatMessage.tsx` (apenas o objeto `markdownComponents` e pequenos ajustes de wrapper)

Sem mudanças em CSS global, sem novos componentes, sem mudança de lógica/dados.

## Fora de escopo
- Footer "Exportar CSV / Copiar" do protótipo (já existe botão Copiar; manter)
- Badges de "Status" coloridos (Estável/Alta/Neutro) — não vêm na resposta atual
- Mudanças no prompt do agente n8n
