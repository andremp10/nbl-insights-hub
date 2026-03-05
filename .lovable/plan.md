

# Plano — Melhorar renderizacao de metadados de periodo nas respostas do agente

## Problema

O agente retorna linhas de metadados como `*Períodos: 01/02/2026 a 29/02/2026 e 01/03/2026 a 31/03/2026 · Escopo: Faturamento (Comercial)*` que renderizam como texto italico simples — visualmente feio e sem hierarquia.

## Solucao

Interceptar o componente `em` (italico) no ReactMarkdown para detectar linhas de metadados (que contenham "Períodos:", "Escopo:", "Limitação:") e renderiza-las como badges/chips estilizados em vez de italico plano.

### Regras de deteccao e estilo

1. **Periodos/Escopo** (contem "Períodos:" ou "Escopo:"): renderizar como um chip compacto com fundo `bg-muted/50`, borda `border-border/50`, icone de calendario pequeno, texto `text-xs text-muted-foreground` — parece um badge de contexto, nao texto corrido.

2. **Limitacao/Aviso** (contem "Limitação:" ou "Nota:"): renderizar como um alerta sutil inline com fundo `bg-amber-500/10`, borda `border-amber-500/20`, icone de alerta, texto `text-xs text-amber-400`.

3. **Demais italicos**: manter `<em>` normal.

### Arquivo

| Arquivo | Acao |
|---------|------|
| `src/components/chat/ChatMessage.tsx` | Adicionar componente `em` customizado no ReactMarkdown que detecta e estiliza metadados |

