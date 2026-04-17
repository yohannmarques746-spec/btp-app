-- ============================================================================
-- CALDY — Système PIN membres d'équipe
-- Exécuter dans : Dashboard → SQL Editor → New query → Run
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── 1. Colonnes ajoutées à team_members existante ───────────────────────────
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS pin_hash TEXT,
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{
    "crm": false,
    "planning": false,
    "devis": false,
    "factures": false,
    "chantiers": false,
    "clients": false,
    "dashboard": false
  }'::jsonb;

-- ─── 2. member_sessions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.member_sessions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  UUID        NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  token      TEXT        NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '24 hours',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.member_sessions ENABLE ROW LEVEL SECURITY;
-- Pas de policy publique — accès uniquement via service_role (serveur)
GRANT ALL ON public.member_sessions TO service_role;

-- ─── 3. chantier_assignments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chantier_assignments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID        NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  chantier_id UUID        NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(member_id, chantier_id)
);

ALTER TABLE public.chantier_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_manage_assignments" ON public.chantier_assignments;
CREATE POLICY "owner_manage_assignments" ON public.chantier_assignments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = member_id AND tm.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, DELETE ON public.chantier_assignments TO authenticated;
GRANT ALL ON public.chantier_assignments TO service_role;

-- ─── 4. chantier_notes ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chantier_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id UUID        NOT NULL REFERENCES public.chantiers(id) ON DELETE CASCADE,
  member_id   UUID        NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.chantier_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_read_notes" ON public.chantier_notes;
CREATE POLICY "owner_read_notes" ON public.chantier_notes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.id = member_id AND tm.user_id = auth.uid()
    )
  );

GRANT SELECT ON public.chantier_notes TO authenticated;
GRANT ALL ON public.chantier_notes TO service_role;

-- ─── 5. RPC : hash_pin ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.hash_pin(input_pin TEXT)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT crypt($1, gen_salt('bf'));
$$;

-- ─── 6. RPC : verify_member_pin ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verify_member_pin(input_pin TEXT, p_owner_id UUID)
RETURNS TABLE(member_id UUID, member_name TEXT, member_permissions JSONB)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, name, permissions
  FROM public.team_members
  WHERE user_id = p_owner_id
    AND pin_hash IS NOT NULL
    AND pin_hash = crypt($1, pin_hash);
$$;

-- ─── 7. RPC : check_pin_exists ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_pin_exists(
  input_pin        TEXT,
  p_owner_id       UUID,
  exclude_member_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.team_members
    WHERE user_id = p_owner_id
      AND pin_hash IS NOT NULL
      AND pin_hash = crypt($1, pin_hash)
      AND (exclude_member_id IS NULL OR id <> exclude_member_id)
  );
$$;

-- ─── 8. RPC : login_member_pin — vérifie PIN + crée session en une fois ──────
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

-- ─── 9. RPC : logout_member — supprime la session ────────────────────────────
CREATE OR REPLACE FUNCTION public.logout_member(p_token TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.member_sessions WHERE token = p_token;
$$;

-- ─── 10. RPC : get_member_session — récupère infos + chantiers ───────────────
CREATE OR REPLACE FUNCTION public.get_member_session(p_token TEXT)
RETURNS TABLE(
  member_id UUID,
  member_name TEXT,
  member_permissions JSONB,
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
  v_owner_id UUID;
  v_chantiers JSONB;
BEGIN
  SELECT ms.member_id, tm.name, tm.permissions, tm.user_id
  INTO v_member_id, v_name, v_permissions, v_owner_id
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

  RETURN QUERY SELECT v_member_id, v_name, v_permissions, v_owner_id, v_chantiers;
END;
$$;

-- ─── 11. RPC : create_team_member_pin — création avec hash PIN ───────────────
CREATE OR REPLACE FUNCTION public.create_team_member_pin(
  p_owner_id UUID,
  p_name     TEXT,
  p_role     TEXT,
  p_pin      TEXT
)
RETURNS TABLE(id UUID, name TEXT, permissions JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.team_members
    WHERE user_id = p_owner_id
      AND pin_hash IS NOT NULL
      AND pin_hash = crypt(p_pin, pin_hash)
  ) INTO v_exists;

  IF v_exists THEN
    RAISE EXCEPTION 'PIN_DUPLICATE';
  END IF;

  RETURN QUERY
  INSERT INTO public.team_members (user_id, name, role, pin_hash, permissions, status)
  VALUES (
    p_owner_id, p_name, p_role,
    crypt(p_pin, gen_salt('bf')),
    '{"crm":false,"planning":false,"devis":false,"factures":false,"chantiers":false,"clients":false,"dashboard":false}'::jsonb,
    'actif'
  )
  RETURNING id, name, permissions;
END;
$$;

-- ─── 12. RPC : update_member_pin — modification PIN avec vérif unicité ───────
CREATE OR REPLACE FUNCTION public.update_member_pin(
  p_member_id UUID,
  p_owner_id  UUID,
  p_new_pin   TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.team_members
    WHERE user_id = p_owner_id
      AND id <> p_member_id
      AND pin_hash IS NOT NULL
      AND pin_hash = crypt(p_new_pin, pin_hash)
  ) INTO v_exists;

  IF v_exists THEN
    RAISE EXCEPTION 'PIN_DUPLICATE';
  END IF;

  UPDATE public.team_members
  SET pin_hash = crypt(p_new_pin, gen_salt('bf'))
  WHERE id = p_member_id AND user_id = p_owner_id;

  RETURN true;
END;
$$;

-- ─── 13. RPC : insert_chantier_note — note membre via token session ───────────
CREATE OR REPLACE FUNCTION public.insert_chantier_note(
  p_token      TEXT,
  p_chantier_id UUID,
  p_content    TEXT
)
RETURNS TABLE(id UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_id UUID;
  v_is_assigned BOOLEAN;
BEGIN
  SELECT ms.member_id INTO v_member_id
  FROM public.member_sessions ms
  WHERE ms.token = p_token AND ms.expires_at > now()
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.chantier_assignments
    WHERE member_id = v_member_id AND chantier_id = p_chantier_id
  ) INTO v_is_assigned;

  IF NOT v_is_assigned THEN
    RAISE EXCEPTION 'NOT_ASSIGNED';
  END IF;

  RETURN QUERY
  INSERT INTO public.chantier_notes (chantier_id, member_id, content)
  VALUES (p_chantier_id, v_member_id, p_content)
  RETURNING id, created_at;
END;
$$;

-- Accès aux fonctions depuis le rôle anon (appelées via API Supabase sans auth)
GRANT EXECUTE ON FUNCTION public.login_member_pin(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.logout_member(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_member_session(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.create_team_member_pin(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_member_pin(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_chantier_note(TEXT, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_member_pin(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.check_pin_exists(TEXT, UUID, UUID) TO authenticated;
