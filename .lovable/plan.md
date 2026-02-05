

# Plano: Redesign da Aba do Assistente IA (Estilo AnimatedAIChat)

## Objetivo
Refatorar completamente a página de Chat (`/chat`) usando o componente AnimatedAIChat como referência, mantendo a integração com o hook `useChatbot` existente e adaptando o visual para o contexto NBL.

---

## Análise do Componente de Referência

### Elementos Visuais Principais
1. **Fundo animado**: Grid pattern + glow effects que seguem o mouse
2. **Header centralizado**: Título "How can I help today?" com ícone Sparkles animado
3. **Command Palette**: Sugestões de comandos rápidos (ex.: `/clone`, `/figma`)
4. **Input com auto-resize**: Textarea expansível com minHeight/maxHeight
5. **Attachments**: Suporte a anexos com preview e remoção
6. **Indicador de digitação**: Pill flutuante com "Thinking..." e dots animados
7. **Botões de ação**: Paperclip + Command + Send com animações Framer Motion

### Funcionalidades do Componente Original
- useAutoResizeTextarea hook customizado
- Command palette com navegação por teclado (↑↓ Tab Enter Esc)
- Mouse position tracking para efeito de glow
- AnimatePresence para transições suaves
- Typing indicator floating pill

---

## Adaptações para o Contexto NBL

