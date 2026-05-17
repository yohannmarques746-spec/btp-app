import { useCallback, useEffect, useState } from "react";
import { supabase, getCurrentUserId } from "@/lib/supabase";

export type FactureStatus = "non_payee" | "payee" | "en_retard";

export interface FactureRecord {
  id: string;
  numero: string;
  devisId?: string;
  clientId?: string;
  dateEmission?: string;
  dateEcheance?: string;
  statut: FactureStatus;
  lignes: unknown[];
  tvaTaux: number;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  notes?: string;
}

function mapFacture(row: {
  id: string;
  numero: string;
  devis_id: string | null;
  client_id: string | null;
  date_emission: string | null;
  date_echeance: string | null;
  statut: string | null;
  lignes: unknown;
  tva_taux: number | null;
  montant_ht: number | null;
  montant_tva: number | null;
  montant_ttc: number | null;
  notes: string | null;
}): FactureRecord {
  return {
    id: row.id,
    numero: row.numero,
    devisId: row.devis_id ?? undefined,
    clientId: row.client_id ?? undefined,
    dateEmission: row.date_emission ?? undefined,
    dateEcheance: row.date_echeance ?? undefined,
    statut: (row.statut as FactureStatus) || "non_payee",
    lignes: Array.isArray(row.lignes) ? row.lignes : [],
    tvaTaux: Number(row.tva_taux ?? 8.1),
    montantHT: Number(row.montant_ht ?? 0),
    montantTVA: Number(row.montant_tva ?? 0),
    montantTTC: Number(row.montant_ttc ?? 0),
    notes: row.notes ?? undefined,
  };
}

export function useFactures() {
  const [factures, setFactures] = useState<FactureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase.from("factures").select("*").order("created_at", { ascending: false });
    if (fetchError) {
      console.error("useFactures.refresh", fetchError);
      setError(fetchError.message);
      setLoading(false);
      return;
    }
    setFactures((data ?? []).map(mapFacture));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel("factures-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "factures" }, () => {
        refresh();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  const saveFacture = useCallback(async (facture: Omit<FactureRecord, "id">, id?: string) => {
    setError(null);
    const payload: Record<string, unknown> = {
      numero: facture.numero,
      devis_id: facture.devisId ?? null,
      client_id: facture.clientId ?? null,
      date_emission: facture.dateEmission ?? null,
      date_echeance: facture.dateEcheance ?? null,
      statut: facture.statut,
      lignes: facture.lignes,
      tva_taux: facture.tvaTaux,
      montant_ht: facture.montantHT,
      montant_tva: facture.montantTVA,
      montant_ttc: facture.montantTTC,
      notes: facture.notes ?? null,
      updated_at: new Date().toISOString(),
    };

    if (!id) {
      const userId = await getCurrentUserId();
      if (!userId) {
        const msg = "Session non valide : reconnectez-vous pour enregistrer la facture.";
        setError(msg);
        return { error: new Error(msg) };
      }
      payload.user_id = userId;
    }

    const result = id
      ? await supabase.from("factures").update(payload).eq("id", id)
      : await supabase.from("factures").insert(payload);

    if (result.error) {
      console.error("useFactures.saveFacture", result.error);
      setError(result.error.message);
      return { error: result.error };
    }
    await refresh();
    return { error: null };
  }, [refresh]);

  const deleteFacture = useCallback(async (id: string) => {
    const { error: deleteError } = await supabase.from("factures").delete().eq("id", id);
    if (deleteError) {
      console.error("useFactures.deleteFacture", deleteError);
      setError(deleteError.message);
      return { error: deleteError };
    }
    await refresh();
    return { error: null };
  }, [refresh]);

  return { factures, loading, error, refresh, saveFacture, deleteFacture };
}

