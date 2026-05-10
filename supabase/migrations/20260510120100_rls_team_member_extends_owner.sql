-- =============================================================================
-- Migration : Étendre les policies RLS pour les employés actifs
-- Date      : 2026-05-10
-- Objectif  : Les employés avec auth_user_id + status='actif' + permission
--             correspondante voient les mêmes données que leur patron.
--             Les policies "user_owns_*" / "rendez_vous_user_policy" sont
--             remplacées par des policies qui utilisent user_can_access_owner().
-- =============================================================================

-- =============================================================================
-- TABLE : chantiers
-- =============================================================================
DROP POLICY IF EXISTS "user_owns_chantier"      ON public.chantiers;
DROP POLICY IF EXISTS "owner_or_member_select_chantiers" ON public.chantiers;
DROP POLICY IF EXISTS "owner_or_member_modify_chantiers" ON public.chantiers;

CREATE POLICY "owner_or_member_select_chantiers"
  ON public.chantiers
  FOR SELECT
  TO authenticated
  USING (public.user_can_access_owner(user_id, 'chantiers'));

CREATE POLICY "owner_or_member_modify_chantiers"
  ON public.chantiers
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_can_access_owner(user_id, 'chantiers'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chantiers'
      AND policyname = 'owner_or_member_update_chantiers'
  ) THEN
    CREATE POLICY "owner_or_member_update_chantiers"
      ON public.chantiers
      FOR UPDATE
      TO authenticated
      USING (public.user_can_access_owner(user_id, 'chantiers'))
      WITH CHECK (public.user_can_access_owner(user_id, 'chantiers'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chantiers'
      AND policyname = 'owner_or_member_delete_chantiers'
  ) THEN
    CREATE POLICY "owner_or_member_delete_chantiers"
      ON public.chantiers
      FOR DELETE
      TO authenticated
      USING (public.user_can_access_owner(user_id, 'chantiers'));
  END IF;
END $$;

-- =============================================================================
-- TABLE : clients
-- =============================================================================
DROP POLICY IF EXISTS "user_owns_client"                ON public.clients;
DROP POLICY IF EXISTS "owner_or_member_select_clients"  ON public.clients;
DROP POLICY IF EXISTS "owner_or_member_modify_clients"  ON public.clients;

CREATE POLICY "owner_or_member_select_clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (public.user_can_access_owner(user_id, 'clients'));

CREATE POLICY "owner_or_member_modify_clients"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_can_access_owner(user_id, 'clients'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'clients'
      AND policyname = 'owner_or_member_update_clients'
  ) THEN
    CREATE POLICY "owner_or_member_update_clients"
      ON public.clients
      FOR UPDATE
      TO authenticated
      USING (public.user_can_access_owner(user_id, 'clients'))
      WITH CHECK (public.user_can_access_owner(user_id, 'clients'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'clients'
      AND policyname = 'owner_or_member_delete_clients'
  ) THEN
    CREATE POLICY "owner_or_member_delete_clients"
      ON public.clients
      FOR DELETE
      TO authenticated
      USING (public.user_can_access_owner(user_id, 'clients'));
  END IF;
END $$;

-- =============================================================================
-- TABLE : devis
-- =============================================================================
DROP POLICY IF EXISTS "user_owns_devis"               ON public.devis;
DROP POLICY IF EXISTS "owner_or_member_select_devis"  ON public.devis;
DROP POLICY IF EXISTS "owner_or_member_modify_devis"  ON public.devis;

CREATE POLICY "owner_or_member_select_devis"
  ON public.devis
  FOR SELECT
  TO authenticated
  USING (public.user_can_access_owner(user_id, 'devis'));

CREATE POLICY "owner_or_member_modify_devis"
  ON public.devis
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_can_access_owner(user_id, 'devis'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'devis'
      AND policyname = 'owner_or_member_update_devis'
  ) THEN
    CREATE POLICY "owner_or_member_update_devis"
      ON public.devis
      FOR UPDATE
      TO authenticated
      USING (public.user_can_access_owner(user_id, 'devis'))
      WITH CHECK (public.user_can_access_owner(user_id, 'devis'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'devis'
      AND policyname = 'owner_or_member_delete_devis'
  ) THEN
    CREATE POLICY "owner_or_member_delete_devis"
      ON public.devis
      FOR DELETE
      TO authenticated
      USING (public.user_can_access_owner(user_id, 'devis'));
  END IF;
END $$;

-- =============================================================================
-- TABLE : factures
-- =============================================================================
DROP POLICY IF EXISTS "user_owns_facture"               ON public.factures;
DROP POLICY IF EXISTS "owner_or_member_select_factures" ON public.factures;
DROP POLICY IF EXISTS "owner_or_member_modify_factures" ON public.factures;

CREATE POLICY "owner_or_member_select_factures"
  ON public.factures
  FOR SELECT
  TO authenticated
  USING (public.user_can_access_owner(user_id, 'factures'));

CREATE POLICY "owner_or_member_modify_factures"
  ON public.factures
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_can_access_owner(user_id, 'factures'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'factures'
      AND policyname = 'owner_or_member_update_factures'
  ) THEN
    CREATE POLICY "owner_or_member_update_factures"
      ON public.factures
      FOR UPDATE
      TO authenticated
      USING (public.user_can_access_owner(user_id, 'factures'))
      WITH CHECK (public.user_can_access_owner(user_id, 'factures'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'factures'
      AND policyname = 'owner_or_member_delete_factures'
  ) THEN
    CREATE POLICY "owner_or_member_delete_factures"
      ON public.factures
      FOR DELETE
      TO authenticated
      USING (public.user_can_access_owner(user_id, 'factures'));
  END IF;
END $$;

-- =============================================================================
-- TABLE : rendez_vous   (permission mappée sur "planning")
-- =============================================================================
DROP POLICY IF EXISTS "rendez_vous_user_policy"            ON public.rendez_vous;
DROP POLICY IF EXISTS "owner_or_member_select_rendez_vous" ON public.rendez_vous;
DROP POLICY IF EXISTS "owner_or_member_modify_rendez_vous" ON public.rendez_vous;

CREATE POLICY "owner_or_member_select_rendez_vous"
  ON public.rendez_vous
  FOR SELECT
  TO authenticated
  USING (public.user_can_access_owner(user_id, 'planning'));

CREATE POLICY "owner_or_member_modify_rendez_vous"
  ON public.rendez_vous
  FOR INSERT
  TO authenticated
  WITH CHECK (public.user_can_access_owner(user_id, 'planning'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'rendez_vous'
      AND policyname = 'owner_or_member_update_rendez_vous'
  ) THEN
    CREATE POLICY "owner_or_member_update_rendez_vous"
      ON public.rendez_vous
      FOR UPDATE
      TO authenticated
      USING (public.user_can_access_owner(user_id, 'planning'))
      WITH CHECK (public.user_can_access_owner(user_id, 'planning'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'rendez_vous'
      AND policyname = 'owner_or_member_delete_rendez_vous'
  ) THEN
    CREATE POLICY "owner_or_member_delete_rendez_vous"
      ON public.rendez_vous
      FOR DELETE
      TO authenticated
      USING (public.user_can_access_owner(user_id, 'planning'));
  END IF;
END $$;
