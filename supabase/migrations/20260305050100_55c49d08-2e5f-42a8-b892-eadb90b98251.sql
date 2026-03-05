
-- Table app_users
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

-- Helper function to avoid RLS recursion
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

-- SELECT: authenticated can read own row OR if master
CREATE POLICY "Users can read own or master reads all"
ON public.app_users FOR SELECT TO authenticated
USING (auth_user_id = auth.uid() OR public.is_master(auth.uid()));

-- INSERT: only master
CREATE POLICY "Only master can insert"
ON public.app_users FOR INSERT TO authenticated
WITH CHECK (public.is_master(auth.uid()));

-- UPDATE: only master
CREATE POLICY "Only master can update"
ON public.app_users FOR UPDATE TO authenticated
USING (public.is_master(auth.uid()));
