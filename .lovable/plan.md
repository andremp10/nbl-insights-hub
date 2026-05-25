## Problema

No modo **rail** (sidebar recolhida) da tela `/chat`, hoje aparecem, de cima pra baixo:

1. Logo NBL
2. 4 ícones de navegação (Home / Assistente / Financeiro / Pedidos)
3. Botão expandir
4. Botão "+" laranja (nova conversa)
5. Botão buscar
6. **Lista vertical de até 8 ícones de balão** representando conversas recentes ← causa principal da poluição
7. Footer (novo usuário, tema, sair)

A coluna de 8 balõezinhos enfileirados (mais o ativo destacado) cria uma "fileira de cartas" sem nome, todos iguais, que polui visualmente sem agregar informação — o usuário não consegue distinguir uma conversa da outra só pelo ícone.

## Solução — Rail enxuto

Remover **completamente** a lista de conversas recentes do modo rail. Quem precisa ver conversas expande a sidebar (Ctrl+B ou clica no botão expandir, que já existe no topo e também no header do chat).

Rail novo (de cima pra baixo):

1. Logo NBL
2. 4 ícones de navegação do app
3. Separador
4. Botão "+" nova conversa (CTA primário)
5. Botão expandir conversas (com tooltip "Ver conversas · Ctrl+B")
6. (sem busca separada — a busca está dentro do painel expandido; o atalho Ctrl+K já abre)
7. `flex-1` vazio empurra footer pra baixo
8. Footer: tema + sair (e novo usuário se master) — **apenas ícones**, sem texto

Ganhos:
- ~60% menos elementos na coluna
- Hierarquia clara: marca → navegar → criar/expandir → conta
- Sem repetição visual de balões idênticos

## Fora de escopo
- Modo expandido (já está limpo após o último ajuste)
- Modo mobile
- Sidebar de outras páginas

## Arquivos afetados
- `src/components/chat/SessionsSidebar.tsx` — bloco do `if (mode === 'rail')`: remover loop de `recent.map(...)` e o botão de busca redundante; manter brand, nav, "+" e expandir, footer
