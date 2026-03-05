

# Plano — Sistema de usuarios controlado por master (sem signup publico)

## Resumo

Remover signup publico, criar tabela `app_users` com roles, criar edge function para criacao de usuarios por masters, adicionar modal de cadastro na sidebar, e criar o usuario inicial `nblautomacoes@gmail.com` via edge function.

---

## 1. Tabela `app_users` (migration SQL)

```sql
CREATE TABLE public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('master', 'user')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.app_users(id)
);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
```

Funcao helper (evitar recursao RLS):

```sql
CREATE OR REPLACE FUNCTION public.is_master(p_auth_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE auth_user_id = p_auth_id AND role = 'master' AND status = 'active'
  );
$$;
```

Policies:
- SELECT: usuario autenticado pode ler se for master OU se `auth_user_id = auth.uid()`
- INSERT: somente master (`public.is_master(auth.uid())`)
- UPDATE: somente master

## 2. Edge Function `create-user` (criacao segura)

**Arquivo:** `supabase/functions/create-user/index.ts`

- Recebe `{ email, password, role }` via POST
- Valida JWT do chamador via `getClaims()`
- Verifica se chamador e master consultando `app_users`
- Cria usuario no Supabase Auth via `supabase.auth.admin.createUser({ email, password, email_confirm: true })`
- Insere registro em `app_users` com `auth_user_id`, `email`, `role`, `created_by`
- Se falhar na insercao em `app_users`, deleta o usuario do Auth (rollback)
- Retorna sucesso/erro

**Config:** `supabase/config.toml` — adicionar `[functions.create-user] verify_jwt = false`

## 3. Criar usuario inicial nblautomacoes@gmail.com

Usar a mesma edge function `create-user` mas com uma rota especial de bootstrap: se `app_users` esta vazia, permite criar o primeiro master sem autenticacao. Assim:

1. Deploy da edge function
2. Chamar com `{ email: "nblautomacoes@gmail.com", password: "golfinenbl10", role: "master" }`
3. Como tabela esta vazia, bootstrap e permitido
4. Apos criacao, bootstrap fica bloqueado permanentemente

## 4. Remover signup publico do frontend

**Arquivo:** `src/components/ui/travel-connect-signin-1.tsx`

- Remover `ViewState` `'register'`
- Remover formulario de registro e botao "Criar conta"
- Manter apenas `'login'` e `'reset'`
- Remover `signUp` do `useAuth` (ou manter internamente mas nao expor na UI)

## 5. AuthContext — Adicionar verificacao de role

**Arquivo:** `src/contexts/AuthContext.tsx`

- Apos login bem-sucedido, consultar `app_users` para verificar se o usuario existe e esta ativo
- Se nao existir em `app_users`, fazer signOut e mostrar erro "Usuario nao autorizado"
- Expor `appUser` (com role) e `isMaster` no contexto

## 6. Modal de cadastro de usuarios (apenas para masters)

**Novo arquivo:** `src/components/admin/CreateUserModal.tsx`

- Dialog com campos: email, senha, role (select: master/user)
- Chama `supabase.functions.invoke('create-user', { body: { email, password, role } })`
- Feedback via toast
- Validacoes: email valido, senha >= 6 chars, role obrigatorio

**Arquivo:** `src/components/layout/AppSidebar.tsx`

- Adicionar botao "Novo Usuario" no footer (visivel apenas se `isMaster`)
- Ao clicar, abre o `CreateUserModal`

## 7. Auditoria de fluxo de emails

- O Supabase continua enviando emails de reset de senha normalmente (ja configurado)
- Nao ha email de confirmacao pois `email_confirm: true` na criacao via admin
- O email de convite nao e usado — criacao e direta com senha definida
- Nenhuma senha aparece em logs (edge function nao loga passwords)

---

## Arquivos

| Arquivo | Acao |
|---------|------|
| Migration SQL | Criar tabela `app_users`, funcao `is_master`, RLS policies |
| `supabase/functions/create-user/index.ts` | Nova edge function |
| `supabase/config.toml` | Adicionar config da nova function |
| `src/components/ui/travel-connect-signin-1.tsx` | Remover registro publico |
| `src/contexts/AuthContext.tsx` | Adicionar verificacao `app_users` + expor `isMaster` |
| `src/components/admin/CreateUserModal.tsx` | Novo modal de criacao |
| `src/components/layout/AppSidebar.tsx` | Botao "Novo Usuario" para masters |

