
# Plano: Ajustes Edge Function + Integração Views SQL + Layouts

## Diagnóstico Completo

### 1. Causas Raiz Identificadas

#### 1.1 Edge Function - TIMEOUT (CRÍTICO)
**Evidência nos logs:**
```
2026-02-05T01:50:37Z ERROR [nlq-proxy] Fetch error: TIMEOUT
2026-02-05T01:50:17Z INFO [nlq-proxy] Forwarding to n8n...
```
- **Causa**: Timeout atual de 20 segundos (`setTimeout(() => controller.abort(), 20000)`)
- **Problema**: O n8n usa "Respond to Webhook" que pode demorar até 10 minutos para processar

#### 1.2 Views SQL - FILTRO DE DATAS (CRÍTICO)
**Evidência nos logs de rede:**
```
GET vw_dashboard_financeiro?data=gte.2026-02-01&data=lte.2026-02-28
Response Body: []
```
- **Causa**: O front filtra por `2026-02-01` a `2026-02-28` (mês atual do sistema)
- **Dados reais**: Existem 95.589 registros de 2019 a 2026
- **Query que funciona**: Dados existem em 2020-2023 (maioria)

#### 1.3 Layouts "Tortos"
- Sidebar e header estão corretos
- O problema visual é que **os dashboards aparecem vazios** porque não há dados no período atual
- Quando há dados, os layouts funcionam normalmente

### 2. Views SQL - Status

#### vw_dashboard_financeiro (OK)
Colunas confirmadas:
- `id` (uuid) ✅
- `descricao` (varchar) ✅
- `valor` (numeric) ✅
- `data` (date) ✅
- `tipo` (text) ✅
- `categoria` (varchar) ✅
- `categoria_id` (uuid) ✅
- `status` (text: '0', '1', '2') ✅

#### vw_dashboard_pedidos (OK)
Colunas confirmadas:
- `pedido_id` (uuid) ✅
- `cliente_id` (uuid) ✅
- `cliente_nome` (text) ✅
- `data_criacao` (timestamp) ✅
- `status_pedido` (text) ✅
- `qtde_itens` (int) ✅
- `valor_total` (numeric) ✅
- `frete_valor` (numeric) ✅
- `is_finalizado` (bool) ✅
- `is_atrasado` (bool) ✅
- `dias_em_atraso` (int) ✅

**RLS/Permissões**: As views estão acessíveis (status 200 nas requisições)

---

## Plano de Correção

### Fase 1: Edge Function com Timeout de 10 Minutos

#### 1.1 Atualizar `supabase/functions/nlq-proxy/index.ts`

Mudanças necessárias:
1. Aumentar timeout para **600.000ms** (10 minutos)
2. Adicionar logs de duração
3. Melhorar tratamento de erros com códigos específicos
4. Manter webhook URL no código (sem secrets adicionais necessários)

```typescript
// Principais mudanças:
const TIMEOUT_MS = 600000; // 10 minutos

// Adicionar tracking de tempo
const startTime = Date.now();

// Timeout com AbortController
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

// Logs melhorados
console.log(`[nlq-proxy] Request completed in ${Date.now() - startTime}ms`);
```

#### 1.2 Códigos de Erro Padronizados
- `TIMEOUT` - Excedeu 10 minutos
- `UPSTREAM_ERROR` - n8n retornou erro HTTP
- `BAD_RESPONSE` - JSON inválido
- `BAD_REQUEST` - Falta campo obrigatório
- `NETWORK_ERROR` - Erro de conexão

### Fase 2: Ajustar Filtro de Datas

#### 2.1 Atualizar `src/contexts/DateFilterContext.tsx`

O problema é que o filtro padrão ("mês atual") usa datas de 2026, mas os dados estão em 2020-2023.

**Solução**: Adicionar preset "Todo Período" como padrão inicial, OU ajustar para mostrar dados de 2023 por padrão.

```typescript
// Opção 1: Preset "Todo Período"
case 'all_time':
  return {
    from: new Date('2019-01-01'),
    to: new Date(),
  };

// Opção 2: Usar ano de 2023 como padrão (onde há mais dados)
case 'current_month':
  return {
    from: new Date('2023-01-01'),
    to: new Date('2023-12-31'),
  };
```

**Recomendação**: Criar preset "Ano 2023" e torná-lo o padrão, pois é onde há dados mais completos.

#### 2.2 Atualizar `src/components/layout/DateFilterBar.tsx`

Adicionar opções de preset:
- Mês Atual (atual)
- Últimos 30 dias (atual)
- **Ano 2023** (novo - com dados reais)
- **Todo Período** (novo)
- Personalizado (atual)

