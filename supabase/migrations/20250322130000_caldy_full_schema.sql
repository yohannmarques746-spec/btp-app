-- ============================================================================
-- CALDY — schéma complet pour Supabase (projet uowsssvaobrpdpnhxgwc ou autre)
-- Exécuter UNE FOIS dans : Dashboard → SQL Editor → New query → Run
-- Idempotent : CREATE IF NOT EXISTS + DROP POLICY IF EXISTS où pertinent
-- ============================================================================

-- --- user_profiles (inscription / AuthContext) --------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_profiles_own" ON public.user_profiles;
CREATE POLICY "user_profiles_own"
  ON public.user_profiles FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;

-- --- clients ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  nom text NOT NULL,
  prenom text,
  email text,
  telephone text,
  adresse text,
  npa text,
  localite text,
  pays text DEFAULT 'Suisse',
  notes text
);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients (user_id);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "clients_own" ON public.clients;
CREATE POLICY "clients_own"
  ON public.clients FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;

-- --- chantiers ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chantiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  nom text NOT NULL,
  client_id uuid REFERENCES public.clients (id) ON DELETE SET NULL,
  adresse text,
  npa text,
  localite text,
  latitude double precision,
  longitude double precision,
  date_debut date,
  date_fin_prevue date,
  statut text,
  description text,
  budget numeric,
  notes text,
  duree text,
  images jsonb DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_chantiers_user_id ON public.chantiers (user_id);

ALTER TABLE public.chantiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chantiers_own" ON public.chantiers;
CREATE POLICY "chantiers_own"
  ON public.chantiers FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chantiers TO authenticated;
GRANT ALL ON public.chantiers TO service_role;

-- --- profil_entreprise --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profil_entreprise (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  nom text,
  adresse text,
  npa text,
  localite text,
  pays text,
  telephone text,
  email text,
  site_web text,
  numero_ide text,
  numero_tva text,
  iban text,
  logo_url text,
  CONSTRAINT profil_entreprise_user_id_key UNIQUE (user_id)
);

ALTER TABLE public.profil_entreprise ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profil_entreprise_own" ON public.profil_entreprise;
CREATE POLICY "profil_entreprise_own"
  ON public.profil_entreprise FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profil_entreprise TO authenticated;
GRANT ALL ON public.profil_entreprise TO service_role;

-- --- devis --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.devis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  numero text NOT NULL,
  client_id uuid REFERENCES public.clients (id) ON DELETE SET NULL,
  date_emission date,
  date_validite date,
  statut text,
  lignes jsonb DEFAULT '[]'::jsonb,
  tva_taux numeric,
  montant_ht numeric,
  montant_tva numeric,
  montant_ttc numeric,
  conditions text,
  notes_internes text,
  signature_client text,
  objet text,
  delai_execution text,
  devis_payant boolean DEFAULT false,
  montant_devis numeric,
  emetteur jsonb,
  client jsonb
);

CREATE INDEX IF NOT EXISTS idx_devis_user_id ON public.devis (user_id);

ALTER TABLE public.devis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "devis_own" ON public.devis;
CREATE POLICY "devis_own"
  ON public.devis FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.devis TO authenticated;
GRANT ALL ON public.devis TO service_role;

-- --- factures -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.factures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  numero text NOT NULL,
  devis_id uuid REFERENCES public.devis (id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients (id) ON DELETE SET NULL,
  date_emission date,
  date_echeance date,
  statut text,
  lignes jsonb DEFAULT '[]'::jsonb,
  tva_taux numeric,
  montant_ht numeric,
  montant_tva numeric,
  montant_ttc numeric,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_factures_user_id ON public.factures (user_id);

ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "factures_own" ON public.factures;
CREATE POLICY "factures_own"
  ON public.factures FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.factures TO authenticated;
GRANT ALL ON public.factures TO service_role;

-- --- admin_codes --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_codes_user_id_key UNIQUE (user_id)
);

ALTER TABLE public.admin_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_codes_select_own" ON public.admin_codes;
DROP POLICY IF EXISTS "admin_codes_insert_own" ON public.admin_codes;
DROP POLICY IF EXISTS "admin_codes_update_own" ON public.admin_codes;
DROP POLICY IF EXISTS "admin_codes_delete_own" ON public.admin_codes;

CREATE POLICY "admin_codes_select_own"
  ON public.admin_codes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admin_codes_insert_own"
  ON public.admin_codes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_codes_update_own"
  ON public.admin_codes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_codes_delete_own"
  ON public.admin_codes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_codes TO authenticated;
GRANT ALL ON public.admin_codes TO service_role;

-- --- team_members -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL,
  email text NOT NULL,
  phone text,
  status text NOT NULL DEFAULT 'actif',
  login_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members (user_id);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_members_admin_all" ON public.team_members;
CREATE POLICY "team_members_admin_all"
  ON public.team_members FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Page invitation : lecture / mise à jour sans session (token dans l’URL)
DROP POLICY IF EXISTS "team_members_anon_invite_read" ON public.team_members;
CREATE POLICY "team_members_anon_invite_read"
  ON public.team_members FOR SELECT
  TO anon
  USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT SELECT ON public.team_members TO anon;
GRANT ALL ON public.team_members TO service_role;

-- --- team_invitations ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  team_member_id uuid REFERENCES public.team_members (id) ON DELETE SET NULL,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON public.team_invitations (token);

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_invitations_admin_all" ON public.team_invitations;
CREATE POLICY "team_invitations_admin_all"
  ON public.team_invitations FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "team_invitations_anon_read" ON public.team_invitations;
CREATE POLICY "team_invitations_anon_read"
  ON public.team_invitations FOR SELECT
  TO anon
  USING (NOT used AND expires_at > now());

DROP POLICY IF EXISTS "team_invitations_anon_update" ON public.team_invitations;
CREATE POLICY "team_invitations_anon_update"
  ON public.team_invitations FOR UPDATE
  TO anon
  USING (NOT used AND expires_at > now())
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_invitations TO authenticated;
GRANT SELECT, UPDATE ON public.team_invitations TO anon;
GRANT ALL ON public.team_invitations TO service_role;

-- Realtime : Dashboard → Database → Replication → activer clients, chantiers, devis si besoin
