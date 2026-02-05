
# Plano: Refatoração UI Apple-like + Edge Function Proxy + Chat NLQ

## Diagnóstico dos Problemas Atuais

### 1. Chat NLQ
- **Problema**: O front chama o webhook n8n diretamente, causando erros 500 intermitentes
- **Causa**: O n8n retorna formatos de resposta variados (às vezes `{output: "..."}`, às vezes texto puro, às vezes o JSON esperado)
- **Solução**: Criar Edge Function proxy que normaliza a resposta

### 2. Supabase Views
- **Status**: As views `vw_dashboard_financeiro` e `vw_dashboard_pedidos` estão funcionando corretamente
- **Problema**: O front consulta com filtro `data >= '2026-02-01'` mas os dados estão em 2020-2023
- **Solução**: Ajustar o filtro de período para mostrar dados existentes ou expandir range

### 3. UI/UX
- **Problema**: Layout funcional mas não premium, falta refinamento Apple-like
- **Solução**: Refatorar design system completo com glassmorphism, tipografia Inter, espaçamentos maiores

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────┐
│                         USUÁRIO                                  │
│                            ↓                                     │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              LOVABLE (React + Tailwind)                      ││
│  │  ┌──────────┬──────────┬──────────┬────────────────────┐    ││
│  │  │   Auth   │ Financ.  │ Pedidos  │   Chat (ChatGPT)   │    ││
│  │  │  (senha) │Dashboard │Dashboard │    Apple-like      │    ││
│  │  └────┬─────┴────┬─────┴────┬─────┴─────────┬──────────┘    ││
│  │       │          │          │               │               ││
│  └───────┼──────────┼──────────┼───────────────┼───────────────┘│
│          │          │          │               │                 │
│  ┌───────▼──────────▼──────────▼───────────────┘                │
│  │              SUPABASE                                         │
│  │    ┌────────────────────────────────────┐                    │
│  │    │  vw_dashboard_financeiro           │                    │
│  │    │  vw_dashboard_pedidos              │                    │
│  │    └────────────────────────────────────┘                    │
│  │                                                               │
│  │    ┌────────────────────────────────────┐                    │
│  │    │  Edge Function: nlq-proxy          │                    │
│  │    │  - Recebe mensagem do front        │                    │
│  │    │  - Faz POST para n8n               │                    │
│  │    │  - Normaliza resposta              │                    │
│  │    │  - Retorna JSON padronizado        │                    │
│  │    └───────────────┬────────────────────┘                    │
│  │                    │                                          │
│  └────────────────────┼──────────────────────────────────────────┘
│                       │                                           
│           ┌───────────▼───────────┐                              
│           │   n8n WEBHOOK         │                              
│           │   (Agente NLQ)        │                              
│           └───────────────────────┘                              
└──────────────────────────────────────────────────────────────────┘
```

---

## Fase 1: Edge Function `nlq-proxy`

### 1.1 Criar a Edge Function
Criar `supabase/functions/nlq-proxy/index.ts`:

- Receber POST com: `session_id`, `timezone`, `message`, `context`
- Fazer fetch para webhook n8n com timeout de 15s
- Normalizar qualquer formato de resposta do n8n para o contrato:
  ```typescript
  {
    ok: boolean;
    reply?: {
      text: string;
      highlights?: { label: string; value: number }[];
      suggested_actions?: { type: string; from?: string; to?: string; module?: string }[];
    };
    error?: { code: string; message: string };
  }
  ```
- Tratar: resposta JSON estruturada, resposta `{output: "..."}`, resposta texto puro, timeout, erro 500

### 1.2 CORS Headers
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### 1.3 Atualizar `supabase/config.toml`
```toml
project_id = "bcypejzqbcwibvtbbfor"

