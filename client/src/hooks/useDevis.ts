import { useCallback, useEffect, useId, useState } from "react";
import { supabase, getCurrentUserId } from "@/lib/supabase";
import { normalizeUniteLegacy } from "@/constants/unitesPrestation";
import type { Devis, Emetteur, LignePrestation } from "@/types/devis";
import { computeDevisStatus } from "@/utils/devisCalculs";

function normalizeStatus(value: string | null): Devis["statut"] {
  if (value === "envoye" || value === "accepte" || value === "refuse" || value === "expire") return value;
  return "brouillon";
}

function mapRowToDevis(row: {
  id: string;
  client_id?: string | null;
  numero: string;
  date_emission: string | null;
  date_validite: string | null;
  statut: string | null;
  lignes: unknown;
  montant_ht: number | null;
  montant_tva: number | null;
  montant_ttc: number | null;
  conditions: string | null;
  notes_internes: string | null;
  objet: string | null;
  delai_execution: string | null;
  devis_payant: boolean | null;
  montant_devis: number | null;
  emetteur: unknown;
  client: unknown;
  created_at: string | null;
  updated_at: string | null;
}): Devis {
  const lignesRaw = Array.isArray(row.lignes) ? (row.lignes as LignePrestation[]) : [];
  const lignes = lignesRaw.map((l) => ({
    ...l,
    unite: normalizeUniteLegacy(typeof l.unite === "string" ? l.unite : String(l.unite ?? "")),
  }));
  const client = (row.client as Devis["client"] | null) ?? { nom: "", adresse: "", npa: "", ville: "" };
  const emetteur = (row.emetteur as Emetteur | null) ?? {
    nom: "",
    adresse: "",
    npa: "",
    ville: "",
    ide: "",
    email: "",
    telephone: "",
  };

  const mapped: Devis = {
    id: row.id,
    clientId: row.client_id ?? undefined,
    numero: row.numero,
    dateEmission: row.date_emission ?? new Date().toISOString().slice(0, 10),
    dureeValidite: 30,
    dateExpiration: row.date_validite ?? new Date().toISOString().slice(0, 10),
    objet: row.objet ?? "",
    emetteur,
    client,
    lignes,
    sousTotalHT: Number(row.montant_ht ?? 0),
    montantTVA: Number(row.montant_tva ?? 0),
    totalTTC: Number(row.montant_ttc ?? 0),
    conditionsPaiement: row.conditions ?? "",
    delaiExecution: row.delai_execution ?? undefined,
    notes: row.notes_internes ?? undefined,
    devisPayant: Boolean(row.devis_payant),
    montantDevis: row.montant_devis ?? undefined,
    statut: normalizeStatus(row.statut),
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
  mapped.statut = computeDevisStatus(mapped);
  return mapped;
}

export function useDevis() {
  const instanceId = useId();
  const [devisList, setDevisList] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("devis")
      .select("*")
      .order("created_at", { ascending: false });
    if (fetchError) {
      console.error("useDevis.refresh", fetchError);
      setError(fetchError.message);
      setLoading(false);
      return;
    }
    setDevisList((data ?? []).map((row) => mapRowToDevis(row)));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel(`devis-realtime-${instanceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "devis" }, () => {
        refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh, instanceId]);

  const saveDevis = useCallback(async (devis: Devis, id?: string) => {
    setError(null);
    const payload: Record<string, unknown> = {
      numero: devis.numero,
      date_emission: devis.dateEmission,
      date_validite: devis.dateExpiration,
      statut: devis.statut,
      lignes: devis.lignes,
      tva_taux: 8.1,
      montant_ht: devis.sousTotalHT,
      montant_tva: devis.montantTVA,
      montant_ttc: devis.totalTTC,
      conditions: devis.conditionsPaiement,
      notes_internes: devis.notes ?? null,
      objet: devis.objet,
      delai_execution: devis.delaiExecution ?? null,
      devis_payant: devis.devisPayant,
      montant_devis: devis.montantDevis ?? null,
      emetteur: devis.emetteur,
      client: devis.client,
      client_id: devis.clientId ?? null,
      updated_at: new Date().toISOString(),
    };

    if (!id) {
      const userId = await getCurrentUserId();
      if (!userId) {
        const msg = "Session non valide : reconnectez-vous pour enregistrer le devis.";
        setError(msg);
        return { data: null, error: new Error(msg) };
      }
      payload.user_id = userId;
    }

    const result = id
      ? await supabase.from("devis").update(payload).eq("id", id).select("*").single()
      : await supabase.from("devis").insert(payload).select("*").single();

    if (result.error) {
      console.error("useDevis.saveDevis", result.error);
      setError(result.error.message);
      return { data: null, error: result.error };
    }
    await refresh();
    return { data: mapRowToDevis(result.data), error: null };
  }, [refresh]);

  const deleteDevis = useCallback(async (id: string) => {
    setError(null);
    const { error: deleteError } = await supabase.from("devis").delete().eq("id", id);
    if (deleteError) {
      console.error("useDevis.deleteDevis", deleteError);
      setError(deleteError.message);
      return { error: deleteError };
    }
    await refresh();
    return { error: null };
  }, [refresh]);

  const getNextNumeroDevis = useCallback(async () => {
    const year = new Date().getFullYear();
    const { count, error: countError } = await supabase
      .from("devis")
      .select("id", { count: "exact", head: true });
    if (countError) {
      console.error("useDevis.getNextNumeroDevis", countError);
      return `DEV-${year}-0001`;
    }
    const next = (count ?? 0) + 1;
    return `DEV-${year}-${String(next).padStart(4, "0")}`;
  }, []);

  return { devisList, loading, error, refresh, saveDevis, deleteDevis, getNextNumeroDevis };
}

