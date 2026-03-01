

# Plano: Tela Home (Command Center) + Header Global

## Resumo

Criar uma nova tela inicial (Home) como command center da aplicacao, substituir o sidebar lateral por um header horizontal global, e implementar navegacao com quick query para o chat.

---

## Arquivos

### Novos
- `src/pages/Home.tsx` — Tela principal com Hero, Feature Cards, Quick Query, Sugestoes e KPIs
- `src/components/layout/AppHeader.tsx` — Header horizontal fixo (56px) com navegacao

### Modificados
- `src/App.tsx` — Adicionar rota "/" para Home, lazy import
- `src/pages/Chat.tsx` — Remover header proprio, usar AppHeader, ler `nbl_pending_query` do localStorage ao montar
- `src/pages/Financeiro.tsx` — Trocar DashboardLayout por AppHeader + layout simples
- `src/pages/Pedidos.tsx` — Trocar DashboardLayout por AppHeader + layout simples

### Mantidos (sem alteracao)
- `src/hooks/useChatbot.ts`
- `src/components/chat/*` (ChatMessage, ChatInput, etc.)

---

## Detalhes Tecnicos

### 1. AppHeader.tsx

Header fixo horizontal com 56px de altura, aplicado em todas as paginas.

```text
[Logo NBL Grafica] [badge "Insights"]    Home | Assistente | Financeiro | Pedidos    [Avatar ▾ Sair]
```

- Background: bg-background (#0F0F0F), border-bottom border-border (#2A2A2A)
- Nav links centrais com NavLink do react-router-dom, link ativo com border-bottom #E8501A
- Avatar com iniciais, dropdown simples com "Sair" usando o `useAuth().logout`
- Mobile: logo + hamburger menu abrindo drawer com Sheet do radix

### 2. Home.tsx

Pagina com scroll vertical, sem abas, estrutura:

**Secao Hero** (pt-16 pb-12, max-w-[900px] mx-auto):
- Saudacao dinamica baseada na hora (Bom dia/Boa tarde/Boa noite + emoji)
- Data por extenso em pt-BR (usando `Intl.DateTimeFormat`)
- Subtitulo fixo

**Secao Feature Cards** (3 cards em grid):
- Card 1: Assistente (MessageSquare, cor laranja, navega /chat)
- Card 2: Financeiro (TrendingUp, cor verde, navega /financeiro)
- Card 3: Pedidos (ShoppingBag, cor azul, navega /pedidos)
- Hover: border laranja, translateY(-2px), box-shadow
- useNavigate para navegacao ao clicar

**Secao Quick Query**:
- Textarea simplificado com botao enviar (ArrowRight)
- Ao submeter: salva em `localStorage.setItem('nbl_pending_query', query)` e `navigate('/chat')`

**Secao Sugestoes** (8 pills em flex-wrap):
- Ao clicar: mesmo comportamento do quick query (salva + navega)

**Secao KPIs** (4 mini-cards, lazy loaded):
- Pedidos Hoje: count de `vw_dashboard_pedidos` com `data_criacao` = hoje
- Faturamento Mes: sum de `valor_total` do mes atual
- Pendentes: count onde `status_pedido` indica pendencia
- Clientes Ativos: count distinct `cliente_id` nos ultimos 30 dias
- Loading: skeleton animado; erro: mostra "—"
- useEffect com delay de 300ms para nao bloquear render

**Animacoes**: CSS @keyframes fadeSlideUp com delays sequenciais (0ms, 100ms, 200ms, 280ms, 360ms). Sem framer-motion nesta pagina para manter leve.

### 3. Chat.tsx (modificacoes)

- Remover o header interno e o sidebar de sugestoes
- Adicionar `<AppHeader />` no topo
- Ajustar layout: `pt-14` para compensar header fixo
- Ao montar (useEffect), verificar `localStorage.getItem('nbl_pending_query')`:
  - Se existir: preencher e enviar via `sendMessage`, depois `localStorage.removeItem`

### 4. Financeiro.tsx e Pedidos.tsx

- Substituir `<DashboardLayout>` por:
  - `<AppHeader />` no topo
  - Layout simples com `<main className="pt-14 p-6">` + DateFilterBar inline
- Manter hooks e componentes de dados existentes

### 5. App.tsx

```typescript
const Home = lazy(() => import("./pages/Home"));
// ... rotas existentes
<Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
<Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
```

### 6. index.css

Adicionar animacao fadeSlideUp:

```css
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-slide-up {
  animation: fadeSlideUp 400ms ease-out both;
}
```

---

## Responsividade

- Desktop (>1024px): 3 colunas feature cards, 4 colunas KPIs
- Tablet (768-1024px): 2+1 feature cards, 2x2 KPIs
- Mobile (<768px): 1 coluna tudo, header com hamburger menu

---

## Sequencia de Implementacao

1. Adicionar CSS de animacao ao index.css
2. Criar AppHeader.tsx
3. Criar Home.tsx
4. Atualizar App.tsx (nova rota)
5. Atualizar Chat.tsx (AppHeader + pending_query)
6. Atualizar Financeiro.tsx e Pedidos.tsx (AppHeader)

