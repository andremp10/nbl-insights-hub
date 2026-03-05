

# Plano — Restaurar estrutura visual anterior + melhorar design

## Problema Identificado

A refatoracao anterior removeu elementos visuais importantes que existiam nos prints:

1. **Chat/Assistente**: Tinha icone Bot grande com badge "online", 6 sugestoes em grid 2x3 com icones e descricoes. Agora tem apenas texto simples sem icones.
2. **Home**: Os module tiles estao pequenos e sem destaque. O usuario quer cards GRANDES e proeminentes como "landing page" para as 3 abas.
3. **Sidebar**: Tinha "Insights Hub" subtitulo e label "MENU" — esses detalhes davam identidade.
4. **Pedidos/Financeiro**: KPIs estao OK nos prints, mantiveram a estrutura com icones coloridos. Pedidos tinha "Top 10 Clientes" chart.

## Mudancas

### 1. Home — Cards grandes como landing page

Reorganizar a Home para que os 3 cards de modulo sejam o **elemento principal e mais visivel**:
- Cards muito maiores (`p-6 md:p-8`) com icone grande, titulo forte, descricao e preview de dados
- Ocupar grid `md:grid-cols-3` com altura generosa
- Cada card com cor de destaque unica (borda superior ou lateral grossa)
- Hover com elevacao sutil
- Mover KPIs para **abaixo** dos cards grandes (secundarios)
- Manter barra de busca e chips acima dos cards
- Manter secao de atividade recente

### 2. ChatEmptyState — Restaurar layout anterior com icone e grid de sugestoes

Restaurar:
- Icone Bot grande centralizado com badge verde "online"
- Titulo "Assistente NBL Grafica"
- Subtitulo descritivo
- 6 sugestoes em grid 2x3 (nao 2x2), cada uma com icone + titulo + descricao curta
- Sugestoes relevantes ao escopo: faturamento, pedidos, producao, receita vs despesas, categorias de despesa, pagamentos pendentes

### 3. Sidebar — Restaurar "Insights Hub" e "MENU"

- Adicionar subtitulo "Insights Hub" abaixo de "NBL Grafica" no header
- Adicionar label "MENU" acima dos itens de menu (como nos prints)
- Manter o resto do design atual (esta OK)

### 4. Pedidos — Restaurar "Top 10 Clientes"

- Re-adicionar `HorizontalBarChart` de "Top 10 Clientes" em grid `md:grid-cols-2` ao lado do DonutChart de status
- Isso estava nos prints e foi removido indevidamente

### 5. Financeiro — OK como esta

A pagina Financeiro nos prints tem a mesma estrutura atual (3 KPIs + Composicao de Custos + Top Categorias). Nao precisa mudar.

## Arquivos

| Arquivo | Acao |
|---------|------|
| `src/pages/Home.tsx` | Cards de modulo grandes e proeminentes, reordenar layout |
| `src/components/chat/ChatEmptyState.tsx` | Restaurar icone Bot, 6 sugestoes com icones em grid |
| `src/components/layout/AppSidebar.tsx` | Adicionar "Insights Hub" e label "MENU" |
| `src/pages/Pedidos.tsx` | Re-adicionar HorizontalBarChart Top Clientes |

