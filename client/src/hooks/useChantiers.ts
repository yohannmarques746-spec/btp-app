import { useCallback, useEffect, useState } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { supabase, getCurrentUserId } from "@/lib/supabase";

export interface ChantierRecord {
  id: string;
  nom: string;
  clientId: string;
  clientName: string;
  dateDebut: string;
  duree: string;
  images: string[];
  statut: "planifié" | "en cours" | "terminé" | "archivé";
  archived: boolean;
  journalEntries: { id: string; date: string; auteur: string; texte: string; meteo: string }[];
  incidentsProblemes: string;
  materiaux: { id: string; nom: string; qte_prevue: number; qte_commandee: number; qte_livree: number; fournisseur: string }[];
  documentsUploades: { id: string; nom: string; categorie: string; url: string }[];
  devisAssocies: string[];
  facturesAssociees: string[];
}

export interface ChantierFormData {
  nom: string;
  clientId: string;
  dateDebut: string;
  duree: string;
  images?: string[];
  statut?: ChantierRecord["statut"];
  archived?: boolean;
  journalEntries?: ChantierRecord["journalEntries"];
  incidentsProblemes?: string;
  materiaux?: ChantierRecord["materiaux"];
  documentsUploades?: ChantierRecord["documentsUploades"];
  devisAssocies?: string[];
  facturesAssociees?: string[];
}

const DB_STATUS_FROM_UI: Record<ChantierRecord["statut"], string> = {
  "planifié": "planifié",
  "en cours": "en_cours",
  "terminé": "terminé",
  "archivé": "archive",
};

function uiStatusFromDb(status: string | null): ChantierRecord["statut"] {
  if (status === "en_cours") return "en cours";
  if (status === "terminé") return "terminé";
  if (status === "archive" || status === "archivé") return "archivé";
  return "planifié";
}

type ChantierRow = {
  id: string;
  nom: string;
  client_id: string | null;
  date_debut: string | null;
  duree: string | null;
  images: unknown;
  statut: string | null;
  archived: boolean | null;
  journal_entries: unknown;
  incidents_problemes: unknown;
  materiaux: unknown;
  documents_uploades: unknown;
  devis_associes: unknown;
  factures_associees: unknown;
  clients?: { nom: string; prenom: string | null }[] | null;
};

function objectArray<T extends Record<string, unknown>>(input: unknown): T[] {
  return Array.isArray(input) ? input.filter((v): v is T => typeof v === "object" && v !== null) : [];
}

function missingColumnFromErrorMessage(message?: string | null): string | null {
  if (!message) return null;
  const pgrstMatch = message.match(/Could not find the '([^']+)' column/);
  if (pgrstMatch?.[1]) return pgrstMatch[1];
  const pgMatch = message.match(/column\s+chantiers\.([a-zA-Z0-9_]+)\s+does not exist/i);
  if (pgMatch?.[1]) return pgMatch[1];
  return null;
}

const unsupportedChantiersColumns = new Set<string>();

async function insertOrUpdateWithSchemaFallback(
  id: string | undefined,
  payload: Record<string, unknown>,
): Promise<{ error: { code?: string; message?: string; hint?: string } | null }> {
  const execute = (body: Record<string, unknown>) =>
    id ? supabase.from("chantiers").update(body).eq("id", id) : supabase.from("chantiers").insert(body);

  let activePayload = { ...payload };
  for (const col of Array.from(unsupportedChantiersColumns)) {
    if (col in activePayload) delete activePayload[col];
  }
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const result = await execute(activePayload);
    const code = result.error?.code ?? null;
    if (!result.error || (code !== "PGRST204" && code !== "42703")) return { error: result.error };

    const missingColumn = missingColumnFromErrorMessage(result.error.message);
    if (!missingColumn || !(missingColumn in activePayload)) return { error: result.error };

    unsupportedChantiersColumns.add(missingColumn);
    delete activePayload[missingColumn];
  }

  return { error: { code: "PGRST204", message: "Schema fallback exhausted after multiple missing columns." } };
}

function mapChantierRow(row: ChantierRow): ChantierRecord {
  const images = Array.isArray(row.images) ? row.images.filter((v): v is string => typeof v === "string") : [];
  const joined =
    [row.clients?.[0]?.nom, row.clients?.[0]?.prenom].filter(Boolean).join(" ").trim() || "";
  const clientId = row.client_id ?? "";
  const clientName = !clientId ? "Client non défini" : joined;
  return {
    id: row.id,
    nom: row.nom,
    clientId,
    clientName,
    dateDebut: row.date_debut ?? "",
    duree: row.duree ?? "",
    images,
    statut: uiStatusFromDb(row.statut),
    archived: Boolean(row.archived),
    journalEntries: objectArray<{ id: string; date: string; auteur: string; texte: string; meteo: string }>(row.journal_entries),
    incidentsProblemes: typeof row.incidents_problemes === "string" ? row.incidents_problemes : "",
    materiaux: objectArray<{ id: string; nom: string; qte_prevue: number; qte_commandee: number; qte_livree: number; fournisseur: string }>(row.materiaux),
    documentsUploades: objectArray<{ id: string; nom: string; categorie: string; url: string }>(row.documents_uploades),
    devisAssocies: Array.isArray(row.devis_associes) ? row.devis_associes.filter((v): v is string => typeof v === "string") : [],
    facturesAssociees: Array.isArray(row.factures_associees) ? row.factures_associees.filter((v): v is string => typeof v === "string") : [],
  };
}

