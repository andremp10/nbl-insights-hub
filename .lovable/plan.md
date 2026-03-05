

# Plano — Corrigir fundo da sidebar do assistente

## Problema

O `auth-grid-bg` esta aplicado ao container pai do Chat (`flex flex-1 min-h-0 overflow-hidden auth-grid-bg`), o que faz o fundo grid/glow vazar para a sidebar de sessoes tambem. A sidebar deve ter um fundo solido (`bg-sidebar-background`) sem o efeito de grid.

## Solucao

Mover o `auth-grid-bg` do container pai para apenas a area de conteudo do chat (a div que contem as mensagens e o composer), deixando a sidebar com seu fundo solido original.

**Arquivo:** `src/pages/Chat.tsx`

- Remover `auth-grid-bg` do container pai (linha 148)
- Adicionar `auth-grid-bg` na div que envolve a area de mensagens/composer (a area a direita da sidebar)

Isso e uma alteracao de uma unica linha: mover a classe de um elemento para outro.

