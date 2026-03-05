

# Refatoracao Completa — NBL Insights Hub

Plano consolidado: design system + sidebar + 4 paginas + componentes + tema. 11 arquivos editados, nenhum novo.

---

## 1. Design System (`src/index.css`)

- Dark tokens mais profundos: background `0 0% 4%` (#0A0A0A), card `0 0% 7%` (#111), border `0 0% 12%` (#1E1E1E)
- Light tokens com contraste real: background `0 0% 98%` (#FAFAFA), card `0 0% 100%`, border `0 0% 90%` (#E5E5E5)
- Adicionar `--info: 199 89% 48%` e `--info-foreground: 0 0% 100%` em ambos os temas
- Radius global: `0.5rem`
- Remover animacao `fadeSlideUp` (nao usada diretamente)

## 2. Sidebar (`AppSidebar.tsx`)

- Remover gradiente do logo → `bg-primary` solido, sem `shadow-md`
- Remover subtitulo "Insights Hub"
- Remover label "Menu"
- Items: `py-2 px-3`, `text-[13px]`, icons `h-[18px] w-[18px]`
- Ativo: `bg-primary/12 text-primary font-medium` + barra `w-[3px]` animada (manter)
- Inativo: `text-muted-foreground hover:bg-muted hover:text-foreground`
- Footer: ThemeToggle + Logout em linha com separador

## 3. Home (`Home.tsx`) — Redesenho completo

Nova estrutura (de cima para baixo):

**A) Hero compacto**
- Saudacao `text-2xl font-semibold` (sem emoji no titulo)
- Data por extenso abaixo: "Quinta-feira, 5 de marco de 2026"
- Subtitulo: "Consulte pedidos e financeiro em tempo real"

**B) Barra de busca simplificada**
- Remover `backdrop-blur`, glow no focus, `rounded-2xl`
- `bg-card border border-border rounded-lg` simples, `focus:border-primary`
- Abaixo: 3 chips de sugestao rapida clicaveis ("Faturamento do mes", "Pedidos pendentes", "Top clientes")

**C) KPIs (4 cards densos)**
- Receita mes, Despesas mes (da `vw_dashboard_financeiro` via query existente), Total pedidos, Atrasados
- Remover `useCountUp` — valor direto
- Cores nos valores: verde receita, vermelho despesas, azul pedidos, amber atrasados
- Sem icones decorativos grandes — apenas label + valor

**D) Atalhos rapidos (3 tiles)**
- Compactos com borda esquerda colorida (3px)
- Sem `motion.div whileHover scale`
- Cada tile mostra preview de dado quando disponivel (ex: "R$ 12k" no financeiro)

**E) Atividade recente**
- Ultimos 5 pedidos da `vw_dashboard_pedidos` (limit 5, order by data_criacao desc)
- Mini-tabela: data | cliente | valor | status badge
- Estado vazio: "Nenhum pedido recente"

**Buscar dados financeiros**: adicionar query a `vw_dashboard_financeiro` para receita/despesas do mes (similar ao que `useFinanceiro` ja faz, mas inline na Home com startOfMonth filter)

## 4. Chat (`Chat.tsx`)

- `ChatInputInline`: remover `focus:ring-2 focus:ring-primary/15` → manter so `focus:border-primary`
- `ChatEmptyState`: reduzir de 6 para 4 sugestoes, remover icones e descricoes secundarias. Chips compactos em 2 colunas. Remover icone Bot grande com badge "online". Titulo `text-lg`.

## 5. Pedidos (`Pedidos.tsx`)

- Remover `HorizontalBarChart` de "Top 10 Clientes" (duplica escopo do chat)
- Layout: KPIs → OrdersTable (full-width) → DonutChart de status (compacto, abaixo)
- Mudar grid de graficos de `md:grid-cols-2` para bloco unico full-width

## 6. Financeiro (`Financeiro.tsx`)

- Remover `backdrop-blur-sm` e `bg-card/80` dos graficos (via componentes)
- Manter estrutura atual (ja adequada): 3 KPIs + Donut + BarChart

## 7. Componentes

### KPICard
- Remover `motion.div` wrapper
- Remover `backdrop-blur-sm bg-card/80` → `bg-card border-border`
- Manter icone pequeno, sem bg colorido exagerado → `bg-muted`

### DonutChart
- Remover `motion.div` wrapper
- `bg-card border-border` (sem blur)
- Empty state melhor: icone + "Nenhum lancamento no periodo. Ajuste o filtro de datas."

### HorizontalBarChart
- Remover `motion.div` wrapper
- `bg-card border-border` (sem blur)
- Cores de eixo tematicas: `hsl(var(--muted-foreground))` ao inves de hardcoded
- Cursor tooltip: `hsl(var(--muted) / 0.5)`
- Empty state melhorado

### OrdersTable
- Empty state: icone + texto explicativo

---

## Arquivos

| Arquivo | Acao |
|---------|------|
| `src/index.css` | Tokens dark/light, radius, --info |
| `src/components/layout/AppSidebar.tsx` | Compactar, limpar |
| `src/pages/Home.tsx` | Redesenho completo com chips, KPIs financeiros, atividade recente |
| `src/pages/Chat.tsx` | Remover ring glow do input |
| `src/pages/Pedidos.tsx` | Remover bar chart clientes |
| `src/pages/Financeiro.tsx` | Nenhuma mudanca direta (correcoes via componentes) |
| `src/components/chat/ChatEmptyState.tsx` | 4 sugestoes, sem icones, chips compactos |
| `src/components/dashboard/KPICard.tsx` | Remover motion/blur |
| `src/components/dashboard/DonutChart.tsx` | Remover motion/blur, empty state |
| `src/components/dashboard/HorizontalBarChart.tsx` | Remover motion/blur, cores tematicas |
| `src/components/dashboard/OrdersTable.tsx` | Empty state melhorado |

Nenhum arquivo novo. Nenhuma mudanca de banco.

