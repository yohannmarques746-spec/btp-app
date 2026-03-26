-- Table requise par l’app (code admin après connexion Supabase Auth).
-- À exécuter une fois dans Supabase : SQL Editor → New query → Run.

CREATE TABLE IF NOT EXISTS public.admin_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_codes_user_id_key UNIQUE (user_id)
);

ALTER TABLE public.admin_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_codes_select_own" ON public.admin_codes;
DROP POLICY IF EXISTS "admin_codes_insert_own" ON public.admin_codes;
DROP POLICY IF EXISTS "admin_codes_update_own" ON public.admin_codes;
DROP POLICY IF EXISTS "admin_codes_delete_own" ON public.admin_codes;

CREATE POLICY "admin_codes_select_own"
  ON public.admin_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admin_codes_insert_own"
  ON public.admin_codes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_codes_update_own"
  ON public.admin_codes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_codes_delete_own"
  ON public.admin_codes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_codes TO authenticated;
GRANT ALL ON public.admin_codes TO service_role;
