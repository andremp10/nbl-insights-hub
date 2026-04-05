

# Plano — Acelerar Carregamento e Transicao de Paginas

## Diagnostico

Apos analise do codigo, identifiquei 5 causas principais de lentidao:

### 1. AnimatePresence mode="wait" bloqueia navegacao
Em `App.tsx`, o `AnimatePresence mode="wait"` forca a pagina antiga a completar a animacao de saida ANTES de iniciar a nova pagina. Isso cria um delay visivel de ~200ms onde nada acontece, mais o tempo do lazy load do chunk da nova pagina.

### 2. PageTransition com framer-motion em TODAS as rotas
Cada rota e envolvida em `<PageTransition>` que usa `motion.div` com `initial/animate/exit`. Combinado com o `mode="wait"`, toda navegacao fica: exit antigo (180ms) → carregar chunk → enter novo (180ms).

### 3. Home.tsx tem 4 motion.section com delays escalonados
A pagina Home usa `motion.section` em cada bloco (hero, cards, KPIs, atividade) com delays de 0 a 200ms. Isso atrasa a percepcao de carregamento — o usuario ve a pagina "vazia" enquanto as secoes animam sequencialmente.

### 4. Canvas da pagina Auth roda indefinidamente
O `DotMap` dentro de `travel-connect-signin-1.tsx` executa `requestAnimationFrame` em loop infinito, rediscutindo centenas de pontos e rotas a cada frame — mesmo quando o usuario ja esta digitando.

### 5. QueryClient sem configuracao global
O `QueryClient` e criado sem defaults. Isso significa `refetchOnWindowFocus: true` e `staleTime: 0` para TODAS as queries, causando refetches desnecessarios ao alternar abas ou voltar ao app.

## Solucao

### A. Remover AnimatePresence + PageTransition
**Arquivo:** `src/App.tsx`, `src/components/layout/PageTransition.tsx`

- Remover `AnimatePresence` completamente
- Substituir `PageTransition` por um wrapper CSS simples com `animation: fadeIn 0.15s ease-out`
- Resultado: navegacao instantanea, sem bloqueio de exit

### B. Substituir motion.section por CSS na Home
**Arquivo:** `src/pages/Home.tsx`

- Remover import de `framer-motion`
- Trocar `motion.section` por `<section>` com classes CSS de fade-in usando `animation-delay` via style
- Animacao CSS pura e muito mais leve que framer-motion

### C. Otimizar canvas do Auth (reduzir FPS)
**Arquivo:** `src/components/ui/travel-connect-signin-1.tsx`

- Limitar o loop de animacao a ~15 FPS em vez de 60 FPS (usar `setTimeout` dentro do RAF)
- Parar animacao quando rotas completam (apos ~15s nao precisa mais redesenhar dots estaticos)

### D. Configurar QueryClient com defaults globais
**Arquivo:** `src/App.tsx`

- Adicionar `staleTime: 2 * 60 * 1000` (2 min) como default global
- Adicionar `refetchOnWindowFocus: false`
- Isso evita refetches desnecessarios em TODAS as queries

### E. Remover motion.div do sidebar (layoutId)
**Arquivo:** `src/components/layout/AppSidebar.tsx`

- O `motion.div` com `layoutId="activeIndicator"` na sidebar executa animacao spring a cada navegacao
- Substituir por um `<div>` com CSS transition simples

## Arquivos

| Arquivo | Acao |
|---------|------|
| `src/App.tsx` | Remover AnimatePresence, configurar QueryClient defaults |
| `src/components/layout/PageTransition.tsx` | Reescrever com CSS puro (sem framer-motion) |
| `src/pages/Home.tsx` | Trocar motion.section por section + CSS animations |
| `src/components/ui/travel-connect-signin-1.tsx` | Limitar FPS do canvas, parar quando ocioso |
| `src/components/layout/AppSidebar.tsx` | Remover motion.div do indicador ativo |
| `src/index.css` | Adicionar keyframe `page-fade-in` |

## Resultado Esperado

- Navegacao entre paginas praticamente instantanea (sem delay de exit animation)
- Home carrega visualmente mais rapido (sem delays escalonados de 200ms)
- Menor uso de CPU na pagina de Auth (canvas otimizado)
- Menos requisicoes ao Supabase (cache global de 2 min)

