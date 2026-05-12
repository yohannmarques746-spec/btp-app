-- =============================================================================
-- Migration : Accès co-patron et employé aux données métier
-- Date      : 2026-05-12
-- Problème  : Les policies RLS n'autorisaient que le patron (user_id = auth.uid()).
--             Co-patrons et employés recevaient des résultats vides.
-- Solution  : Créer user_can_access_owner() et remplacer toutes les policies.
-- =============================================================================

-- ─── 1. Fonction helper centrale ─────────────────────────────────────────────
-- Retourne TRUE si l'utilisateur courant est :
--   (a) le patron (auth.uid() = p_owner_id)
--   (b) un co-patron enregistré dans app_co_owners
--   (c) un employé actif avec la permission p_feature dans team_members
CREATE OR REPLACE FUNCTION public.user_can_access_owner(
  p_owner_id UUID,
  p_feature  TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    auth.uid() = p_owner_id
    OR EXISTS (
      SELECT 1 FROM public.app_co_owners
      WHERE owner_id    = p_owner_id
        AND co_owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.auth_user_id = auth.uid()
        AND tm.user_id      = p_owner_id
        AND tm.status       = 'actif'
        AND COALESCE((tm.permissions ->> p_feature)::boolean, false) = true
    );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_owner(UUID, TEXT) TO authenticated;

-- =============================================================================
-- 2. TABLE : chantiers
-- =============================================================================
DROP POLICY IF EXISTS "chantiers_own"                        ON public.chantiers;
DROP POLICY IF EXISTS "owner_or_member_select_chantiers"     ON public.chantiers;
DROP POLICY IF EXISTS "owner_or_member_modify_chantiers"     ON public.chantiers;
DROP POLICY IF EXISTS "owner_or_member_update_chantiers"     ON public.chantiers;
DROP POLICY IF EXISTS "owner_or_member_delete_chantiers"     ON public.chantiers;

CREATE POLICY "chantiers_select"
  ON public.chantiers FOR SELECT TO authenticated
  USING (public.user_can_access_owner(user_id, 'chantiers'));

CREATE POLICY "chantiers_insert"
  ON public.chantiers FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_owner(user_id, 'chantiers'));

CREATE POLICY "chantiers_update"
  ON public.chantiers FOR UPDATE TO authenticated
  USING  (public.user_can_access_owner(user_id, 'chantiers'))
  WITH CHECK (public.user_can_access_owner(user_id, 'chantiers'));

CREATE POLICY "chantiers_delete"
  ON public.chantiers FOR DELETE TO authenticated
  USING (public.user_can_access_owner(user_id, 'chantiers'));

-- =============================================================================
-- 3. TABLE : clients
-- =============================================================================
DROP POLICY IF EXISTS "clients_own"                         ON public.clients;
DROP POLICY IF EXISTS "owner_or_member_select_clients"      ON public.clients;
DROP POLICY IF EXISTS "owner_or_member_modify_clients"      ON public.clients;
DROP POLICY IF EXISTS "owner_or_member_update_clients"      ON public.clients;
DROP POLICY IF EXISTS "owner_or_member_delete_clients"      ON public.clients;

CREATE POLICY "clients_select"
  ON public.clients FOR SELECT TO authenticated
  USING (public.user_can_access_owner(user_id, 'clients'));

CREATE POLICY "clients_insert"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_owner(user_id, 'clients'));

CREATE POLICY "clients_update"
  ON public.clients FOR UPDATE TO authenticated
  USING  (public.user_can_access_owner(user_id, 'clients'))
  WITH CHECK (public.user_can_access_owner(user_id, 'clients'));

CREATE POLICY "clients_delete"
  ON public.clients FOR DELETE TO authenticated
  USING (public.user_can_access_owner(user_id, 'clients'));

-- =============================================================================
-- 4. TABLE : devis
-- =============================================================================
DROP POLICY IF EXISTS "devis_own"                           ON public.devis;
DROP POLICY IF EXISTS "owner_or_member_select_devis"        ON public.devis;
DROP POLICY IF EXISTS "owner_or_member_modify_devis"        ON public.devis;
DROP POLICY IF EXISTS "owner_or_member_update_devis"        ON public.devis;
DROP POLICY IF EXISTS "owner_or_member_delete_devis"        ON public.devis;

CREATE POLICY "devis_select"
  ON public.devis FOR SELECT TO authenticated
  USING (public.user_can_access_owner(user_id, 'devis'));

CREATE POLICY "devis_insert"
  ON public.devis FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_owner(user_id, 'devis'));

CREATE POLICY "devis_update"
  ON public.devis FOR UPDATE TO authenticated
  USING  (public.user_can_access_owner(user_id, 'devis'))
  WITH CHECK (public.user_can_access_owner(user_id, 'devis'));

CREATE POLICY "devis_delete"
  ON public.devis FOR DELETE TO authenticated
  USING (public.user_can_access_owner(user_id, 'devis'));

-- =============================================================================
-- 5. TABLE : factures
-- =============================================================================
DROP POLICY IF EXISTS "factures_own"                         ON public.factures;
DROP POLICY IF EXISTS "owner_or_member_select_factures"      ON public.factures;
DROP POLICY IF EXISTS "owner_or_member_modify_factures"      ON public.factures;
DROP POLICY IF EXISTS "owner_or_member_update_factures"      ON public.factures;
DROP POLICY IF EXISTS "owner_or_member_delete_factures"      ON public.factures;

CREATE POLICY "factures_select"
  ON public.factures FOR SELECT TO authenticated
  USING (public.user_can_access_owner(user_id, 'factures'));

CREATE POLICY "factures_insert"
  ON public.factures FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_owner(user_id, 'factures'));

CREATE POLICY "factures_update"
  ON public.factures FOR UPDATE TO authenticated
  USING  (public.user_can_access_owner(user_id, 'factures'))
  WITH CHECK (public.user_can_access_owner(user_id, 'factures'));

CREATE POLICY "factures_delete"
  ON public.factures FOR DELETE TO authenticated
  USING (public.user_can_access_owner(user_id, 'factures'));

-- =============================================================================
-- 6. TABLE : rendez_vous  (permission = "planning")
-- =============================================================================
DROP POLICY IF EXISTS "rendez_vous_user_policy"                ON public.rendez_vous;
DROP POLICY IF EXISTS "owner_or_member_select_rendez_vous"     ON public.rendez_vous;
DROP POLICY IF EXISTS "owner_or_member_modify_rendez_vous"     ON public.rendez_vous;
DROP POLICY IF EXISTS "owner_or_member_update_rendez_vous"     ON public.rendez_vous;
DROP POLICY IF EXISTS "owner_or_member_delete_rendez_vous"     ON public.rendez_vous;

CREATE POLICY "rendez_vous_select"
  ON public.rendez_vous FOR SELECT TO authenticated
  USING (public.user_can_access_owner(user_id, 'planning'));

CREATE POLICY "rendez_vous_insert"
  ON public.rendez_vous FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_owner(user_id, 'planning'));

CREATE POLICY "rendez_vous_update"
  ON public.rendez_vous FOR UPDATE TO authenticated
  USING  (public.user_can_access_owner(user_id, 'planning'))
  WITH CHECK (public.user_can_access_owner(user_id, 'planning'));

CREATE POLICY "rendez_vous_delete"
  ON public.rendez_vous FOR DELETE TO authenticated
  USING (public.user_can_access_owner(user_id, 'planning'));
