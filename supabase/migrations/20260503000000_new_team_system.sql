-- ============================================================================
-- Migration: Nouveau système équipe — auth email + PIN optionnel
-- 2026-05-03
-- ============================================================================

-- 1. Nouvelles colonnes team_members
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_team_members_auth_user_id
  ON public.team_members(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_members_status
  ON public.team_members(user_id, status);

-- 2. Table audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  actor_id UUID REFERENCES auth.users(id),
  target_member_id UUID REFERENCES public.team_members(id),
  action TEXT NOT NULL,
  changes JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_read_audit" ON public.audit_logs;
CREATE POLICY "owner_read_audit" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

CREATE INDEX IF NOT EXISTS idx_audit_logs_owner
  ON public.audit_logs(owner_id, created_at DESC);

-- 3. RPC: get_member_by_auth_user
CREATE OR REPLACE FUNCTION public.get_member_by_auth_user(
  p_auth_user_id UUID,
  p_owner_id UUID
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  email TEXT,
  role TEXT,
  status TEXT,
  permissions JSONB,
  has_pin BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    tm.id,
    tm.name,
    tm.email,
    tm.role,
    tm.status,
    tm.permissions,
    (tm.pin_hash IS NOT NULL) AS has_pin
  FROM public.team_members tm
  WHERE tm.auth_user_id = p_auth_user_id
    AND tm.user_id = p_owner_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_by_auth_user(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_member_by_auth_user(UUID, UUID) TO authenticated;

-- 4. RPC: create_member_session_email
CREATE OR REPLACE FUNCTION public.create_member_session_email(
  p_member_id UUID,
  p_owner_id UUID,
  p_pin TEXT DEFAULT NULL
)
RETURNS TABLE(session_token TEXT, member_name TEXT, member_role TEXT, member_permissions JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT;
  v_name TEXT;
  v_role TEXT;
  v_permissions JSONB;
  v_pin_hash TEXT;
  v_status TEXT;
BEGIN
  SELECT name, role, permissions, pin_hash, status
  INTO v_name, v_role, v_permissions, v_pin_hash, v_status
  FROM public.team_members
  WHERE id = p_member_id AND user_id = p_owner_id
  LIMIT 1;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'MEMBER_NOT_FOUND';
  END IF;

  IF v_status != 'actif' THEN
    RAISE EXCEPTION 'MEMBER_NOT_ACTIVE';
  END IF;

  IF v_pin_hash IS NOT NULL THEN
    IF p_pin IS NULL OR p_pin = '' THEN
      RAISE EXCEPTION 'PIN_REQUIRED';
    END IF;
    IF v_pin_hash != crypt(p_pin, v_pin_hash) THEN
      RAISE EXCEPTION 'PIN_INCORRECT';
    END IF;
  END IF;

  v_token := gen_random_uuid()::text;

  INSERT INTO public.member_sessions (member_id, token, expires_at)
  VALUES (p_member_id, v_token, now() + interval '24 hours');

  RETURN QUERY SELECT v_token, v_name, v_role, v_permissions;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_member_session_email(UUID, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.create_member_session_email(UUID, UUID, TEXT) TO authenticated;

-- 5. RPC: set_member_pin_self (employé définit son propre PIN)
CREATE OR REPLACE FUNCTION public.set_member_pin_self(
  p_token TEXT,
  p_new_pin TEXT,
  p_old_pin TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_id UUID;
  v_owner_id UUID;
  v_current_hash TEXT;
  v_exists BOOLEAN;
BEGIN
  SELECT ms.member_id, tm.user_id, tm.pin_hash
  INTO v_member_id, v_owner_id, v_current_hash
  FROM public.member_sessions ms
  JOIN public.team_members tm ON tm.id = ms.member_id
  WHERE ms.token = p_token AND ms.expires_at > now()
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF v_current_hash IS NOT NULL THEN
    IF p_old_pin IS NULL OR p_old_pin = '' THEN
      RAISE EXCEPTION 'OLD_PIN_REQUIRED';
    END IF;
    IF v_current_hash != crypt(p_old_pin, v_current_hash) THEN
      RAISE EXCEPTION 'OLD_PIN_INCORRECT';
    END IF;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.team_members
    WHERE user_id = v_owner_id
      AND id != v_member_id
      AND pin_hash IS NOT NULL
      AND pin_hash = crypt(p_new_pin, pin_hash)
  ) INTO v_exists;

  IF v_exists THEN
    RAISE EXCEPTION 'PIN_DUPLICATE';
  END IF;

  UPDATE public.team_members
  SET pin_hash = crypt(p_new_pin, gen_salt('bf'))
  WHERE id = v_member_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_member_pin_self(TEXT, TEXT, TEXT) TO anon;

-- 6. Mise à jour login_member_pin — filtre status = 'actif'
CREATE OR REPLACE FUNCTION public.login_member_pin(input_pin TEXT, p_owner_id UUID)
RETURNS TABLE(session_token TEXT, member_id UUID, member_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_id UUID;
  v_member_name TEXT;
  v_token TEXT;
BEGIN
  SELECT id, name INTO v_member_id, v_member_name
  FROM public.team_members
  WHERE user_id = p_owner_id
    AND status = 'actif'
    AND pin_hash IS NOT NULL
    AND pin_hash = crypt(input_pin, pin_hash)
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RETURN;
  END IF;

  v_token := gen_random_uuid()::text;

  INSERT INTO public.member_sessions (member_id, token, expires_at)
  VALUES (v_member_id, v_token, now() + interval '24 hours');

  RETURN QUERY SELECT v_token, v_member_id, v_member_name;
END;
$$;

-- 7. Mise à jour get_member_session — inclut role
CREATE OR REPLACE FUNCTION public.get_member_session(p_token TEXT)
RETURNS TABLE(
  member_id UUID,
  member_name TEXT,
  member_permissions JSONB,
  member_role TEXT,
  owner_id UUID,
  chantiers JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_id UUID;
  v_name TEXT;
  v_permissions JSONB;
  v_role TEXT;
  v_owner_id UUID;
  v_chantiers JSONB;
BEGIN
  SELECT ms.member_id, tm.name, tm.permissions, tm.role, tm.user_id
  INTO v_member_id, v_name, v_permissions, v_role, v_owner_id
  FROM public.member_sessions ms
  JOIN public.team_members tm ON tm.id = ms.member_id
  WHERE ms.token = p_token AND ms.expires_at > now()
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(json_agg(row_to_json(q)), '[]'::json)::jsonb
  INTO v_chantiers
  FROM (
    SELECT c.id, c.nom, c.statut, c.date_debut, c.date_fin_prevue, c.adresse
    FROM public.chantier_assignments ca
    JOIN public.chantiers c ON c.id = ca.chantier_id
    WHERE ca.member_id = v_member_id
  ) q;

  RETURN QUERY SELECT v_member_id, v_name, v_permissions, v_role, v_owner_id, v_chantiers;
END;
$$;

-- 8. RPC: confirm_team_member — approuve + configure PIN optionnel
CREATE OR REPLACE FUNCTION public.confirm_team_member(
  p_member_id UUID,
  p_owner_id UUID,
  p_role TEXT,
  p_pin TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists BOOLEAN;
  v_new_hash TEXT;
BEGIN
  IF p_pin IS NOT NULL AND p_pin != '' THEN
    SELECT EXISTS(
      SELECT 1 FROM public.team_members
      WHERE user_id = p_owner_id
        AND id != p_member_id
        AND pin_hash IS NOT NULL
        AND pin_hash = crypt(p_pin, pin_hash)
    ) INTO v_exists;

    IF v_exists THEN
      RAISE EXCEPTION 'PIN_DUPLICATE';
    END IF;

    v_new_hash := crypt(p_pin, gen_salt('bf'));
  END IF;

  UPDATE public.team_members
  SET
    status = 'actif',
    role = p_role,
    pin_hash = CASE WHEN v_new_hash IS NOT NULL THEN v_new_hash ELSE pin_hash END,
    confirmed_at = now()
  WHERE id = p_member_id AND user_id = p_owner_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_team_member(UUID, UUID, TEXT, TEXT) TO authenticated;
