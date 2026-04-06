DROP TABLE IF EXISTS public.rendez_vous CASCADE;

CREATE TABLE public.rendez_vous (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chantier_id  UUID REFERENCES public.chantiers(id) ON DELETE SET NULL,
  titre        TEXT NOT NULL,
  date         DATE NOT NULL,
  heure_debut  TIME NOT NULL,
  heure_fin    TIME,
  description  TEXT,
  statut       TEXT NOT NULL DEFAULT 'planifié'
               CHECK (statut IN ('planifié','confirmé','annulé','terminé')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rendez_vous ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rendez_vous_user_policy" ON public.rendez_vous;
CREATE POLICY "rendez_vous_user_policy" ON public.rendez_vous
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_rdv_user_date ON public.rendez_vous (user_id, date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rendez_vous TO authenticated;
