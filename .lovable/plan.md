

# Plano — Chat Profissional (Inspirado no Claude/ChatGPT)

## Problemas Identificados

### Performance
1. **Framer Motion em todas as mensagens**: Cada `ChatMessage` usa `motion.div` com animacoes de entrada (`opacity`, `y`), causando re-renders constantes — visivel no session replay com centenas de mutacoes de `transform` por segundo
2. **Typewriter + RAF**: O hook `useTypewriter` dispara `setDisplayedText` a cada ~6ms, forcando re-render do componente inteiro incluindo markdown components e icones
3. **`markdownComponents` objeto recriado**: Apesar de estar fora do componente, cada `ChatMessage` monta um novo JSX tree com muitos componentes customizados

### Visual/UX (vs Claude/ChatGPT)
1. **Bolhas pesadas**: Bubbles com bordas arredondadas exageradas (18px) e fundo laranja forte parecem WhatsApp, nao um agente profissional
2. **Avatar redundante**: Bot icon em cada mensagem ocupa espaco e nao agrega — Claude e ChatGPT nao usam avatares por mensagem
3. **Espacamento excessivo**: `space-y-6` entre mensagens cria gaps desnecessarios
4. **ThinkingBubble basico**: Dots animados com frases rotativas parecem amadores vs o streaming progressivo do Claude
5. **Sem separacao visual clara**: User e assistant messages muito parecidas em peso visual
6. **Fundo grid no chat**: O `auth-grid-bg` no corpo do chat adiciona ruido visual

## Solucao Proposta

### A. Layout Claude-style (sem bolhas)

Substituir o modelo de "bolhas de chat" por layout limpo:

```text
┌──────────────────────────────────────────┐
│  Você                                     │
│  Qual o faturamento do mês?              │
│                                           │
│  ─────────────────────────────────────── │
│                                           │
│  Assistente NBL                           │
│  O faturamento total do mês de abril...  │
│  | Categoria | Valor |                   │
│  | Insumos   | R$ 12.000 |              │
│                                           │
│  _Período: 01/04 a 05/04_               │
└──────────────────────────────────────────┘
```

- **User messages**: Label "Voce" + texto simples, sem fundo colorido
- **Assistant messages**: Label "Assistente NBL" + texto fluido, sem borda/bubble
- **Separador sutil** entre mensagens (border-b fino ou espacamento)
- **Sem avatares** por mensagem (limpo como Claude)

### B. Otimizacao de Performance

1. **Remover framer-motion do ChatMessage**: Usar CSS `@keyframes` para fade-in leve (apenas na ultima mensagem), eliminando o overhead do motion runtime
2. **Typewriter mais eficiente**: Aumentar chunk size para 20+ chars e reduzir re-renders usando `useRef` + DOM manipulation direta em vez de `setState`
3. **Lazy markdown parsing**: So parsear markdown apos typewriter completar (ja faz isso, manter)
4. **Remover motion.div do Wrapper**: Usar `<div>` com classe CSS condicional

### C. ThinkingBubble Profissional

Substituir os dots por um indicador estilo Claude:
- Barra horizontal animada (shimmer) com texto "Analisando..."
- Sem rotacao de frases (distrai)
- Animacao CSS pura (sem framer-motion)

### D. Composer Refinado

- Remover `motion.button` do botao de envio (usar CSS transitions)
- Manter o design pill atual que ja esta bom

### E. CSS Clean-up

- Remover `.chat-bubble-user`, `.chat-bubble-assistant`, `.chat-bubble-error`
- Adicionar classes novas para o layout flat
- Remover `auth-grid-bg` do corpo do chat (fundo limpo)

## Arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/chat/ChatMessage.tsx` | Reescrever — layout flat sem bolhas, remover framer-motion, labels "Voce"/"Assistente NBL" |
| `src/components/chat/ThinkingBubble.tsx` | Reescrever — shimmer bar CSS-only, sem rotacao de frases |
| `src/pages/Chat.tsx` | Remover `auth-grid-bg`, ajustar espacamento (`space-y-1`), simplificar animation logic |
| `src/index.css` | Remover bubble styles, adicionar classes flat para mensagens, animacao CSS fade-in |
| `src/hooks/useTypewriter.ts` | Aumentar chunk size, otimizar para menos re-renders |

## Resultado Esperado

- Chat visualmente limpo e profissional como Claude/ChatGPT
- Menos overhead de animacao (CSS puro vs framer-motion)
- Typewriter mais fluido com menos re-renders
- Thinking state elegante e nao distrativo

