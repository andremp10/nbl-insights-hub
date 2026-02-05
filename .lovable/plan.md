
# Plano: Dashboard + Chatbot NLQ — Gráfica NBL

## Resumo Executivo
Criar um dashboard financeiro e de pedidos completo no Lovable com tema dark mode premium, mobile-first, integrado a um chatbot de linguagem natural via webhook n8n. O sistema será protegido por senha simples e consumirá dados exclusivamente das Views SQL existentes.

---

## 🗄️ Mapeamento de Dados (Documentação das Views)

### View: `vw_dashboard_financeiro`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | ID único do lançamento |
| `descricao` | varchar | Descrição do lançamento |
| `valor` | numeric | Valor absoluto (sempre positivo) |
| `data` | date | Data de competência (pagto ou emissão) |
| `tipo` | text | `'Entrada'` ou `'Saída'` |
| `categoria` | varchar | Nome da categoria (ou "Sem Categoria") |
| `categoria_id` | uuid | ID da categoria |
| `status` | text | `0`=Cancelado, `1`=Pendente, `2`=Pago |

**Filtros já aplicados na view:**
- ✅ Transferências internas excluídas (`categoria_id != 'c38d3ba0-...'`)

### View: `vw_dashboard_pedidos`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `pedido_id` | uuid | ID do pedido |
| `cliente_id` | uuid | ID do cliente |
| `cliente_nome` | text | Nome normalizado (PF ou PJ) |
| `data_criacao` | timestamp | Data de criação do pedido |
| `status_pedido` | text | `Em Análise`, `Em Produção`, `Enviado`, `Problema no Arquivo`, `Finalizado` |
| `qtde_itens` | integer | Quantidade de itens |
| `valor_total` | numeric | Valor total do pedido |
| `frete_valor` | numeric | Valor do frete |
| `is_finalizado` | boolean | Se o pedido foi concluído |
| `is_atrasado` | boolean | Se está em atraso |
| `dias_em_atraso` | integer | Dias de atraso |

---

## 🏗️ Arquitetura da Solução

```
┌─────────────────────────────────────────────────────────┐
│                    USUÁRIO (Mobile/Desktop)              │
│                          ↓                               │
│    ┌─────────────────────────────────────────────────┐  │
│    │           LOVABLE (React + Tailwind)             │  │
│    │  ┌──────────┬──────────┬──────────┬──────────┐  │  │
│    │  │  Auth    │ Financ.  │ Pedidos  │  Chat    │  │  │
│    │  │ (senha)  │Dashboard │Dashboard │   NLQ    │  │  │
│    │  └────┬─────┴────┬─────┴────┬─────┴────┬─────┘  │  │
│    │       │          │          │          │        │  │
│    └───────┼──────────┼──────────┼──────────┼────────┘  │
│            │          │          │          │            │
│    ┌───────▼──────────▼──────────▼──────────┘           │
│    │              SUPABASE                               │
│    │    vw_dashboard_financeiro                         │
│    │    vw_dashboard_pedidos                            │
│    └────────────────────────────────────────────────────┘
│                                    │
│                          ┌─────────▼─────────┐
│                          │   n8n WEBHOOK     │
│                          │ (Agente NLQ)      │
│                          └───────────────────┘
└─────────────────────────────────────────────────────────┘
```

---

## 📱 Estrutura de Páginas e Navegação

### Página 1: `/auth` — Acesso com Senha Simples
- Tela única com campo de senha
- Senha armazenada no LocalStorage após validação
- Redirecionamento para `/financeiro`

### Página 2: `/financeiro` — Dashboard Financeiro
**Sidebar retrátil** com links para:
- Financeiro (ativo)
- Pedidos
- Chat

**Conteúdo:**
1. **Filtro de período global** (afeta tudo)
   - Atalhos: "Mês Atual", "Últimos 30 dias"
   - Seletor de período personalizado (datepicker)

2. **KPIs (3 cards)**
   - 💰 **Receita Total** = SUM(valor) onde tipo='Entrada' e status='2' (pagos)
   - 💸 **Despesas Totais** = SUM(valor) onde tipo='Saída' e status='2'
   - 📊 **Resultado Líquido** = Receita - Despesa (verde se positivo, vermelho se negativo)

3. **Gráfico Donut — Composição de Custos**
   - Fonte: Saídas agrupadas por categoria
   - Fatias < 2% consolidadas em "Outros"
   - Legenda abaixo, cores harmônicas

4. **Gráfico Barras Horizontais — Top 10 Categorias de Despesas**
   - Ordenado do maior para menor
   - Tooltip com valor e percentual

