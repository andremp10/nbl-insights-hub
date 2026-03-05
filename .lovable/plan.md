

# Plano — Migrar para Supabase Auth + Cadastro de Usuarios + Fundo Estilizado

## Resumo

Migrar a autenticacao de senha hardcoded para Supabase Auth real com email/senha, adicionar pagina de cadastro, pagina de recuperacao de senha, e aplicar um fundo visual estilo "terminal/grid" inspirado no HTML compartilhado nas paginas de auth, home e chat.

---

## 1. AuthContext — Reescrever com Supabase Auth

**Arquivo:** `src/contexts/AuthContext.tsx`

Substituir completamente:
- Remover senha hardcoded, localStorage
- Estado: `session`, `user`, `loading`
- `onAuthStateChange` listener (antes de `getSession`)
- Metodos: `signIn(email, password)`, `signUp(email, password)`, `resetPassword(email)`, `signOut()`
- `resetPassword` usa `redirectTo: window.location.origin + '/reset-password'`
- Exportar `session`, `user`, `loading`, `signIn`, `signUp`, `resetPassword`, `signOut`

## 2. ProtectedRoute — Adaptar

**Arquivo:** `src/components/auth/ProtectedRoute.tsx`

Trocar `isAuthenticated` por `session !== null`.

## 3. SignInCard — Login + Cadastro + Recuperacao

**Arquivo:** `src/components/ui/travel-connect-signin-1.tsx`

Reformular o formulario mantendo layout visual (DotMap + split card):
- Estado `view`: `'login' | 'register' | 'reset'`
- **Login**: email + senha, botao "Entrar", links "Criar conta" e "Esqueci minha senha"
- **Cadastro**: email + senha + confirmar senha, botao "Criar conta", link "Ja tenho conta"
- **Recuperacao**: email, botao "Enviar link de recuperacao", link "Voltar"
- Toasts para feedback (sucesso/erro)

## 4. Pagina ResetPassword

**Novo arquivo:** `src/pages/ResetPassword.tsx`

Pagina publica:
- Detecta `type=recovery` no hash da URL
- Formulario: nova senha + confirmacao
- Chama `supabase.auth.updateUser({ password })`
- Redireciona para `/` apos sucesso
- Mesmo estilo visual das outras paginas de auth

## 5. Rota no App.tsx

**Arquivo:** `src/App.tsx`

Adicionar rota publica `/reset-password`.

## 6. AppSidebar — Logout via Supabase

**Arquivo:** `src/components/layout/AppSidebar.tsx`

Trocar `logout` para chamar `signOut` do novo AuthContext.

## 7. Fundo Visual Estilizado (Grid + Gradiente)

**Arquivo:** `src/index.css`

Inspirado no HTML compartilhado pelo usuario, adicionar ao dark mode um fundo com grid sutil estilo terminal:
- Grid de pontos ou linhas finas com opacidade muito baixa (`0.03-0.05`)
- Gradiente radial laranja no topo (ja existe, refinar)
- Efeito de "vignette" nas bordas

Isso se aplica globalmente (body), entao afeta home, chat e todas as paginas autenticadas sem precisar alterar cada componente.

**Arquivo:** `src/pages/Auth.tsx`

Aplicar um fundo mais dramatico na pagina de auth especificamente, com o grid mais visivel e efeito de glow laranja mais forte.

---

## Arquivos

| Arquivo | Acao |
|---------|------|
| `src/contexts/AuthContext.tsx` | Reescrever com Supabase Auth |
| `src/components/auth/ProtectedRoute.tsx` | Adaptar para session |
| `src/components/ui/travel-connect-signin-1.tsx` | Login + Cadastro + Reset views |
| `src/pages/ResetPassword.tsx` | Criar pagina de redefinicao de senha |
| `src/pages/Auth.tsx` | Fundo estilizado auth |
| `src/App.tsx` | Adicionar rota /reset-password |
| `src/components/layout/AppSidebar.tsx` | signOut via Supabase |
| `src/index.css` | Grid/gradiente global para profundidade |

