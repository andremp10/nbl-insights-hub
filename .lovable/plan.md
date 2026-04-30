# Correção: nomes truncados em tabelas do chat

## Diagnóstico

Na imagem, a tabela **"Produtos dos maiores pedidos"** mostra nomes cortados como `Caixas Brilho de Deusa | Tamanho Fechado 12...`. O mesmo acontece com nomes de vendedores em outras respostas.

A causa está em `src/components/chat/ChatMessage.tsx` (linhas 60–78), no renderer de `<td>` do Markdown:

1. **Truncamento por JS**: textos com mais de 80 caracteres são cortados para 77 + `…` (linha 64).
2. **Truncamento por CSS**: classe `truncate` (= `overflow:hidden; text-overflow:ellipsis; white-space:nowrap`) combinada com `max-w-[280px]` (linha 68/70) corta visualmente qualquer célula longa em uma única linha.
3. O título completo só aparece em hover (`title={textStr}`), o que é ruim de UX para nomes de produtos/vendedores.

A tabela já está dentro de um wrapper com `overflow-x-auto` (linha 44), então não há motivo para forçar truncamento — o scroll horizontal já existe. Para nomes longos, o ideal é **permitir wrap** (quebra de linha) em células de texto, mantendo `whitespace-nowrap` apenas em células numéricas.

## Mudanças

**Arquivo: `src/components/chat/ChatMessage.tsx`** (renderer `td`, linhas 60–78)

- Remover o corte por JS de 80 caracteres.
- Remover `truncate` das células de texto.
- Trocar `max-w-[280px]` por um limite mais generoso e permitir quebra: `max-w-[420px] whitespace-normal break-words` para texto; manter `whitespace-nowrap` para numéricos.
- Manter `align-middle` e `title` (acessibilidade) com o conteúdo completo apenas como fallback opcional.

Resultado: nomes longos de produtos (ex.: `Caixas Brilho de Deusa | Tamanho Fechado 12x8x4`) e nomes completos de vendedores aparecem em 2 linhas dentro da célula, sem `…`. Colunas numéricas (Quantidade, Valor) continuam alinhadas à direita em linha única.

## Fora de escopo

- Nenhuma mudança em backend/edge functions.
- Nenhuma mudança em hooks de dados ou views.
- Nenhuma mudança no agente n8n (a resposta já contém os nomes completos; o problema é puramente de renderização).
