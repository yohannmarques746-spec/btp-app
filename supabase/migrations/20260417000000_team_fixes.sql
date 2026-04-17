-- ============================================================================
-- CALDY — Team v2 : fix status login, notes lisibles, co-patrons
-- ============================================================================

-- ─── 1. login_member_pin : bloquer les membres inactifs ──────────────────────
CREATE OR REPLACE FUNCTION public.login_member_pin(input_pin TEXT, p_owner_id UUID)
RETURNS TABLE(session_token TEXT, member_id UUID, member_name TEXT)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_member_id UUID;
  v_member_name TEXT;
  v_token TEXT;
BEGIN
  SELECT id, name INTO v_member_id, v_member_name
  FROM public.team_members
  WHERE user_id   = p_owner_id
    AND status    = 'actif'
    AND pin_hash IS NOT NULL
    AND pin_hash  = crypt(input_pin, pin_hash)
  LIMIT 1;

  IF v_member_id IS NULL THEN RETURN; END IF;

  v_token := gen_random_uuid()::text;
  INSERT INTO public.member_sessions (member_id, token, expires_at)
  VALUES (v_member_id, v_token, now() + interval '24 hours');
  RETURN QUERY SELECT v_token, v_member_id, v_member_name;
END;
$$;

-- ─── 2. get_member_notes : lecture des notes du membre via son token ──────────
CREATE OR REPLACE FUNCTION public.get_member_notes(p_token TEXT)
RETURNS TABLE(id UUID, chantier_id UUID, content TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_member_id UUID;
BEGIN
  SELECT ms.member_id INTO v_member_id
  FROM public.member_sessions ms
  WHERE ms.token = p_token AND ms.expires_at > now()
  LIMIT 1;

  IF v_member_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT cn.id, cn.chantier_id, cn.content, cn.created_at
  FROM public.chantier_notes cn
  WHERE cn.member_id = v_member_id
  ORDER BY cn.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_notes(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_member_notes(TEXT) TO service_role;

-- ─── 3. Table app_co_owners ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_co_owners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID NOT NULL,
  co_owner_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  co_owner_email  TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(owner_id, co_owner_id)
);

ALTER TABLE public.app_co_owners ENABLE ROW LEVEL SECURITY;
GRANT ALL  ON public.app_co_owners TO service_role;
GRANT SELECT, DELETE ON public.app_co_owners TO authenticated;

-- Le patron gère ses co-patrons ; un co-patron peut lire sa propre ligne
DROP POLICY IF EXISTS "manage_co_owners" ON public.app_co_owners;
CREATE POLICY "manage_co_owners" ON public.app_co_owners
  FOR ALL TO authenticated
  USING  (owner_id = auth.uid() OR co_owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- ─── 4. is_co_owner : vérifie statut co-patron (utilisé dans RLS + frontend) ─
CREATE OR REPLACE FUNCTION public.is_co_owner(p_owner_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.app_co_owners
    WHERE owner_id = p_owner_id AND co_owner_id = p_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_co_owner(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_co_owner(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.is_co_owner(UUID, UUID) TO service_role;

-- ─── 5. RLS team_members — étendre aux co-patrons ────────────────────────────
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'team_members' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.team_members', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "owner_or_coowner_manage_members" ON public.team_members
  FOR ALL TO authenticated
  USING  (user_id = auth.uid() OR public.is_co_owner(user_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_co_owner(user_id, auth.uid()));

-- ─── 6. RLS chantier_assignments — étendre aux co-patrons ────────────────────
DROP POLICY IF EXISTS "owner_manage_assignments" ON public.chantier_assignments;
DROP POLICY IF EXISTS "owner_or_coowner_manage_assignments" ON public.chantier_assignments;
CREATE POLICY "owner_or_coowner_manage_assignments" ON public.chantier_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = member_id
        AND (tm.user_id = auth.uid() OR public.is_co_owner(tm.user_id, auth.uid()))
    )
  );

-- ─── 7. RLS chantier_notes — étendre aux co-patrons ─────────────────────────
DROP POLICY IF EXISTS "owner_read_notes" ON public.chantier_notes;
DROP POLICY IF EXISTS "owner_or_coowner_read_notes" ON public.chantier_notes;
CREATE POLICY "owner_or_coowner_read_notes" ON public.chantier_notes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = member_id
        AND (tm.user_id = auth.uid() OR public.is_co_owner(tm.user_id, auth.uid()))
    )
  );
