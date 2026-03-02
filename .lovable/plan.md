

# Plano de Auditoria e Melhorias — NBL Insights Hub

## Sequencia de Execucao

---

### 1. Corrigir Duplicacao de Mensagens (Bug Critico)

**Causa Raiz Identificada:**
A Edge Function (`nlq-proxy`) insere a mensagem do usuario no banco (linha 66). Simultaneamente, o frontend (`useChatMessages.ts` linhas 101-109) cria uma mensagem otimista com `id: opt-{timestamp}`. Quando o Realtime dispara o evento INSERT da mensagem real (com UUID do banco), o dedup check na linha 61 compara pelo `id` — mas os IDs sao diferentes (`opt-123` vs `uuid-real`). Resultado: duas mensagens do usuario aparecem.

**Correcao:**
- Remover a insercao otimista do usuario no `useChatMessages.ts`. A Edge Function ja insere a mensagem do usuario no banco, e o Realtime traz ela automaticamente.
- Manter apenas o estado `sending=true` para feedback visual.
- O fluxo correto sera: usuario envia -> frontend chama Edge Function -> Edge Function insere user msg + pending msg -> Realtime traz ambas -> UI renderiza.

**Arquivo afetado:** `src/hooks/useChatMessages.ts`

---

### 2. Corrigir Filtros de Data (Views ja Existem)

**Diagnostico:**
As views `vw_dashboard_pedidos` e as RPCs `get_financeiro_kpis` / `get_financeiro_graficos` ja existem e funcionam. O problema e que o filtro padrao e "Ultimos 30 dias" (marco 2026), mas os dados no banco sao de 2019-2023. Por isso tudo aparece zerado.

**Correcao:**
- Alterar o `DateFilterContext` para ter presets mais uteis: "Ultimos 7 dias", "Ultimos 30 dias", "Este Mes", "Este Ano", "Todo Periodo" e "Personalizado".
- Mudar o padrao inicial para "Todo Periodo" (2019 ate hoje) para que o usuario veja dados ao abrir pela primeira vez.
- Simplificar o `DateFilterBar` para ser mais compacto: botoes de preset em linha + seletor de datas customizado.
- Fechar o popover de calendario automaticamente apos selecionar ambas as datas.

**Arquivos afetados:**
- `src/contexts/DateFilterContext.tsx`
- `src/components/layout/DateFilterBar.tsx`

---

### 3. Implementar Sidebar Lateral

**Abordagem:**
Substituir o `AppHeader` horizontal por uma sidebar lateral recolhivel usando o componente `AppSidebar` que ja existe parcialmente. Usar `SidebarProvider` do shadcn/ui.

**Detalhes:**
- Criar um layout wrapper (`AppLayout`) que envolve todas as paginas protegidas com `SidebarProvider` + `AppSidebar` + conteudo.
- A sidebar tera: logo NBL Grafica no topo (usando a imagem enviada pelo usuario copiada para `src/assets`), links de navegacao (Home, Assistente, Financeiro, Pedidos) com icones, e avatar + logout no rodape.
- Quando recolhida: apenas icones com tooltip.
- Em mobile: drawer que abre sobre o conteudo.
- Item ativo com destaque laranja (borda lateral + bg primary/10).
- Remover `AppHeader` das paginas individuais e usar o layout compartilhado.
- A pagina de Chat mantera sua propria SessionsSidebar interna para conversas.

**Arquivos afetados:**
- `src/components/layout/AppSidebar.tsx` — reescrever com logo, Home link, e estilo atualizado
- `src/components/layout/AppLayout.tsx` — criar novo layout wrapper
- `src/App.tsx` — envolver rotas protegidas com AppLayout
- `src/pages/Home.tsx` — remover AppHeader
- `src/pages/Chat.tsx` — remover AppHeader
- `src/pages/Financeiro.tsx` — remover AppHeader
- `src/pages/Pedidos.tsx` — remover AppHeader
- Copiar logo NBL para `src/assets/nbl-logo.png`

---

### 4. Redesenhar Pagina Inicial

**Abordagem:**
Reescrever `Home.tsx` com hierarquia visual clara:
1. Saudacao grande e com personalidade no topo
2. Input de consulta rapida centralizado e em destaque (o Assistente e o foco)
3. Pills de sugestoes logo abaixo
4. Cards de navegacao secundaria (Financeiro e Pedidos) menores, em grid 2 colunas
5. KPIs do resumo do dia discretos na parte inferior

Layout centralizado com `max-w-[800px]` e espacamento generoso.

**Arquivo afetado:** `src/pages/Home.tsx`

---

### 5. Melhorar Componente de Resposta do Agente

**Abordagem:**
O `ChatMessage.tsx` ja tem suporte a markdown com tabelas via `react-markdown` + `remark-gfm`. Melhorias:

- Adicionar deteccao de conteudo: se a resposta contem apenas um numero/valor monetario com label, renderizar em formato "highlight card" (valor grande centralizado com label descritivo).
- Melhorar estilo das tabelas: linhas alternadas com `even:bg-muted/30`, valores numericos alinhados a direita (detectar via regex), cabecalho com fundo `primary/10`.
- Adicionar estilo para blocos de codigo e listas.
- Manter texto narrativo com boa tipografia e espacamento.

**Arquivo afetado:** `src/components/chat/ChatMessage.tsx`

---

## Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| `src/hooks/useChatMessages.ts` | Remover insercao otimista duplicada |
| `src/contexts/DateFilterContext.tsx` | Atualizar presets e padrao |
| `src/components/layout/DateFilterBar.tsx` | Simplificar UI |
| `src/components/layout/AppSidebar.tsx` | Reescrever com logo e Home |
| `src/components/layout/AppLayout.tsx` | Criar layout wrapper |
| `src/App.tsx` | Usar AppLayout nas rotas |
| `src/pages/Home.tsx` | Redesenhar |
| `src/pages/Chat.tsx` | Remover AppHeader |
| `src/pages/Financeiro.tsx` | Remover AppHeader |
| `src/pages/Pedidos.tsx` | Remover AppHeader |
| `src/components/chat/ChatMessage.tsx` | Melhorar renderizacao |
| `src/assets/nbl-logo.png` | Copiar logo |

