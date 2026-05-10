-- =============================================================================
-- Migration : Fonction helper d'accès employé + extension RPC login_member_pin
-- Date      : 2026-05-10
-- Objectif  : Permettre aux employés actifs (auth_user_id présent, status='actif')
--             de lire les données métier de leur patron via RLS.
-- =============================================================================

-- ─── 1. Helper : user_can_access_owner ────────────────────────────────────────
-- Retourne TRUE si l'utilisateur courant est :
--   a) le patron lui-même (auth.uid() = p_owner_id), ou
--   b) un employé actif du patron avec la permission p_feature activée.
-- STABLE + SECURITY DEFINER + search_path fixé pour éviter le hijack de schéma.
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
      SELECT 1
      FROM public.team_members tm
      WHERE tm.auth_user_id = auth.uid()
        AND tm.user_id      = p_owner_id
        AND tm.status       = 'actif'
        AND COALESCE((tm.permissions ->> p_feature)::boolean, false) = true
    );
$$;

GRANT EXECUTE ON FUNCTION public.user_can_access_owner(UUID, TEXT) TO authenticated;

-- ─── 2. login_member_pin — ajout de auth_user_id + member_email dans le retour ─
-- Le serveur Express utilise ces champs pour signer un JWT Supabase côté serveur,
-- permettant ensuite à auth.uid() d'être valorisé dans les requêtes RLS du client.
CREATE OR REPLACE FUNCTION public.login_member_pin(
  input_pin  TEXT,
  p_owner_id UUID
)
RETURNS TABLE(
  session_token TEXT,
  member_id     UUID,
  member_name   TEXT,
  auth_user_id  UUID,
  member_email  TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_id   UUID;
  v_member_name TEXT;
  v_auth_uid    UUID;
  v_email       TEXT;
  v_token       TEXT;
BEGIN
  SELECT tm.id, tm.name, tm.auth_user_id, tm.email
  INTO   v_member_id, v_member_name, v_auth_uid, v_email
  FROM   public.team_members tm
  WHERE  tm.user_id   = p_owner_id
    AND  tm.status    = 'actif'
    AND  tm.pin_hash IS NOT NULL
    AND  tm.pin_hash  = crypt(input_pin, tm.pin_hash)
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RETURN;
  END IF;

  v_token := gen_random_uuid()::text;

  INSERT INTO public.member_sessions (member_id, token, expires_at)
  VALUES (v_member_id, v_token, now() + interval '24 hours');

  RETURN QUERY SELECT v_token, v_member_id, v_member_name, v_auth_uid, v_email;
END;
$$;

-- Les RPCs SECURITY DEFINER sont accessibles depuis le rôle anon (appelées par le serveur Express
-- sans session Supabase Auth active).
GRANT EXECUTE ON FUNCTION public.login_member_pin(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.login_member_pin(TEXT, UUID) TO authenticated;
