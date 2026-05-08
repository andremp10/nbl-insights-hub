# Plano: Espera Visual Premium no Chat

## Diagnóstico do estado atual
Hoje a espera tem dois estados, ambos pobres visualmente:

1. **`showThinking`** (antes de chegar qualquer step): apenas uma `chat-shimmer-bar` cinza fininha com texto "Analisando…". Visual de loader genérico.
2. **`AgentSteps`**: caixa cinza (`bg-muted/30`) com lista de steps + spinner `Loader2` + check verde. Funcional mas sem alma — parece debug log.

Não há identidade NBL, nenhuma referência ao tema laranja (#E8501A), nenhum sentido de "agente trabalhando para você".

## Proposta de redesign

### A. Container "Agente em ação" unificado
Substituir os dois estados separados por **um único componente** `AgentThinking` que evolui:
- **Fase 1 (sem steps):** ícone "N" do assistente pulsa com halo laranja + barra de progresso indeterminada animada (gradient laranja → transparente deslizando) + label rotativo ("Conectando ao agente…", "Interpretando sua pergunta…", "Buscando dados…").
- **Fase 2 (com steps):** transição suave para timeline vertical com os passos reais.

### B. Timeline vertical premium (substitui AgentSteps atual)
Layout estilo "tracker" com linha vertical conectando os passos:

```text
●─── Interpretando intenção         0.4s
│
●─── Consultando vw_dashboard_…     1.2s
│
◉─── Compondo resposta              [spinner laranja + shimmer]
```

- **Step concluído:** bolinha laranja sólida (`bg-primary`) com check branco micro, texto em `foreground/70`, duração à direita em mono.
- **Step ativo:** bolinha com **ring laranja pulsante** (animate-ping) + texto em `foreground` com **shimmer sutil de gradiente** passando por baixo + cronômetro vivo.
- **Step futuro (se backend mandar):** bolinha vazada `border-border`.
- **Linha conectora:** vertical 1px `bg-border/40`, do passo concluído pinta progressivamente em `bg-primary/40`.
- Sem fundo cinza pesado: usar `bg-card/40` com `border-l-2 border-primary/30` (acento lateral laranja sutil que reforça marca).

### C. Micro-detalhes que fazem diferença
1. **Halo do avatar "N"** no header do bot pulsa em laranja enquanto está pensando (`animate-pulse` + `shadow-[0_0_20px_hsl(var(--primary)/0.4)]`).
2. **Shimmer real**: gradient `from-transparent via-primary/20 to-transparent` deslizando 1.5s loop sobre o passo ativo (keyframe `shimmer-slide`).
3. **Cronômetro total** discreto no topo direito do bloco (`⏱ 3.2s`), tabular-nums, mono — sensação de produto técnico, não loader genérico.
4. **Mensagem de soft-timeout** (>15s) com ícone clock laranja em vez do texto cinza atual.
5. **Transição de saída suave**: quando a resposta chega, o bloco de steps faz fade+slide-up (200ms) e o markdown entra com fade-in — nada de "pop" abrupto.

### D. Estado vazio (Fase 1 sem steps ainda)
Substitui o `chat-shimmer-bar` atual por:
- Avatar "N" com halo pulsante.
- 3 dots laranja em sequência (estilo "typing") + label rotativo a cada 2s ciclando frases predefinidas em pt-BR.
- Microcopy útil: "Costuma levar de 3 a 8 segundos." abaixo, em `text-[10px] muted/50`.

## Arquivos a alterar

1. **`src/components/chat/AgentSteps.tsx`** — reescrita completa para timeline vertical com bolinhas, linha conectora, shimmer no ativo, cronômetro total.
2. **`src/components/chat/ChatMessage.tsx`** — substituir o bloco `showThinking` (atualmente `chat-shimmer-bar`) por novo componente `AgentThinking` (dots + label rotativo + halo). Remover `ThinkingBubble` legado se não usado.
3. **`src/index.css`** — adicionar keyframes `shimmer-slide`, `halo-pulse`, e classes utilitárias `.agent-step-active`, `.agent-timeline-line`.
4. **`src/components/chat/ThinkingBubble.tsx`** — deletar (não está em uso ativo no fluxo principal).

## Aspecto técnico (resumo)
- Nenhum framework novo; tudo CSS + Tailwind + ícones lucide já presentes.
- Manter `memo` em ambos os componentes para não rerenderizar a cada token streaming.
- Cronômetro continua usando `setInterval(1000)` já existente; sem custo extra.
- Cores 100% via tokens HSL existentes (`--primary`, `--border`, `--muted`) — respeita dark/light automaticamente.
- Acessibilidade: `aria-live="polite"` no container para leitores de tela narrarem "Consultando dados…".

## Resultado esperado
A espera deixa de parecer "loading bar de site qualquer" e passa a comunicar: **"um agente especialista está trabalhando para você, em etapas, com transparência"** — coerente com o posicionamento B2B/terminal premium da NBL.
