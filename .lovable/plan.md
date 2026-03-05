

# Plano — Remover Quick Actions e Melhorar Hierarquia

## Mudancas em `src/components/chat/ChatMessage.tsx`

1. **Remover QUICK_ACTIONS**: Apagar a constante `QUICK_ACTIONS` (linhas 34-39), a variavel `showQuickActions` (linha 74), e o bloco de renderizacao dos chips (linhas 214-227).

2. **Melhorar hierarquia dos metadados**: Os badges de periodo/escopo ficam bem, mas vou refinar o spacing e a separacao visual entre o corpo da resposta e os metadados — adicionar um separador sutil (`border-t border-border/30 pt-2 mt-2`) antes dos badges de metadados para criar uma separacao clara entre conteudo e contexto.

3. **Limpar prop nao usada**: A prop `onFollowUp` continua disponivel na interface mas nao sera mais usada internamente para quick actions. Manter na interface pois pode ser usada por outros componentes no futuro.

## Arquivo

| Arquivo | Acao |
|---------|------|
| `src/components/chat/ChatMessage.tsx` | Remover QUICK_ACTIONS, remover bloco de chips, adicionar separador visual nos metadados |

