

# Plano — Corrigir formatacao de tabelas e conteudo no Chat

## Problema

As tabelas markdown das respostas do assistente estao aparecendo como texto bruto (pipes `|` visiveis) em vez de tabelas HTML formatadas. O `ReactMarkdown` com `remarkGfm` deveria parsear as tabelas, mas nao esta funcionando corretamente.

Alem disso, tabelas com celulas muito longas (descricoes de produtos) ficam ilegíveis dentro do chat bubble.

## Causa raiz provavel

O `remark-gfm` v4 pode ter problemas de carregamento ESM no bundle. Para garantir robustez, vou adicionar:

1. **Pre-processador de conteudo** que normaliza o markdown antes do parsing (garante linhas em branco antes/depois de tabelas)
2. **Fallback CSS** para caso as tabelas renderizem dentro de `<p>` tags (texto cru com pipes)
3. **Melhorias visuais** para tabelas longas (scroll horizontal, truncamento de celulas)

## Alteracoes

### A. `ChatMessage.tsx` — Pre-processar conteudo markdown

Criar funcao `normalizeMarkdown(content)` que:
- Garante linha em branco antes e depois de blocos de tabela (`| ... |`)
- Remove espacos extras que possam quebrar parsing de tabela
- Trunca celulas com mais de 80 caracteres (adiciona `...`)

### B. `ChatMessage.tsx` — Melhorar componentes de tabela

- Adicionar `max-width` e `text-overflow: ellipsis` nas celulas `td`
- Melhorar contraste visual dos headers
- Adicionar `overflow-x: auto` com scroll suave no container da tabela

### C. `index.css` — Estilos de fallback e polish

- Adicionar estilos para tabelas dentro de `.chat-bubble-assistant`
- Garantir que tabelas longas tenham scroll horizontal elegante
- Melhorar espaçamento entre blocos de conteudo (tabelas, paragrafos, headers)

### D. Verificar import do remarkGfm

- Garantir que o plugin esta sendo passado corretamente
- Adicionar log de debug temporario para confirmar que o plugin esta ativo

## Arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/chat/ChatMessage.tsx` | Adicionar `normalizeMarkdown`, melhorar componentes de tabela, truncar celulas longas |
| `src/index.css` | Estilos de polish para tabelas no chat |