[functions.nlq-proxy]
verify_jwt = false
```

---

## Fase 2: Design System Apple-like Premium

### 2.1 Paleta de Cores (index.css)

```css
.dark {
  /* Background Base - mais profundo */
  --background: 220 15% 5%;

  /* Card/Surface - glassmorphism */
  --card: 220 15% 8%;
  --card-foreground: 0 0% 98%;

  /* Borders - sutis */
  --border: 220 15% 15%;
  --input: 220 15% 12%;
  
  /* Primary - azul vibrante */
  --primary: 217 91% 60%;
  --primary-foreground: 0 0% 100%;
  
  /* Text */
  --foreground: 0 0% 98%;
  --muted-foreground: 220 10% 55%;
}
```

### 2.2 Tipografia
- Font: Inter (já importada)
- Títulos: font-medium, tracking-tight
- Body: font-normal, leading-relaxed

### 2.3 Componentes Base
- Cards com: `backdrop-blur-xl bg-white/[0.02] border-white/[0.05]`
- Shadows: `shadow-2xl shadow-black/20`
- Radius: `rounded-2xl` para cards principais

---

## Fase 3: Refatorar Layout Global

### 3.1 DashboardLayout
- Container central com `max-w-7xl mx-auto`
- Sidebar mais estreita e elegante
- Header com blur e bordas sutis
- Padding generoso: `p-6 md:p-8`

### 3.2 AppSidebar
- Fundo: `bg-black/40 backdrop-blur-xl`
- Logo: redesenhar com gradiente sutil
- Menu items: hover com glow suave
- Indicador ativo: barra lateral animada

### 3.3 DateFilterBar
- Botões com estilo Apple segmented control
- Popover de calendário com glassmorphism

---

## Fase 4: Chat Interface (ChatGPT-like)

### 4.1 Instalar Dependência
```bash
framer-motion
```

### 4.2 Estrutura do Chat

```text
┌────────────────────────────────────────┐
│  Header: "NBL Assistant" + Limpar      │
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ 🤖 Olá! Como posso ajudar?       │  │
│  └──────────────────────────────────┘  │
│                                        │
│        ┌──────────────────────────┐    │
│        │ Quanto foi o faturamento │    │
│        │ de janeiro?              │ 👤 │
│        └──────────────────────────┘    │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ Em janeiro, a receita total...  │  │
│  │                                  │  │
│  │ ┌────────────┐ ┌────────────┐   │  │
│  │ │ Receita    │ │ Despesas   │   │  │
│  │ │ R$ 123.456 │ │ R$ 98.765  │   │  │
│  │ └────────────┘ └────────────┘   │  │
│  │                                  │  │
│  │ [Ver período] [Ir p/ Financeiro]│  │
│  └──────────────────────────────────┘  │
│                                        │
│  ● ● ● (typing indicator)              │
│                                        │
├────────────────────────────────────────┤
│ ┌────────────────────────────────┐ [→] │
│ │ Digite sua pergunta...         │     │
│ └────────────────────────────────┘     │
└────────────────────────────────────────┘
```

### 4.3 Componentes do Chat

1. **ChatContainer**: Layout principal com scroll
2. **MessageBubble**: Balões com animação de entrada
3. **HighlightCards**: Cards inline para valores
4. **SuggestedActions**: Botões de ação
5. **TypingIndicator**: Três pontos pulsando
6. **ChatInput**: Input fixo com textarea expansível

### 4.4 Animações (Framer Motion)
- Mensagens: slide in + fade
- Typing: dots pulsing
- Send button: scale on tap

---

## Fase 5: Refatorar Dashboards

### 5.1 KPICard Premium
- Glassmorphism background
- Ícone com glow sutil
- Valor com gradiente ou cor semântica
- Hover com elevação suave

### 5.2 Charts
- Remover bordas duras
- Cores harmônicas
- Tooltips com blur
- Legends mais discretas

### 5.3 Tables
- Header fixo com blur
- Rows com hover sutil
- Bordas quase invisíveis
- Paginação minimalista

---

## Fase 6: Hook useChatbot Atualizado

### 6.1 Mudanças
- Chamar `supabase.functions.invoke('nlq-proxy', ...)` em vez de fetch direto
- Timeout de 30s no cliente
- Tratamento de erros padronizado
- Suporte a resposta normalizada

### 6.2 Interface

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  highlights?: { label: string; value: number }[];
  suggestedActions?: { type: string; ... }[];
  isError?: boolean;
}
```

