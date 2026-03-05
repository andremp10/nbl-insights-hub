

# Avaliacao e Plano — Home como Landing Page Fluida

## Problemas Identificados

Olhando o print e o codigo:

1. **Tudo tem a mesma cara**: Hero, search, modulos, KPIs, atividade — todos sao blocos identicos (bg-card, border, rounded-lg) empilhados com o mesmo spacing. Nao ha ritmo visual.
2. **Hero e fraco**: Texto puro sem nenhum elemento visual de ancora. Parece um paragrafo solto.
3. **Secao "MODULOS" parece admin panel**: O label uppercase "MODULOS" + 3 cards identicos com borda colorida no topo e um triste "Acessar →" da cara de template CMS.
4. **KPIs desconectados**: Aparecem depois dos modulos como uma secao solta, sem relacao visual com nada.
5. **Sem variacao de densidade**: Tudo tem o mesmo padding, mesmo gap, mesma largura. Landing pages tem secoes com densidades diferentes.
6. **Falta de CTA claro**: O botao de busca e pequeno e discreto. Nao ha um convite forte para usar o assistente.

## Solucao — Landing Page com Secoes Fluidas

### A) Hero Section com mais presenca
- Remover a secao como bloco solto → ocupar mais espaco vertical
- Saudacao `text-3xl md:text-4xl font-bold` com tracking tight
- Data em badge discreto ou pill (nao texto puro)
- Subtitulo com `text-base text-muted-foreground` e mais respiro
- Integrar a barra de busca DENTRO do hero (nao como secao separada), com tamanho maior (`py-4`) e mais destaque

### B) Module Cards com personalidade
- Remover label "MODULOS" generico
- Cards maiores com hover mais expressivo: sombra + translate + borda lateral que cresce
- Cada card com um **gradiente sutil de fundo** unico (nao o gradiente generico — algo como `bg-gradient-to-br from-primary/5 to-transparent`)
- Icone maior (`w-14 h-14`) com fundo mais presente
- Preview de dados com mais destaque (badge ou pill colorido)
- Remover "Acessar →" e substituir por um CTA mais integrado ao card (o card inteiro ja e clicavel)
- Adicionar uma micro-animacao no icone ao hover (rotate ou scale sutil)

### C) KPIs integrados com visual diferente
- Mover KPIs para uma **faixa visual diferente**: fundo levemente diferente (`bg-muted/30`) ou sem borda (apenas valores)
- Layout em linha com separadores verticais entre KPIs (ao inves de 4 cards separados)
- Isso quebra a monotonia de "tudo e card"

### D) Atividade recente com mais contexto
- Adicionar um botao "Ver todos os pedidos →" no header do card
- Melhorar visual dos items com avatar/iniciais do cliente

### E) Espacamento e ritmo
- Hero: `py-12 md:py-20` (mais respiro)
- Entre hero e modulos: `mt-12`
- KPIs: sem borda, inline, compactos
- Atividade: `mt-8`

## Arquivo

| Arquivo | Acao |
|---------|------|
| `src/pages/Home.tsx` | Redesenho completo: hero impactante, cards expressivos, KPIs inline, fluxo de landing page |

