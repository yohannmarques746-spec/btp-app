-- ============================================================================
-- Première connexion employé : l'INSERT direct depuis le JWT échoue sous RLS
-- (owner_or_coowner_manage_members exige user_id = auth.uid()).
-- Cette RPC insère la ligne en_attente_confirmation en SECURITY DEFINER.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.register_pending_team_member(
  p_owner_id UUID,
  p_email TEXT,
  p_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = p_owner_id) THEN
    RAISE EXCEPTION 'INVALID_OWNER';
  END IF;

  SELECT tm.id INTO v_id
  FROM public.team_members tm
  WHERE tm.auth_user_id = auth.uid()
    AND tm.user_id = p_owner_id
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.team_members (
    user_id,
    auth_user_id,
    email,
    name,
    role,
    status,
    permissions,
    login_code
  )
  VALUES (
    p_owner_id,
    auth.uid(),
    COALESCE(NULLIF(btrim(p_email), ''), ''),
    COALESCE(
      NULLIF(btrim(p_name), ''),
      COALESCE(NULLIF(btrim(p_email), ''), 'Membre')
    ),
    'employee',
    'en_attente_confirmation',
    jsonb_build_object(
      'crm', false,
      'planning', false,
      'devis', false,
      'factures', false,
      'chantiers', false,
      'clients', false,
      'dashboard', false
    ),
    ''
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_pending_team_member(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_pending_team_member(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_pending_team_member(UUID, TEXT, TEXT) TO anon;
