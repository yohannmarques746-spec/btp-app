import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface ChantierRecord {
  id: string;
  nom: string;
  clientId: string;
  clientName: string;
  dateDebut: string;
  duree: string;
  images: string[];
  statut: "planifié" | "en cours" | "terminé";
}

export interface ChantierFormData {
  nom: string;
  clientId: string;
  dateDebut: string;
  duree: string;
  images?: string[];
  statut?: ChantierRecord["statut"];
}

const DB_STATUS_FROM_UI: Record<ChantierRecord["statut"], string> = {
  "planifié": "planifié",
  "en cours": "en_cours",
  "terminé": "terminé",
};

function uiStatusFromDb(status: string | null): ChantierRecord["statut"] {
  if (status === "en_cours") return "en cours";
  if (status === "terminé") return "terminé";
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
  clients?: { nom: string; prenom: string | null }[] | null;
};

function mapChantierRow(row: ChantierRow): ChantierRecord {
  const images = Array.isArray(row.images) ? row.images.filter((v): v is string => typeof v === "string") : [];
  return {
    id: row.id,
    nom: row.nom,
    clientId: row.client_id ?? "",
    clientName: row.clients?.[0]?.nom ?? "Client inconnu",
    dateDebut: row.date_debut ?? "",
    duree: row.duree ?? "1 semaine",
    images,
    statut: uiStatusFromDb(row.statut),
  };
}

export function useChantiers() {
  const [chantiers, setChantiers] = useState<ChantierRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("chantiers")
      .select("id, nom, client_id, date_debut, duree, images, statut, clients(nom, prenom)")
      .order("created_at", { ascending: false });

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
    const payload = {
      nom: data.nom,
      client_id: data.clientId || null,
      date_debut: data.dateDebut || null,
      duree: data.duree || null,
      images: data.images ?? [],
      statut: DB_STATUS_FROM_UI[data.statut ?? "planifié"],
    };

    const result = id
      ? await supabase.from("chantiers").update(payload).eq("id", id)
      : await supabase.from("chantiers").insert(payload);

    if (result.error) {
      console.error("useChantiers.saveChantier", result.error);
      setError(result.error.message);
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