---

## Entregáveis por Ordem

### Commit 1: Edge Function
- [ ] `supabase/functions/nlq-proxy/index.ts`
- [ ] Atualizar `supabase/config.toml`

### Commit 2: Design System
- [ ] Atualizar `src/index.css` com nova paleta
- [ ] Atualizar `tailwind.config.ts` com novos tokens
- [ ] Adicionar animações e utilities

### Commit 3: Layout Global
- [ ] Refatorar `DashboardLayout.tsx`
- [ ] Refatorar `AppSidebar.tsx`
- [ ] Refatorar `DateFilterBar.tsx`

### Commit 4: Chat NLQ
- [ ] Instalar `framer-motion`
- [ ] Criar componentes de chat
- [ ] Refatorar `Chat.tsx`
- [ ] Atualizar `useChatbot.ts`

### Commit 5: Dashboards
- [ ] Refatorar `KPICard.tsx`
- [ ] Refatorar `DonutChart.tsx`
- [ ] Refatorar `HorizontalBarChart.tsx`
- [ ] Refatorar `TransactionsTable.tsx`
- [ ] Refatorar `OrdersTable.tsx`

### Commit 6: Polimento
- [ ] Testar responsividade
- [ ] Ajustar cores e espaçamentos
- [ ] Validar fluxo de chat end-to-end

---

## Detalhes Técnicos

### Edge Function `nlq-proxy`

```typescript
// supabase/functions/nlq-proxy/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const N8N_WEBHOOK_URL = "https://chez-n8n-webhook.jsf0kc.easypanel.host/webhook/4831bc34-510b-46f1-a3e5-96299a45fab6";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Forward to n8n with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app: 'grafica_nbl_lovable',
        session_id: body.session_id,
        timezone: body.timezone || 'America/Fortaleza',
        message: body.message,
        context: body.context,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const rawData = await n8nResponse.text();
    
    // Normalize response
    let reply = { text: '', highlights: [], suggested_actions: [] };
    
    try {
      const parsed = JSON.parse(rawData);
      
      if (parsed.reply?.text) {
        // Already structured
        reply = parsed.reply;
      } else if (parsed.output) {
        // n8n format {output: "..."}
        reply.text = parsed.output;
      } else if (typeof parsed === 'string') {
        reply.text = parsed;
      } else {
        reply.text = JSON.stringify(parsed);
      }
    } catch {
      // Plain text response
      reply.text = rawData;
    }

    return new Response(JSON.stringify({ ok: true, reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    
    return new Response(JSON.stringify({
      ok: false,
      error: {
        code: isTimeout ? 'TIMEOUT' : 'INTERNAL_ERROR',
        message: isTimeout 
          ? 'O assistente está demorando para responder. Tente novamente.'
          : 'Erro ao processar sua pergunta. Tente novamente.',
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: isTimeout ? 504 : 500,
    });
  }
});
```

### CSS Global Atualizado

```css
.dark {
  --background: 220 15% 5%;
  --foreground: 0 0% 98%;
  --card: 220 15% 8%;
  --card-foreground: 0 0% 98%;
  --primary: 217 91% 60%;
  --primary-foreground: 0 0% 100%;
  --border: 0 0% 100% / 8%;
  --muted-foreground: 220 10% 55%;
}

/* Glassmorphism utilities */
.glass {
  @apply backdrop-blur-xl bg-white/[0.02] border border-white/[0.05];
}

.glass-hover {
  @apply hover:bg-white/[0.04] transition-colors;
}

/* Chat animations */
@keyframes slideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-slide-in {
  animation: slideIn 0.3s ease-out;
}
```

---

## Critérios de Sucesso

- [ ] Edge Function deployed e respondendo em menos de 15s
- [ ] Chat renderiza respostas corretamente (texto + highlights + actions)
- [ ] UI consistente com vibe Apple/ChatGPT
- [ ] Dashboards carregando dados das views
- [ ] Filtro de período funcional em todas as páginas
- [ ] Responsivo e bonito em mobile
- [ ] Zero erros de console críticos