5. **Lista de Transações**
   - Colunas: Data | Descrição | Categoria | Valor (colorido por tipo)
   - Badge de status: 🟢 Pago | 🟡 Pendente | 🔴 Cancelado
   - Paginação (20 por página)

### Página 3: `/pedidos` — Dashboard de Pedidos
**Conteúdo:**
1. **Mesmo filtro de período global**

2. **KPIs (4 cards)**
   - 📦 **Total de Pedidos** = COUNT(*)
   - 💵 **Faturamento** = SUM(valor_total)
   - 🚀 **Em Produção** = COUNT onde status_pedido='Em Produção'
   - ⚠️ **Atrasados** = COUNT onde is_atrasado=true

3. **Gráfico Pizza — Status dos Pedidos**
   - Distribuição por status_pedido

4. **Gráfico Barras Horizontais — Top 10 Clientes**
   - Agrupado por cliente_nome, soma de valor_total
   - Ordenado do maior para menor

5. **Lista de Pedidos Recentes**
   - Colunas: Data | Cliente | Status | Valor | Itens
   - Badge de status colorido
   - Link para expandir detalhes

### Página 4: `/chat` — Chatbot NLQ
**Conteúdo:**
- Interface de chat estilo mensageria
- Balões de conversa (usuário à direita, bot à esquerda)
- Campo de input na parte inferior
- Integração com webhook n8n

**Comportamento:**
- Envio via POST ao endpoint do n8n
- Resposta parseada e exibida com:
  - Texto principal
  - Highlights (números em destaque)
  - Suggested actions (botões para navegar/filtrar)
  - Chart payloads (gráficos inline quando aplicável)

---

## 🎨 Design System (Dark Mode Premium)

| Elemento | Cor |
|----------|-----|
| Background | `#0e1117` |
| Card/Surface | `#1a1f2e` |
| Border | `#2d3548` |
| Text Primary | `#f1f5f9` |
| Text Secondary | `#94a3b8` |
| Accent (Entrada/Positivo) | `#22c55e` (green-500) |
| Accent (Saída/Negativo) | `#ef4444` (red-500) |
| Primary (botões) | `#3b82f6` (blue-500) |
| Chart Colors | Paleta harmônica (8-10 cores) |

**Tipografia:** Inter/System fonts, legível em mobile

---

## 🔗 Integração Webhook n8n

**Endpoint:** `POST https://chez-n8n-webhook.jsf0kc.easypanel.host/webhook/4831bc34-510b-46f1-a3e5-96299a45fab6`

**Payload de Request:**
```json
{
  "app": "grafica_nbl_lovable",
  "session_id": "uuid-gerado-no-front",
  "timezone": "America/Fortaleza",
  "message": "Quanto foi o faturamento em janeiro?",
  "context": {
    "date_range": { "from": "2026-01-01", "to": "2026-01-31" },
    "active_module": "financeiro"
  }
}
```

**Tratamento de Resposta:**
- `ok: true` → Renderiza resposta estruturada
- `ok: false` → Exibe mensagem de erro amigável
- Timeout (10s) → "O assistente está demorando para responder..."

---

## 📋 Entregáveis (Ordem de Implementação)

### Fase 1: Estrutura Base
1. Configurar tema dark mode no Tailwind
2. Criar layout com Sidebar retrátil (mobile-first)
3. Implementar página de autenticação por senha simples
4. Criar componente de filtro de período global

### Fase 2: Dashboard Financeiro
5. Criar cards de KPI reutilizáveis
6. Implementar gráfico Donut (Recharts)
7. Implementar gráfico Barras Horizontais
8. Criar tabela de transações com paginação
9. Conectar tudo à view `vw_dashboard_financeiro`

### Fase 3: Dashboard Pedidos
10. Criar KPIs específicos de pedidos
11. Implementar gráfico Pizza de status
12. Implementar ranking de clientes
13. Criar tabela de pedidos
14. Conectar à view `vw_dashboard_pedidos`

### Fase 4: Chatbot NLQ
15. Criar interface de chat
16. Implementar integração com webhook
17. Criar componentes de resposta estruturada
18. Implementar suggested actions
19. Adicionar loading states e tratamento de erros

### Fase 5: Polimento
20. Otimizar para mobile (testes responsivos)
21. Adicionar loading skeletons
22. Melhorar animações e transições
23. Testes de consistência numérica (chat vs dashboard)

---

## ✅ Critérios de Sucesso

- [ ] Dashboard carrega em < 2 segundos
- [ ] Filtro de período afeta todos os componentes
- [ ] Números do chat batem com dashboard no mesmo período
- [ ] Interface legível e funcional em mobile
- [ ] Gráficos responsivos e com tooltips
- [ ] Tratamento de erros em todas as requisições
- [ ] Senha protege acesso à aplicação
