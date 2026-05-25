## Problema

1. **Sidebar dupla**: hoje a tela `/chat` mostra duas barras laterais em sequência — a `AppSidebar` (rail com hover do app inteiro) + a `SessionsSidebar` (conversas). Visualmente parece "duas bordas", consome largura e confunde.
2. **Tabelas com scroll horizontal constante**: nas respostas do assistente, tabelas com 4+ colunas (ex.: "Análise comparativa por cliente") forçam o usuário a arrastar para os lados o tempo todo. Causa: células com `whitespace-nowrap` em todas as colunas numéricas + `max-w-[460px]` em texto + padding generoso, dentro de um container de ~720px.

## Solução — Sidebar única no /chat

Na rota `/chat`, esconder a `AppSidebar` global e fazer da `SessionsSidebar` a **única** sidebar, incorporando dentro dela:

- **Header da marca** (logo NBL + "Insights Hub") no topo
- **Mini-nav de módulos** logo abaixo do header: 4 ícones horizontais (Home, Assistente, Financeiro, Pedidos) com tooltip e indicador do ativo. Compacto, uma linha só (~40px de altura).
- **CTA Nova conversa** (como hoje)
- **Busca + filtros de período** (como hoje)
- **Lista de sessões agrupadas** (como hoje)
- **Footer**: ThemeToggle + Sair + (Master) Novo usuário — pegando do `SidebarInner` atual

No modo `rail` (recolhido) e no modo `expanded`, a barra continua sendo única. Largura: 280px expandida, 56px rail (igual hoje).

Demais rotas (`/`, `/financeiro`, `/pedidos`) seguem usando a `AppSidebar` normal — só o `/chat` tem essa sidebar dedicada/unificada.

### Implementação técnica
- `AppLayout.tsx`: detectar `pathname === '/chat'` via `useLocation` e, nesse caso, **não renderizar** `<AppSidebar />` (deixar a página de chat ser dona da barra). Manter `MobileTopBar`.
- `SessionsSidebar.tsx`:
  - Adicionar no topo: logo + título "NBL Gráfica / Conversas"
  - Adicionar uma linha de 4 ícones de navegação (NavLink p/ `/`, `/chat`, `/financeiro`, `/pedidos`) com active state em primary
  - Adicionar footer com ThemeToggle, Sair, Novo usuário (reaproveitar lógica do `SidebarInner`)
  - No modo `rail`: continuar com a coluna vertical de ícones, mas incluir os 4 módulos no topo (antes dos atalhos de conversa)
- `Chat.tsx`: remover o `SidebarTrigger` mobile que apontava para a `AppSidebar` (não existe mais nessa rota); mobile usará o próprio botão de abrir conversas que já temos. Adicionar trigger mobile que abre essa sidebar única.
- Mobile (`< 768px`): a sidebar única vira sheet/drawer com tudo dentro (nav + conversas + footer).

## Solução — Tabelas que cabem no container

Em `ChatMessage.tsx` (componentes `td`/`th`/`table`):

- **Reduzir densidade**: padding `px-2 py-1.5`, fonte `text-[12px]` no body, header `text-[10px]`
- **Permitir quebra de linha em texto**: remover `max-w-[460px]` e usar `break-words` em todas as células de texto; manter `tabular-nums` apenas em células numéricas mas **sem** `whitespace-nowrap` quando o número for curto — para R$ longos manter `whitespace-nowrap`, e sim, só nelas.
- **Detecção mais inteligente de "numeric short"**: nowrap só quando string ≤ 12 chars; senão deixa quebrar.
- **Layout fixo opcional**: usar `table-fixed` quando houver >4 colunas para forçar distribuição equilibrada.
- **Tabela full-bleed dentro da conversa**: hoje o container é `max-w-3xl`. Para tabelas, deixar a tabela ocupar todo o width disponível do painel de chat (até `max-w-5xl` ou `100%`) — usar `chat-table-wrapper` com `-mx-2 sm:-mx-4 md:-mx-6` para expandir além do padding e ganhar ~120px extras antes de precisar de scroll. Quando ainda assim transbordar, mostra scroll horizontal nativo mas sem ser o caso comum.
- **Indicador visual de scroll** (sombras laterais com `mask-image`) só quando houver overflow real, para não dar a falsa impressão de "preciso arrastar".

## Fora de escopo
- Mudanças em backend, n8n ou views
- Redesign de outras páginas
- Mudança de paleta/tipografia

## Arquivos afetados
- `src/components/layout/AppLayout.tsx`
- `src/components/chat/SessionsSidebar.tsx`
- `src/pages/Chat.tsx`
- `src/components/chat/ChatMessage.tsx`
- `src/index.css` (utility de mask-shadow para tabelas, se necessário)
