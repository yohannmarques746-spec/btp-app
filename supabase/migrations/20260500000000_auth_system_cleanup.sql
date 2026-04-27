-- ============================================================
-- Migration : Nettoyage système d'authentification PIN
-- Date : 2026-05-xx
-- ============================================================
-- Ce fichier documente les changements du système auth.
-- Les colonnes DEPRECATED sont conservées pour rétrocompatibilité.
-- Appliquer avec : supabase db push

-- ─── 1. Marquer login_code comme DEPRECATED ──────────────────────────────────
-- On ne supprime PAS la colonne, on l'annote. Suppression dans 2-3 sprints.
COMMENT ON COLUMN public.team_members.login_code IS
  'DEPRECATED — Utiliser pin_hash à la place. login_code (plaintext) sera supprimé dans un sprint futur.';

-- ─── 2. Documenter pin_hash ───────────────────────────────────────────────────
COMMENT ON COLUMN public.team_members.pin_hash IS
  'Hash bcrypt du PIN à 6 chiffres. Utilisé par la RPC login_member_pin().';

-- ─── 3. Index sur member_sessions.expires_at ─────────────────────────────────
-- Accélère la vérification de session et le nettoyage des sessions expirées.
CREATE INDEX IF NOT EXISTS idx_member_sessions_expires_at
  ON public.member_sessions (expires_at);

-- ─── 4. Index sur team_invitations.token ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_team_invitations_token
  ON public.team_invitations (token)
  WHERE used = false;

-- ─── 5. Vue d'audit santé auth ────────────────────────────────────────────────
-- Utile pour détecter les membres sans PIN, les sessions expirées, etc.
CREATE OR REPLACE VIEW public.auth_system_health_check AS
SELECT
  (SELECT count(*) FROM public.team_members WHERE pin_hash IS NULL AND status = 'actif')
    AS members_without_pin,
  (SELECT count(*) FROM public.member_sessions WHERE expires_at < now())
    AS expired_sessions,
  (SELECT count(*) FROM public.team_invitations WHERE expires_at < now() AND used = false)
    AS expired_unused_invitations,
  (SELECT count(*) FROM public.team_members WHERE login_code IS NOT NULL AND login_code != '')
    AS members_with_legacy_login_code;

-- ─── 6. RLS sur member_sessions (service_role uniquement) ────────────────────
-- Si RLS n'est pas encore activé sur la table, l'activer.
-- ALTER TABLE public.member_sessions ENABLE ROW LEVEL SECURITY;
-- (décommentez si la table existe et si RLS n'est pas encore activé)

-- ─── Notes de migration ───────────────────────────────────────────────────────
-- PIN : passage de 4 → 6 chiffres. Les RPCs login_member_pin() et
--       create_team_member_pin() acceptent un PIN de longueur quelconque ;
--       la validation 6 chiffres est faite côté Express.
-- CSRF_SECRET : nouvelle variable d'env à définir sur Railway/Fly.io.
-- REDIS_URL    : optionnel, si défini le rate limiting devient distribué.
