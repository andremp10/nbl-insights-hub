

# Refatoracao — Chat do Assistente NBL (B2B Moderno)

Escopo: apenas a pagina de chat e seus componentes. Nenhuma outra pagina e tocada.

---

## Estrutura Final

```text
┌─────────────────────────────────────────────────────────┐
│  HEADER FIXO (compact)                                  │
│  [≡] Assistente NBL  [●Conectado]    [+Nova] [Exportar] │
├──────────┬──────────────────────────────────────────────┤
│ Sessions │  CORPO CENTRAL (max-w-[860px])               │
│ Sidebar  │                                              │
│ (colaps) │  Empty: titulo + descricao + grid chips      │
│          │        + "Modelos rapidos" cards              │
│          │                                              │
│          │  Msgs: bolhas user/assistant                  │
│          │        assistant = card estruturado           │
│          │                                              │
│          ├──────────────────────────────────────────────┤
│          │  COMPOSER                                    │
│          │  [chips periodo] [chips intencao] [toggle]   │
│          │  [textarea multilinha]          [Enviar]     │
│          │  Enter envia · Shift+Enter nova linha        │
└──────────┴──────────────────────────────────────────────┘
```

---

## Mudancas por Arquivo

### 1. `src/pages/Chat.tsx` — Header fixo + composer com chips

**Header fixo** (novo, acima do corpo):
- Flex row: icone Bot + "Assistente NBL" `text-base font-semibold`
- Badge de status: `Conectado` (verde) quando idle, `Consultando...` (amarelo pulse) quando `sending`, `Erro` (vermelho) quando ultimo msg e error
- Direita: botoes icon-only — "Nova conversa" (Plus), "Exportar" (Download), "Limpar" (Trash2)
- `border-b border-border bg-background sticky top-0 z-10`

**Composer refatorado** (substituir `ChatInputInline`):
- Barra de chips ACIMA do textarea:
  - Periodo: `Ultimos 7d`, `Ultimos 30d`, `Este mes` — clicaveis, preenchem prefixo no input
  - Intencao: `Resumo`, `Comparar`, `Listar` — idem
  - Toggle: `Curta` / `Detalhada` (visual only, appended ao msg como hint)
- Textarea multilinha (mesmo comportamento atual)
- Botao Enviar sempre visivel

**Corpo central**: manter `max-w-[860px]` (de 720px atual via max-w-3xl)

### 2. `src/components/chat/ChatEmptyState.tsx` — Redesenho completo

- Manter icone Bot com badge online
- Titulo: "Assistente NBL" + 2 linhas explicando como perguntar
- Grid de chips clicaveis (8 exemplos curtos) em 2 colunas sm / 4 colunas md
- Secao "Modelos rapidos": 3 cards maiores (Resumo Financeiro, Status Pedidos, Top Clientes) — cada um envia uma query pronta ao clicar

### 3. `src/components/chat/ChatMessage.tsx` — Respostas estruturadas

- Manter renderizacao markdown atual (ja funciona bem)
- Adicionar footer de acoes rapidas: chips "Refinar periodo", "Top 10", "Agrupar por status" — visíveis em toda resposta de assistant (nao user)
- Copiar: ja existe, manter
- Erro: manter botao "Tentar novamente" + adicionar texto "Tente reduzir o periodo da consulta"

### 4. `src/components/chat/ThinkingBubble.tsx` — Estados mais claros

- Manter animacao de dots + frases rotativas (ja esta bom)
- Adicionar badge "Consultando banco..." no header (via status badge no header, nao aqui)

### 5. `src/index.css` — Ajuste de bolhas

- `chat-bubble-assistant`: reduzir border-radius para `12px 12px 12px 4px` (mais sutil, menos "chat messenger")

---

## Arquivos Editados

| Arquivo | Acao |
|---------|------|
| `src/pages/Chat.tsx` | Header fixo com status badge, composer com chips de periodo/intencao, max-w-[860px] |
| `src/components/chat/ChatEmptyState.tsx` | Grid de chips + modelos rapidos cards |
| `src/components/chat/ChatMessage.tsx` | Footer com chips de acao rapida nas respostas |
| `src/index.css` | Border-radius mais sutil nas bolhas |

Nenhum arquivo novo. Nenhuma mudanca de hook/backend.