### Elementos a Adaptar
| Original | NBL |
|----------|-----|
| "How can I help today?" | "Como posso ajudar?" |
| "zap" (nome do assistente) | "NBL" |
| "/clone", "/figma", "/page", "/improve" | "/financeiro", "/pedidos", "/receita", "/despesas" |
| Cores genéricas | Tema primary (#6C47FF) |
| Placeholder "Ask zap..." | "Pergunte sobre financeiro, pedidos..." |

### Funcionalidades a Manter
- Integração com `useChatbot` hook (mensagens reais)
- Navegação via `handleActionClick` (ir para módulos)
- Suporte a `highlights` e `suggestedActions` nas respostas
- Contexto de datas (`useDateFilter`)

### Funcionalidades Novas (do componente de referência)
- Command palette para atalhos rápidos
- Grid background animado
- Glow effect seguindo mouse
- Auto-resize do textarea

---

## Estrutura de Arquivos

```text
src/
├── pages/
│   └── Chat.tsx (refatorado completo)
├── components/
│   └── chat/
│       ├── AnimatedChatContainer.tsx (novo - wrapper visual)
│       ├── CommandPalette.tsx (novo - atalhos rápidos)
│       ├── ChatMessageList.tsx (novo - lista de mensagens)
│       ├── ChatInputAnimated.tsx (novo - input animado)
│       ├── TypingIndicatorFloating.tsx (novo - indicator flutuante)
│       ├── ChatMessage.tsx (existente - manter)
│       └── TypingIndicator.tsx (existente - manter para mensagens)
└── hooks/
    └── useAutoResizeTextarea.ts (novo)
```

---

## Detalhes Técnicos

### 1. Hook useAutoResizeTextarea
```typescript
// src/hooks/useAutoResizeTextarea.ts
interface UseAutoResizeTextareaProps {
  minHeight: number;
  maxHeight?: number;
}

export function useAutoResizeTextarea({ minHeight, maxHeight }: UseAutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const adjustHeight = useCallback((reset?: boolean) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (reset) {
      textarea.style.height = `${minHeight}px`;
      return;
    }

    textarea.style.height = `${minHeight}px`;
    const newHeight = Math.max(
      minHeight,
      Math.min(textarea.scrollHeight, maxHeight ?? Infinity)
    );
    textarea.style.height = `${newHeight}px`;
  }, [minHeight, maxHeight]);

  return { textareaRef, adjustHeight };
}
```

### 2. CommandPalette - Atalhos NBL
```typescript
const nblCommands = [
  { icon: <DollarSign />, label: "Financeiro", description: "Ver dashboard financeiro", prefix: "/financeiro" },
  { icon: <Package />, label: "Pedidos", description: "Ver status de pedidos", prefix: "/pedidos" },
  { icon: <TrendingUp />, label: "Receita", description: "Consultar receitas", prefix: "/receita" },
  { icon: <TrendingDown />, label: "Despesas", description: "Consultar despesas", prefix: "/despesas" },
];
```

### 3. Grid Background Animado
```css
/* Adicionar ao index.css */
.chat-grid-bg {
  background-image: 
    linear-gradient(to right, hsl(var(--border) / 0.1) 1px, transparent 1px),
    linear-gradient(to bottom, hsl(var(--border) / 0.1) 1px, transparent 1px);
  background-size: 24px 24px;
}
```

### 4. Glow Effect (Mouse Tracking)
```typescript
const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

useEffect(() => {
  const handleMouseMove = (e: MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };
  window.addEventListener('mousemove', handleMouseMove);
  return () => window.removeEventListener('mousemove', handleMouseMove);
}, []);
```

### 5. Typing Indicator Flutuante
Posicionado como `fixed bottom-8` com animação de entrada/saída via AnimatePresence.

---

## Layout Final

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  ▂▂▂▂ (sidebar trigger)                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                          ░░░░░░░░░░░░░░░░░░░░░░ (grid bg)                   │
│                                                                              │
│                        ✨ Como posso ajudar?                                 │
│                     Digite uma pergunta ou comando                          │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ 👤 Qual foi a receita de janeiro?                                    │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ ✨ A receita total de janeiro foi R$ 123.456                         │   │
│  │    ┌─────────────┐ ┌─────────────┐                                   │   │
│  │    │ Receita     │ │ Despesas    │                                   │   │
│  │    │ R$ 123.456  │ │ R$ 98.765   │                                   │   │
│  │    └─────────────┘ └─────────────┘                                   │   │
│  │    [Ir para Financeiro]                                              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  ┌──────────────────────────────────────┐                            │   │
│  │  │ /fin ← (command palette popup)       │                            │   │
│  │  │  💰 Financeiro - Ver dashboard       │                            │   │
│  │  │  📦 Pedidos - Ver status             │                            │   │
│  │  └──────────────────────────────────────┘                            │   │
│  │                                                                      │   │
│  │  Pergunte sobre financeiro, pedidos...                     [📎][⌘] [→] │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────┐                               │
│  │ [Financeiro] [Pedidos] [Receita] [Despesas]  ← quick actions           │
│  └──────────────────────────────────────────┘                               │
│                                                                              │
│                    ┌─────────────────────────────┐                          │
│                    │ NBL • Pensando...  ● ● ●    │  ← floating indicator   │
│                    └─────────────────────────────┘                          │
│                                                                              │
│  🔵 (glow effect following mouse - subtle)                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Entregáveis

### 1. Novos Arquivos
- `src/hooks/useAutoResizeTextarea.ts`
- `src/components/chat/CommandPalette.tsx`
- `src/components/chat/TypingIndicatorFloating.tsx`

### 2. Arquivos Refatorados
- `src/pages/Chat.tsx` (redesign completo)
- `src/components/chat/ChatInput.tsx` (versão animada)
- `src/index.css` (adicionar .chat-grid-bg e lab-bg)

### 3. Arquivos Mantidos
- `src/hooks/useChatbot.ts` (sem alterações)
- `src/components/chat/ChatMessage.tsx` (sem alterações)

---

## CSS Adicional

```css
/* Adicionar ao index.css */

.chat-grid-bg {
  background-image: 
    linear-gradient(to right, hsl(var(--border) / 0.1) 1px, transparent 1px),
    linear-gradient(to bottom, hsl(var(--border) / 0.1) 1px, transparent 1px);
  background-size: 24px 24px;
}

.lab-bg::before {
  overflow: hidden;
  max-width: 100vw;
  max-height: 100vh;
  box-sizing: border-box;
}

/* Ripple animation for command buttons */
@keyframes ripple {
  0% { transform: scale(0.5); opacity: 0.6; }
  100% { transform: scale(2); opacity: 0; }
}
```

---

## Dependências

Todas já instaladas:
- `framer-motion` ✅
- `lucide-react` ✅

---

## Sequência de Implementação

1. Criar hook `useAutoResizeTextarea`
2. Criar componente `CommandPalette`
3. Criar componente `TypingIndicatorFloating`
4. Refatorar `ChatInput` com animações
5. Refatorar página `Chat.tsx` completa
6. Adicionar CSS ao `index.css`
7. Testar fluxo completo

---

## Critérios de Sucesso

- [ ] Grid background visível
- [ ] Glow effect seguindo mouse
- [ ] Command palette funciona com `/` + navegação por teclado
- [ ] Input expande automaticamente
- [ ] Mensagens renderizam com animações
- [ ] Typing indicator flutuante aparece durante loading
- [ ] Quick action buttons funcionam
- [ ] Integração com useChatbot mantida
- [ ] Responsivo em mobile

