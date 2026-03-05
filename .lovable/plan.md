

# Plano — Refatorar Home como Portal B2B Moderno

## Visao Geral

Reescrever `src/pages/Home.tsx` como um portal de entrada limpo e direto. Adicionar um fundo sutil no dark mode via CSS para quebrar o preto puro.

Estrutura final da pagina (ordem vertical):

```text
┌─────────────────────────────────────────────────┐
│  HERO INSTITUCIONAL                             │
│  "Bem-vindo à plataforma de inteligência da NBL"│
│  Subtítulo 1 linha                              │
│  [Abrir Assistente]  [Ver Pedidos] [Financeiro] │
├─────────────────────────────────────────────────┤
│  3 CARDS COMPACTOS (row)                        │
│  Assistente | Pedidos | Financeiro              │
│  1 linha desc + →                               │
├─────────────────────────────────────────────────┤
│  PERGUNTE AO ASSISTENTE (compacto)              │
│  Input + 4 chips de pergunta pronta             │
├─────────────────────────────────────────────────┤
│  3 KPIs discretos (row)                         │
│  Pedidos em aberto | Atrasados | Resultado mês  │
├─────────────────────────────────────────────────┤
│  ATIVIDADE RECENTE (5 itens + Ver todos)        │
└─────────────────────────────────────────────────┘
```

---

## Mudancas

### 1. `src/pages/Home.tsx` — Reescrita completa

**Hero**:
- Titulo: "Bem-vindo a plataforma de inteligencia da NBL" (sem emoji, sem greeting dinamico)
- Subtitulo: "Consulte dados operacionais, acompanhe pedidos e visualize o financeiro em um so lugar."
- CTAs: botao primario "Abrir Assistente" (bg-primary), botoes secundarios "Ver Pedidos" e "Ver Financeiro" (variant outline)
- Compacto: `pt-10 pb-6` (menos altura que o atual `pt-12 pb-8 / pt-20 pb-12`)

**3 Cards compactos** (substituir os cards gigantes atuais):
- Grid 3 colunas, cada card com: icone pequeno (w-9 h-9) + titulo + 1 linha de descricao + ArrowRight
- Borda esquerda sutil (2px em vez de 4px)
- Sem preview de KPI nos cards (isso vai pra secao de KPIs propria)
- Padding reduzido: `p-4` em vez de `p-6 md:p-8`
- Sem gradientes de hover exagerados

**Bloco "Pergunte ao assistente"** (compacto, nao hero):
- Label: "Pergunte ao assistente" (text-sm)
- Input simples com placeholder + botao enviar
- 4 chips de sugestao estruturados (titulo curto, prompt completo como no chat)
- Sem ocupar mais que ~120px de altura

**3 KPIs** (reduzir de 5 para 3):
- "Pedidos em aberto" (totalPedidos), "Atrasados" (atrasados), "Resultado do mes" (resultado)
- Cards pequenos inline, sem grafico, sem ribbon largo
- Empty state: "Indicadores aparecerao quando houver dados"

**Atividade recente**: manter como esta, ja esta bom. Limitar a 4 itens.

### 2. `src/index.css` — Fundo sutil no dark mode

Adicionar um gradiente radial muito sutil no body dark para quebrar o preto puro:
```css
.dark body {
  background: hsl(var(--background));
  background-image: radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.03) 0%, transparent 60%);
}
```
Isso cria um brilho laranja quase imperceptivel no topo, dando profundidade sem parecer decorativo.

---

## Arquivos

| Arquivo | Acao |
|---------|------|
| `src/pages/Home.tsx` | Reescrita: hero institucional com CTAs, cards compactos, input assistente reduzido, 3 KPIs, atividade recente |
| `src/index.css` | Gradiente radial sutil no dark mode |

