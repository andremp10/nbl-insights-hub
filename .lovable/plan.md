

# Plano: Refatoracao Completa - Chat NLQ + Correcao de Erros

## Problema Atual

### Erros de Build (CRITICO)
O sistema esta quebrado porque `useFinanceiro.ts` referencia `vw_dashboard_financeiro`, que **nao existe** no banco conectado. As unicas views disponiveis sao:
- `vw_dashboard_pedidos`
- `v_pedidos_entregas`

Para financeiro, existem RPCs: `get_financeiro_kpis` e `get_financeiro_graficos`.

### Webhook desatualizado
A Edge Function aponta para o webhook antigo do EasyPanel.

---

## Fase 1: Corrigir Erros de Build (CRITICO)

### 1.1 Corrigir `src/hooks/useFinanceiro.ts`
Substituir todas as queries de `vw_dashboard_financeiro` pelas RPCs existentes:

```typescript
// KPIs: usar RPC get_financeiro_kpis
const { data } = await supabase.rpc('get_financeiro_kpis', {
  p_data_inicio: fromDate,
  p_data_fim: toDate,
});

// Graficos: usar RPC get_financeiro_graficos
const { data } = await supabase.rpc('get_financeiro_graficos', {
  p_data_inicio: fromDate,
  p_data_fim: toDate,
});
```

A funcao `useTransacoesPaginadas` sera removida (nao ha view para listar transacoes individuais).

### 1.2 Atualizar `src/pages/Financeiro.tsx`
Remover referencia ao `TransactionsTable` (que depende de dados individuais nao disponiveis).

---

## Fase 2: Atualizar Webhook

### 2.1 Edge Function `supabase/functions/nlq-proxy/index.ts`
Trocar URL:
- De: `https://chez-n8n-webhook.jsf0kc.easypanel.host/webhook/4831bc34-510b-46f1-a3e5-96299a45fab6`
- Para: `https://primary-production-c00b.up.railway.app/webhook/4831bc34-510b-46f1-a3e5-96299a45fab6`

### 2.2 Alternativa: chamada direta (sem Edge Function)
O novo endpoint esta em URL publica. O `useChatbot.ts` pode chamar diretamente via `fetch` em vez de passar pela Edge Function, eliminando o limite de 150s do Supabase. Isso permite timeout de 60s controlado no frontend com AbortController.

**Recomendacao**: Usar fetch direto no hook, removendo dependencia da Edge Function para o chat.

---

## Fase 3: Refatorar `useChatbot.ts` (Chamada Direta)

Mudancas:
1. Trocar `supabase.functions.invoke('nlq-proxy')` por `fetch` direto ao Railway
2. Adicionar `AbortController` com timeout de 60s
3. Expor `cancelRequest` para o botao de cancelar
4. Persistir historico no `localStorage` (chave `nbl_chat_history`, max 50 msgs)
5. Adicionar funcao `retryLast` para retry em erros

```typescript
const WEBHOOK_URL = 'https://primary-production-c00b.up.railway.app/webhook/4831bc34-510b-46f1-a3e5-96299a45fab6';
const TIMEOUT_MS = 60000;

// AbortController para cancelamento
const abortRef = useRef<AbortController | null>(null);

const sendMessage = useCallback(async (content: string) => {
  if (!content.trim() || isLoading) return;
  abortRef.current = new AbortController();
  const timeoutId = setTimeout(() => abortRef.current?.abort(), TIMEOUT_MS);
  
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: content.trim(), session_id, ... }),
      signal: abortRef.current.signal,
    });
    // ... processar resposta
  } finally {
    clearTimeout(timeoutId);
  }
}, [...]);

const cancelRequest = useCallback(() => {
  abortRef.current?.abort();
  setIsLoading(false);
}, []);
```

---

## Fase 4: Redesign Visual Completo

### 4.1 Nova Paleta de Cores (`src/index.css`)
Substituir tema `.dark`:

| Variavel | Valor | Hex |
|----------|-------|-----|
| --background | 0 0% 6% | #0F0F0F |
| --card | 0 0% 10% | #1A1A1A |
| --primary | 18 82% 51% | #E8501A |
| --border | 0 0% 16.5% | #2A2A2A |
| --foreground | 0 0% 96% | #F5F5F5 |
| --muted-foreground | 0 0% 53% | #888888 |
| --destructive | 0 84% 60% | #EF4444 |
| --success | 142 71% 45% | #22C55E |

### 4.2 Layout Single-Page (`src/pages/Chat.tsx`)
Redesign completo com:
- Header fixo (56px) com logo "NBL Grafica", subtitulo "Agente de Consulta", indicador de status (verde/amarelo)
- Sidebar esquerda (240px, recolhivel) com sugestoes estaticas
- Area de chat central com max-width 780px
- Input bar fixo no bottom

