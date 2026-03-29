-- Exécuter sur le projet Supabase utilisé par VITE_SUPABASE_URL (Dashboard → SQL Editor).
-- Élimine les erreurs PostgREST du type « Could not find the 'devis_associes' column ».

ALTER TABLE public.chantiers
  ADD COLUMN IF NOT EXISTS journal_entries jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS incidents_problemes jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS materiaux jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS documents_uploades jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS devis_associes jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS factures_associees jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;
