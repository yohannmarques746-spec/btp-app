-- =========================================================================
-- Migration : Fonctions SECURITY DEFINER pour l'accès aux données employé
-- Ces fonctions valident le session token de l'employé en interne et
-- renvoient les données du patron correspondant, en contournant les RLS.
-- Sécurité garantie par la validation du token + permission en SQL.
-- =========================================================================

-- ─── 1. get_team_chantiers ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_team_chantiers(p_token TEXT)
RETURNS TABLE(
  id                  uuid,
  nom                 text,
  client_id           uuid,
  client_nom          text,
  client_prenom       text,
  adresse             text,
  date_debut          date,
  date_fin_prevue     date,
  duree               text,
  statut              text,
  archived            boolean,
  images              jsonb,
  journal_entries     jsonb,
  incidents_problemes jsonb,
  materiaux           jsonb,
  documents_uploades  jsonb,
  devis_associes      jsonb,
  factures_associees  jsonb,
  created_at          timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  WITH sess AS (
    SELECT tm.user_id AS owner_id
    FROM   public.member_sessions ms
    JOIN   public.team_members    tm ON tm.id = ms.member_id
    WHERE  ms.token       = p_token
      AND  ms.expires_at  > now()
      AND  tm.status      = 'actif'
      AND  COALESCE((tm.permissions->>'chantiers')::boolean, false) = true
  )
  SELECT
    c.id, c.nom, c.client_id,
    cl.nom     AS client_nom,
    cl.prenom  AS client_prenom,
    c.adresse,
    c.date_debut, c.date_fin_prevue, c.duree,
    c.statut, c.archived,
    c.images, c.journal_entries, c.incidents_problemes,
    c.materiaux, c.documents_uploades,
    c.devis_associes, c.factures_associees,
    c.created_at
  FROM   public.chantiers c
  JOIN   sess             ON c.user_id = sess.owner_id
  LEFT JOIN public.clients cl ON cl.id = c.client_id
  ORDER  BY c.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_chantiers(TEXT) TO anon, authenticated;

-- ─── 2. get_team_clients ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_team_clients(p_token TEXT)
RETURNS TABLE(
  id        uuid,
  nom       text,
  prenom    text,
  email     text,
  telephone text,
  adresse   text,
  npa       text,
  localite  text,
  pays      text,
  notes     text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  WITH sess AS (
    SELECT tm.user_id AS owner_id
    FROM   public.member_sessions ms
    JOIN   public.team_members    tm ON tm.id = ms.member_id
    WHERE  ms.token       = p_token
      AND  ms.expires_at  > now()
      AND  tm.status      = 'actif'
      AND  COALESCE((tm.permissions->>'clients')::boolean, false) = true
  )
  SELECT
    c.id, c.nom, c.prenom, c.email, c.telephone,
    c.adresse, c.npa, c.localite, c.pays, c.notes
  FROM   public.clients c
  JOIN   sess            ON c.user_id = sess.owner_id
  ORDER  BY c.nom ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_clients(TEXT) TO anon, authenticated;

-- ─── 3. get_team_rendez_vous ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_team_rendez_vous(p_token TEXT)
RETURNS TABLE(
  id           uuid,
  chantier_id  uuid,
  titre        text,
  date         date,
  heure_debut  time,
  heure_fin    time,
  description  text,
  statut       text,
  created_at   timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  WITH sess AS (
    SELECT tm.user_id AS owner_id
    FROM   public.member_sessions ms
    JOIN   public.team_members    tm ON tm.id = ms.member_id
    WHERE  ms.token       = p_token
      AND  ms.expires_at  > now()
      AND  tm.status      = 'actif'
      AND  COALESCE((tm.permissions->>'planning')::boolean, false) = true
  )
  SELECT
    rv.id, rv.chantier_id, rv.titre, rv.date,
    rv.heure_debut, rv.heure_fin, rv.description,
    rv.statut, rv.created_at
  FROM   public.rendez_vous rv
  JOIN   sess               ON rv.user_id = sess.owner_id
  ORDER  BY rv.date ASC, rv.heure_debut ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_rendez_vous(TEXT) TO anon, authenticated;

-- ─── 4. get_team_devis ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_team_devis(p_token TEXT)
RETURNS TABLE(
  id            uuid,
  numero        text,
  client_id     uuid,
  client_nom    text,
  client_prenom text,
  date_emission date,
  date_validite date,
  statut        text,
  objet         text,
  montant_ht    numeric,
  montant_ttc   numeric,
  created_at    timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  WITH sess AS (
    SELECT tm.user_id AS owner_id
    FROM   public.member_sessions ms
    JOIN   public.team_members    tm ON tm.id = ms.member_id
    WHERE  ms.token       = p_token
      AND  ms.expires_at  > now()
      AND  tm.status      = 'actif'
      AND  COALESCE((tm.permissions->>'devis')::boolean, false) = true
  )
  SELECT
    d.id, d.numero, d.client_id,
    cl.nom     AS client_nom,
    cl.prenom  AS client_prenom,
    d.date_emission, d.date_validite,
    d.statut, d.objet,
    d.montant_ht, d.montant_ttc,
    d.created_at
  FROM   public.devis d
  JOIN   sess          ON d.user_id = sess.owner_id
  LEFT JOIN public.clients cl ON cl.id = d.client_id
  ORDER  BY d.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_team_devis(TEXT) TO anon, authenticated;
