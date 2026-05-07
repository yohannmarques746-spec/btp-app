-- ============================================================================
-- Trigger handle_new_user : crée automatiquement une ligne user_profiles
-- à chaque INSERT dans auth.users.
--
-- Indispensable parce que :
--  - public.user_profiles.RLS exige id = auth.uid() (USING + WITH CHECK)
--  - L'INSERT côté client dans AuthContext.signUp() échoue silencieusement
--    quand la confirmation email est requise (pas de JWT actif au moment
--    de l'INSERT) → user_profiles reste vide
--  - La RPC register_pending_team_member exige l'existence du patron dans
--    user_profiles → INVALID_OWNER → la demande employé n'est jamais créée
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill ponctuel des comptes auth.users déjà existants au moment de la migration.
-- ON CONFLICT garantit qu'on n'écrase pas un user_profiles déjà présent.
INSERT INTO public.user_profiles (id, email, full_name)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email)
FROM auth.users
ON CONFLICT (id) DO NOTHING;