### 4.3 Sidebar de Sugestoes (novo componente)
Componente `ChatSuggestionsPanel.tsx`:
- Background #141414, border-right #2A2A2A
- Titulo "CONSULTAS FREQUENTES" em uppercase
- 6 sugestoes pre-definidas como pills clicaveis
- Ao clicar: preenche o input (nao envia)
- Em mobile: drawer overlay

Sugestoes:
1. "Quais sao os 10 clientes com mais pedidos?"
2. "Qual o faturamento do mes atual?"
3. "Quais pedidos estao com pagamento pendente?"
4. "Quais produtos mais vendidos neste mes?"
5. "Clientes que nao compram ha mais de 60 dias?"
6. "Qual o ticket medio dos pedidos?"

### 4.4 Baloes de Mensagem
- **Usuario**: alinhado a direita, bg #E8501A, branco, border-radius 18px 18px 4px 18px, max-width 70%
- **Assistente**: alinhado a esquerda, bg #1A1A1A, border #2A2A2A, cor #F5F5F5, border-radius 4px 18px 18px 18px, max-width 85%
- **Erro**: fundo #1A0A0A, borda #EF4444/40%, icone alerta, botao "Tentar novamente"

### 4.5 Input Bar
- Background #141414, border-top #2A2A2A
- Textarea auto-resize (max 4 linhas), bg #1A1A1A, border #2A2A2A
- Focus: border #E8501A, box-shadow com orange
- Botao enviar: bg #E8501A, icone ArrowUp
- Durante loading: botao muda para "Cancelar" (X)
- Enter = enviar, Shift+Enter = nova linha

### 4.6 Typing Indicator
- 3 dots animados (wave) em cor #E8501A dentro de balao do assistente
- Texto "Consultando base de dados..." em #555, 12px

### 4.7 Timestamps
- Abaixo de cada mensagem, cor #444, 11px, formato "14:32"

---

## Fase 5: Remocoes e Limpeza

### 5.1 Remover rotas de Financeiro e Pedidos do App.tsx
Estas paginas dependem de views/RPCs que servem como dashboards separados. O foco agora e chat-only. As rotas `/financeiro` e `/pedidos` serao removidas.

### 5.2 Remover AppSidebar de navegacao
O sidebar de navegacao atual (Assistente/Financeiro/Pedidos) sera substituido pelo sidebar de sugestoes.

### 5.3 Remover DashboardLayout
O chat tera seu proprio layout dedicado, sem wrapper de dashboard.

### 5.4 Remover DateFilterContext do chat
O chat nao precisa mais de filtro de datas global - o usuario pergunta datas em linguagem natural.

---

## Fase 6: Persistencia e Acessibilidade

### 6.1 localStorage
- Salvar mensagens em `nbl_chat_history` (max 50)
- Carregar ao inicializar o hook
- Botao "Limpar historico" no header com confirmacao

### 6.2 Acessibilidade
- `role="log"` na area de chat
- `aria-live="polite"` para novas mensagens
- `aria-label` em todos os botoes de icone
- Focus visible com outline #E8501A

---

## Arquivos Afetados

### Novos
- `src/components/chat/ChatSuggestionsPanel.tsx`

### Modificados
- `src/hooks/useFinanceiro.ts` (corrigir para usar RPCs)
- `src/hooks/useChatbot.ts` (fetch direto, AbortController, localStorage)
- `src/pages/Chat.tsx` (redesign completo)
- `src/pages/Financeiro.tsx` (remover TransactionsTable)
- `src/components/chat/ChatMessage.tsx` (novo estilo, timestamps)
- `src/components/chat/ChatInput.tsx` (novo estilo, botao cancelar)
- `src/components/chat/ThinkingBubble.tsx` (dots laranja)
- `src/index.css` (nova paleta de cores)
- `src/App.tsx` (simplificar rotas)

### Removidos (conteudo esvaziado/simplificado)
- `src/components/layout/DateFilterBar.tsx` (mantido para Financeiro/Pedidos se necessario)

---

## Sequencia de Execucao

1. Corrigir `useFinanceiro.ts` (resolver build errors)
2. Atualizar `useChatbot.ts` (fetch direto + AbortController)
3. Atualizar `index.css` (nova paleta)
4. Criar `ChatSuggestionsPanel.tsx`
5. Redesign `Chat.tsx` (layout completo)
6. Atualizar `ChatMessage.tsx`, `ChatInput.tsx`, `ThinkingBubble.tsx`
7. Simplificar `App.tsx`
8. Atualizar Edge Function (webhook URL)

