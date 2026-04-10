-- Exécuter via Supabase Studio (SQL Editor) ou `supabase db push` après `supabase link`.
-- Crée la table profil entreprise (paramètres app) et le bucket public "logos" avec RLS.

-- --- Table entreprise_profil -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entreprise_profil (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nom         TEXT NOT NULL DEFAULT '',
  adresse     TEXT NOT NULL DEFAULT '',
  telephone   TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  numero_ide  TEXT NOT NULL DEFAULT '',
  site_web    TEXT,
  logo_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.entreprise_profil ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "entreprise_profil_user_policy" ON public.entreprise_profil;
CREATE POLICY "entreprise_profil_user_policy" ON public.entreprise_profil
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entreprise_profil TO authenticated;

-- --- Storage bucket logos (public URLs) ---------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Policies sur storage.objects (bucket logos)
DROP POLICY IF EXISTS "logos_public_read" ON storage.objects;
CREATE POLICY "logos_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "logos_authenticated_insert_own" ON storage.objects;
CREATE POLICY "logos_authenticated_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'logos'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "logos_authenticated_update_own" ON storage.objects;
CREATE POLICY "logos_authenticated_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'logos'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'logos'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "logos_authenticated_delete_own" ON storage.objects;
CREATE POLICY "logos_authenticated_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'logos'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
