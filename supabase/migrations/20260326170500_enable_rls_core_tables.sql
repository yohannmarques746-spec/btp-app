-- Activer RLS sur tables métier principales
ALTER TABLE IF EXISTS public.chantiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.factures ENABLE ROW LEVEL SECURITY;

-- Policies ownership idempotentes (créées seulement si absentes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chantiers'
      AND policyname = 'user_owns_chantier'
  ) THEN
    CREATE POLICY "user_owns_chantier"
      ON public.chantiers
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'clients'
      AND policyname = 'user_owns_client'
  ) THEN
    CREATE POLICY "user_owns_client"
      ON public.clients
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'devis'
      AND policyname = 'user_owns_devis'
  ) THEN
    CREATE POLICY "user_owns_devis"
      ON public.devis
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'factures'
      AND policyname = 'user_owns_facture'
  ) THEN
    CREATE POLICY "user_owns_facture"
      ON public.factures
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
