import { useCallback, useEffect, useState } from "react";
import { supabase, getCurrentUserId } from "@/lib/supabase";

export interface ClientRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  prenom?: string;
  adresse?: string;
  npa?: string;
  localite?: string;
  pays?: string;
  notes?: string;
}

export interface ClientFormData {
  name: string;
  email?: string;
  phone?: string;
  prenom?: string;
  adresse?: string;
  npa?: string;
  localite?: string;
  pays?: string;
  notes?: string;
}

function mapClientRow(row: {
  id: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  prenom: string | null;
  adresse: string | null;
  npa: string | null;
  localite: string | null;
  pays: string | null;
  notes: string | null;
}): ClientRecord {
  return {
    id: row.id,
    name: row.nom,
    email: row.email ?? "",
    phone: row.telephone ?? "",
    prenom: row.prenom ?? undefined,
    adresse: row.adresse ?? undefined,
    npa: row.npa ?? undefined,
    localite: row.localite ?? undefined,
    pays: row.pays ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export function useClients() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("clients")
      .select("id, nom, prenom, email, telephone, adresse, npa, localite, pays, notes")
      .order("nom", { ascending: true });

    if (fetchError) {
      console.error("useClients.refresh", fetchError);
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setClients((data ?? []).map(mapClientRow));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("clients-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => {
        refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh]);

  const saveClient = useCallback(async (data: ClientFormData, id?: string) => {
    setError(null);
    const payload: Record<string, unknown> = {
      nom: data.name.trim(),
      prenom: data.prenom?.trim() || null,
      email: data.email?.trim() || null,
      telephone: data.phone?.trim() || null,
      adresse: data.adresse?.trim() || null,
      npa: data.npa?.trim() || null,
      localite: data.localite?.trim() || null,
      pays: data.pays?.trim() || "Suisse",
      notes: data.notes?.trim() || null,
    };

    if (!id) {
      const userId = await getCurrentUserId();
      if (!userId) {
        const msg = "Session non valide : reconnectez-vous pour enregistrer le client.";
        setError(msg);
        return { data: null, error: new Error(msg) };
      }
      payload.user_id = userId;
    }

    const result = id
      ? await supabase.from("clients").update(payload).eq("id", id).select("id, nom, prenom, email, telephone, adresse, npa, localite, pays, notes").single()
      : await supabase.from("clients").insert(payload).select("id, nom, prenom, email, telephone, adresse, npa, localite, pays, notes").single();

    if (result.error) {
      console.error("useClients.saveClient", result.error);
      setError(result.error.message);
      return { data: null, error: result.error };
    }

    await refresh();
    return { data: result.data ? mapClientRow(result.data) : null, error: null };
  }, [refresh]);

  const deleteClient = useCallback(async (id: string) => {
    setError(null);
    const { error: deleteError } = await supabase.from("clients").delete().eq("id", id);
    if (deleteError) {
      console.error("useClients.deleteClient", deleteError);
      setError(deleteError.message);
      return { error: deleteError };
    }
    await refresh();
    return { error: null };
  }, [refresh]);

  return { clients, loading, error, refresh, saveClient, deleteClient };
}

