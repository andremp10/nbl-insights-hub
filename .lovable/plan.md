

# Plano — Remover "Pergunte ao Assistente" e Refinar Visual

## Mudancas

### 1. `src/pages/Home.tsx`

**Remover secao "Pergunte ao Assistente"** (linhas 193-234):
- Remover todo o bloco: input, chips de sugestao, label
- Remover estado `query`, `setQuery`, e funcao `handleQuickQuery`
- Remover import `MessageSquare`
- Remover constante `QUICK_SUGGESTIONS`

**Melhorar cards de navegacao**:
- Aumentar levemente o padding: `p-5` em vez de `p-4`
- Icone maior: `w-10 h-10` para o container, `w-5 h-5` para o icone
- Adicionar subtexto mais descritivo
- Hover mais expressivo: `hover:border-primary/30 hover:shadow-sm`
- No mobile: stack vertical com `gap-3`

**Ajustar delays de animacao** (sem o bloco do assistente, fechar os gaps de delay).

### 2. `src/index.css` — Fundo com mais profundidade

Melhorar o background do dark mode com um gradiente mais rico (sem exagerar):
```css
.dark body {
  background-image:
    radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.04) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 100%, hsl(var(--info) / 0.02) 0%, transparent 40%);
}
```
Dois gradientes sutis: laranja no topo + azul frio no canto inferior direito. Cria profundidade sem parecer decorativo.

Para o light mode, adicionar um gradiente ainda mais sutil:
```css
body {
  background-image: radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.02) 0%, transparent 50%);
}
```

---

## Arquivos

| Arquivo | Acao |
|---------|------|
| `src/pages/Home.tsx` | Remover secao "Pergunte ao Assistente", melhorar cards |
| `src/index.css` | Gradientes de fundo mais ricos em ambos os temas |