export function useChantiers() {
  const [chantiers, setChantiers] = useState<ChantierRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const fullColumns = [
      "id",
      "nom",
      "client_id",
      "date_debut",
      "duree",
      "images",
      "statut",
      "archived",
      "journal_entries",
      "incidents_problemes",
      "materiaux",
      "documents_uploades",
      "devis_associes",
      "factures_associees",
    ].filter((col) => !unsupportedChantiersColumns.has(col));
    const fullSelect = `${fullColumns.join(", ")}, clients(nom, prenom)`;
    const legacySelect = "id, nom, client_id, date_debut, duree, images, statut, clients(nom, prenom)";
    const bareSelect = "id, nom, client_id, date_debut, duree, images, statut";

    let rows: ChantierRow[] | null = null;
    let fetchError: PostgrestError | null = null;

    const primary = await supabase.from("chantiers").select(fullSelect).order("created_at", { ascending: false });
    rows = primary.data as ChantierRow[] | null;
    fetchError = primary.error;

    if (fetchError?.code === "PGRST204" || fetchError?.code === "42703") {
      const missingColumn = missingColumnFromErrorMessage(fetchError.message);
      if (missingColumn) unsupportedChantiersColumns.add(missingColumn);
      const fallback = await supabase.from("chantiers").select(legacySelect).order("created_at", { ascending: false });
      rows = fallback.data as ChantierRow[] | null;
      fetchError = fallback.error;
    }

    if (fetchError) {
      const bareFallback = await supabase.from("chantiers").select(bareSelect).order("created_at", { ascending: false });
      rows = bareFallback.data as ChantierRow[] | null;
      fetchError = bareFallback.error;
    }

    if (fetchError) {
      console.error("useChantiers.refresh", fetchError);
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setChantiers((rows ?? []).map((row) => mapChantierRow(row)));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    // Re-fetch when auth session becomes available (handles page reload & fresh login)
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        refresh();
      }
    });

    const channel = supabase
      .channel("chantiers-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "chantiers" }, () => {
        refresh();
      })
      .subscribe();

    return () => {
      authSubscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const saveChantier = useCallback(async (data: ChantierFormData, id?: string) => {
    setError(null);
    const payload: Record<string, unknown> = {
      nom: data.nom,
      client_id: data.clientId || null,
      date_debut: data.dateDebut || null,
      duree: data.duree || null,
      images: data.images ?? [],
      statut: DB_STATUS_FROM_UI[data.statut ?? "planifié"],
      archived: data.archived ?? false,
      journal_entries: data.journalEntries ?? [],
      incidents_problemes: data.incidentsProblemes ?? [],
      materiaux: data.materiaux ?? [],
      documents_uploades: data.documentsUploades ?? [],
      devis_associes: data.devisAssocies ?? [],
      factures_associees: data.facturesAssociees ?? [],
    };

    if (!id) {
      const userId = await getCurrentUserId();
      if (!userId) {
        const msg = "Session non valide : reconnectez-vous pour enregistrer le chantier.";
        setError(msg);
        return { error: new Error(msg) };
      }
      payload.user_id = userId;
    }

    const result = await insertOrUpdateWithSchemaFallback(id, payload);

    if (result.error) {
      console.error("useChantiers.saveChantier", result.error);
      setError(result.error.message ?? "Erreur inconnue");
      return { error: result.error };
    }
    await refresh();
    return { error: null };
  }, [refresh]);

  const updateChantier = useCallback(async (id: string, updates: Partial<ChantierRecord>) => {
    const payload = {
      nom: updates.nom,
      client_id: updates.clientId,
      date_debut: updates.dateDebut,
      duree: updates.duree,
      images: updates.images,
      statut: updates.statut ? DB_STATUS_FROM_UI[updates.statut] : undefined,
      archived: updates.archived,
      journal_entries: updates.journalEntries,
      incidents_problemes: updates.incidentsProblemes,
      materiaux: updates.materiaux,
      documents_uploades: updates.documentsUploades,
      devis_associes: updates.devisAssocies,
      factures_associees: updates.facturesAssociees,
    };
    const result = await insertOrUpdateWithSchemaFallback(id, payload);
    if (result.error) {
      console.error("useChantiers.updateChantier", result.error);
      setError(result.error.message ?? "Erreur de mise à jour");
      return { error: result.error };
    }
    await refresh();
    return { error: null };
  }, [refresh]);

  const deleteChantier = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase.from("chantiers").delete().eq("id", id);
    if (deleteError) {
      console.error("useChantiers.deleteChantier", deleteError);
      setError(deleteError.message);
      return { error: deleteError };
    }
    await refresh();
    return { error: null };
  }, [refresh]);

  return { chantiers, loading, error, refresh, saveChantier, updateChantier, deleteChantier };
}


export { getCurrentUserId };
