-- Exécuter via Supabase Studio (SQL Editor) ou `supabase db push` après `supabase link`.
-- Crée le bucket public `chantier-documents` pour les uploads liés aux fiches chantier
-- (devis PDF, photos, plans, etc.) et restreint les écritures à l'utilisateur authentifié,
-- avec un préfixe de chemin contrôlé `{auth.uid()}/{chantierId}/{uuid}-{filename}`.

-- --- Bucket public ---------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('chantier-documents', 'chantier-documents', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- --- Policies sur storage.objects (bucket chantier-documents) --------------
-- Lecture publique : tous les liens partageables sont accessibles sans auth.
DROP POLICY IF EXISTS "chantier_documents_public_read" ON storage.objects;
CREATE POLICY "chantier_documents_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'chantier-documents');

-- Upload : utilisateur authentifié, chemin commence par son auth.uid()
DROP POLICY IF EXISTS "chantier_documents_authenticated_insert_own" ON storage.objects;
CREATE POLICY "chantier_documents_authenticated_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'chantier-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Update : utilisateur authentifié sur son propre préfixe
DROP POLICY IF EXISTS "chantier_documents_authenticated_update_own" ON storage.objects;
CREATE POLICY "chantier_documents_authenticated_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'chantier-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'chantier-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

-- Delete : utilisateur authentifié sur son propre préfixe
DROP POLICY IF EXISTS "chantier_documents_authenticated_delete_own" ON storage.objects;
CREATE POLICY "chantier_documents_authenticated_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'chantier-documents'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
