import { useCallback, useEffect, useState } from "react";
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
  const match = message.match(/Could not find the '([^']+)' column/);
  return match?.[1] ?? null;
}

async function insertOrUpdateWithSchemaFallback(
  id: string | undefined,
  payload: Record<string, unknown>,
): Promise<{ error: { code?: string; message?: string; hint?: string } | null }> {
  const execute = (body: Record<string, unknown>) =>
    id ? supabase.from("chantiers").update(body).eq("id", id) : supabase.from("chantiers").insert(body);

  const first = await execute(payload);
  if (!first.error || first.error.code !== "PGRST204") return { error: first.error };

  const missingColumn = missingColumnFromErrorMessage(first.error.message);
  if (!missingColumn || !(missingColumn in payload)) return { error: first.error };

  const retryPayload = { ...payload };
  delete retryPayload[missingColumn];
  // #region agent log
  fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4f6aac'},body:JSON.stringify({sessionId:'4f6aac',runId:'post-fix',hypothesisId:'H5',location:'useChantiers.ts:86',message:'retry insert/update without missing column',data:{id:id??null,missingColumn,retryKeys:Object.keys(retryPayload)},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  const retry = await execute(retryPayload);
  return { error: retry.error };
}

function mapChantierRow(row: ChantierRow): ChantierRecord {
  const images = Array.isArray(row.images) ? row.images.filter((v): v is string => typeof v === "string") : [];
  return {
    id: row.id,
    nom: row.nom,
    clientId: row.client_id ?? "",
    clientName: row.clients?.[0]?.nom || row.clients?.[0]?.prenom || "Client inconnu",
    dateDebut: row.date_debut ?? "",
    duree: row.duree ?? "1 semaine",
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
    const fullSelect = "id, nom, client_id, date_debut, duree, images, statut, archived, journal_entries, incidents_problemes, materiaux, documents_uploades, devis_associes, factures_associees, clients(nom, prenom)";
    const legacySelect = "id, nom, client_id, date_debut, duree, images, statut, clients(nom, prenom)";
    let { data, error: fetchError } = await supabase
      .from("chantiers")
      .select(fullSelect)
      .order("created_at", { ascending: false });

    if (fetchError?.code === "PGRST204") {
      // #region agent log
      fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4f6aac'},body:JSON.stringify({sessionId:'4f6aac',runId:'post-fix',hypothesisId:'H6',location:'useChantiers.ts:122',message:'refresh fallback to legacy select',data:{code:fetchError.code,message:fetchError.message},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      const fallback = await supabase.from("chantiers").select(legacySelect).order("created_at", { ascending: false });
      data = fallback.data;
      fetchError = fallback.error;
    }

    if (fetchError) {
      console.error("useChantiers.refresh", fetchError);
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setChantiers((data ?? []).map((row) => mapChantierRow(row as ChantierRow)));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("chantiers-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "chantiers" }, () => {
        refresh();
      })
      .subscribe();

    return () => {
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
    // #region agent log
    fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4f6aac'},body:JSON.stringify({sessionId:'4f6aac',runId:'pre-fix',hypothesisId:'H1',location:'useChantiers.ts:150',message:'saveChantier payload keys',data:{id: id ?? null, keys:Object.keys(payload), hasArchived:Object.prototype.hasOwnProperty.call(payload,'archived')},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

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
      // #region agent log
      fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4f6aac'},body:JSON.stringify({sessionId:'4f6aac',runId:'pre-fix',hypothesisId:'H2',location:'useChantiers.ts:169',message:'saveChantier supabase error',data:{code:result.error.code,message:result.error.message,hint:result.error.hint},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      console.error("useChantiers.saveChantier", result.error);
      setError(result.error.message);
      return { error: result.error };
    }
    // #region agent log
    fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4f6aac'},body:JSON.stringify({sessionId:'4f6aac',runId:'post-fix',hypothesisId:'H7',location:'useChantiers.ts:208',message:'saveChantier success',data:{id:id??null,nom:data.nom},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
    const { error: updateError } = await supabase.from("chantiers").update(payload).eq("id", id);
    if (updateError) {
      console.error("useChantiers.updateChantier", updateError);
      setError(updateError.message);
      return { error: updateError };
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