### Fase 3: Melhorias no Frontend (Hook useChatbot)

#### 3.1 Atualizar `src/hooks/useChatbot.ts`

O hook atual está correto, mas pode melhorar:
1. Adicionar indicador de progresso para operações longas
2. Melhorar mensagens de erro com base no código retornado

```typescript
// Mensagens de erro mais claras
const errorMessages = {
  TIMEOUT: 'O assistente demorou mais de 10 minutos. Tente uma pergunta mais simples.',
  UPSTREAM_ERROR: 'O assistente está com problemas. Tente novamente em alguns minutos.',
  BAD_RESPONSE: 'Resposta inesperada do assistente.',
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet.',
};
```

### Fase 4: Ajustes de Layout

#### 4.1 Estado Vazio nos Dashboards

Atualizar componentes para mostrar mensagem clara quando não há dados:
- `src/pages/Financeiro.tsx`
- `src/pages/Pedidos.tsx`
- `src/components/dashboard/DonutChart.tsx`
- `src/components/dashboard/HorizontalBarChart.tsx`

```typescript
// Exemplo de empty state
{data.length === 0 && (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <p className="text-muted-foreground">
      Nenhum dado encontrado no período selecionado.
    </p>
    <Button variant="link" onClick={() => setPreset('all_time')}>
      Ver todo período
    </Button>
  </div>
)}
```

---

## Entregáveis

### 1. Edge Function Atualizada
- Arquivo: `supabase/functions/nlq-proxy/index.ts`
- Timeout: 10 minutos (600.000ms)
- Logs detalhados com duração
- Tratamento de erros robusto

### 2. Contexto de Datas Atualizado
- Arquivo: `src/contexts/DateFilterContext.tsx`
- Novo preset: `year_2023` (padrão)
- Novo preset: `all_time`

### 3. Barra de Filtros Atualizada
- Arquivo: `src/components/layout/DateFilterBar.tsx`
- Botões para novos presets

### 4. Hook do Chat Melhorado
- Arquivo: `src/hooks/useChatbot.ts`
- Mensagens de erro específicas

### 5. Empty States nos Dashboards
- Arquivos: Financeiro.tsx, Pedidos.tsx, DonutChart.tsx, HorizontalBarChart.tsx
- Mensagens claras quando não há dados

---

## Sequência de Execução

1. **Edge Function** - Atualizar timeout para 10 minutos
2. **DateFilterContext** - Adicionar novos presets
3. **DateFilterBar** - Adicionar botões para novos presets
4. **useChatbot** - Melhorar mensagens de erro
5. **Deploy e Teste** - Verificar Edge Function nos logs
6. **Dashboards** - Adicionar empty states (se necessário)

---

## Testes de Validação

### Teste 1: Edge Function
1. Ir para `/chat`
2. Enviar: "Olá"
3. Aguardar resposta (pode demorar até 10 min)
4. Verificar logs no Supabase

### Teste 2: Views SQL
1. Alterar filtro para "Ano 2023"
2. Dashboard Financeiro deve mostrar dados
3. Dashboard Pedidos deve mostrar dados

### Teste 3: Chat com Dados
1. Filtro em "Ano 2023"
2. Perguntar: "Quanto foi a receita do mês atual?"
3. Perguntar: "Top 5 despesas"
4. Verificar se respostas são coerentes com dashboard

---

## Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Timeout de 10 min no Supabase Edge | Baixa | Edge Functions suportam até 150s por padrão. Pode ser necessário ajustar configuração ou usar streaming |
| n8n não responde mesmo com 10 min | Média | Adicionar retry automático ou mensagem para tentar novamente |
| Dados desatualizados (2023) | Alta | Informar usuário que dados são históricos |

### Importante sobre Edge Function Timeout

O Supabase Edge Functions tem um limite padrão de **150 segundos** para execução. Para timeout de 10 minutos, precisamos:

1. **Opção A**: Configurar timeout estendido no `supabase/config.toml`:
```toml
[functions.nlq-proxy]
verify_jwt = false
```

2. **Opção B**: Implementar padrão de polling (o front faz várias requisições curtas até obter resposta)

**Recomendação**: Implementar primeiro com timeout de 150s e avaliar se é suficiente para a maioria dos casos.

---

## Critérios de Sucesso

- [ ] Edge Function não retorna TIMEOUT para perguntas simples
- [ ] Dashboards mostram dados quando filtro está em período com dados
- [ ] Chat responde corretamente a perguntas básicas
- [ ] Logs da Edge Function mostram duração e status
- [ ] Empty states claros quando não há dados no período
