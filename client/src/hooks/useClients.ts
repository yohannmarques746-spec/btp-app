import { useCallback, useEffect, useRef, useState } from "react";
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
  const effectRunRef = useRef(0);

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
    effectRunRef.current += 1;
    const runId = `useClients-effect-${effectRunRef.current}`;
    const existingChannelsBefore = (supabase.getChannels?.() ?? []).map((chan) => ({
      topic: (chan as { topic?: string }).topic ?? "unknown",
      state: (chan as { state?: string }).state ?? "unknown",
    }));
    // #region agent log
    fetch("http://127.0.0.1:7471/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5953e6" }, body: JSON.stringify({ sessionId: "5953e6", runId, hypothesisId: "H1", location: "client/src/hooks/useClients.ts:85", message: "useEffect mount started", data: { existingChannelsBefore }, timestamp: Date.now() }) }).catch(() => {});
    // #endregion
    refresh();
    const channelName = `clients-realtime-${globalThis.crypto.randomUUID()}`;
    const channel = supabase.channel(channelName);
    // #region agent log
    fetch("http://127.0.0.1:7471/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5953e6" }, body: JSON.stringify({ sessionId: "5953e6", runId: "post-fix", hypothesisId: "H2", location: "client/src/hooks/useClients.ts:92", message: "channel created", data: { channelName, topic: (channel as { topic?: string }).topic ?? "unknown", state: (channel as { state?: string }).state ?? "unknown" }, timestamp: Date.now() }) }).catch(() => {});
    // #endregion
    let subscribedChannel = channel;
    try {
      subscribedChannel = channel
        .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => {
          // #region agent log
          fetch("http://127.0.0.1:7471/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5953e6" }, body: JSON.stringify({ sessionId: "5953e6", runId, hypothesisId: "H4", location: "client/src/hooks/useClients.ts:99", message: "postgres change callback fired", data: { topic: ((channel as { topic?: string }).topic ?? "unknown") }, timestamp: Date.now() }) }).catch(() => {});
          // #endregion
          refresh();
        })
        .subscribe();
      // #region agent log
      fetch("http://127.0.0.1:7471/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5953e6" }, body: JSON.stringify({ sessionId: "5953e6", runId, hypothesisId: "H3", location: "client/src/hooks/useClients.ts:106", message: "channel subscribed", data: { topic: (subscribedChannel as { topic?: string }).topic ?? "unknown", state: (subscribedChannel as { state?: string }).state ?? "unknown" }, timestamp: Date.now() }) }).catch(() => {});
      // #endregion
    } catch (subscriptionError) {
      // #region agent log
      fetch("http://127.0.0.1:7471/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5953e6" }, body: JSON.stringify({ sessionId: "5953e6", runId, hypothesisId: "H3", location: "client/src/hooks/useClients.ts:110", message: "subscribe pipeline failed", data: { errorMessage: subscriptionError instanceof Error ? subscriptionError.message : "unknown error", topic: (channel as { topic?: string }).topic ?? "unknown", state: (channel as { state?: string }).state ?? "unknown" }, timestamp: Date.now() }) }).catch(() => {});
      // #endregion
      throw subscriptionError;
    }

    // Re-fetch when auth session becomes available (handles page reload & fresh login)
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        refresh();
      }
    });

    return () => {
      // #region agent log
      fetch("http://127.0.0.1:7471/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da", { method: "POST", headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "5953e6" }, body: JSON.stringify({ sessionId: "5953e6", runId, hypothesisId: "H1", location: "client/src/hooks/useClients.ts:117", message: "cleanup removeChannel called", data: { topic: (subscribedChannel as { topic?: string }).topic ?? "unknown", state: (subscribedChannel as { state?: string }).state ?? "unknown", channelsAtCleanup: (supabase.getChannels?.() ?? []).map((chan) => ({ topic: (chan as { topic?: string }).topic ?? "unknown", state: (chan as { state?: string }).state ?? "unknown" })) }, timestamp: Date.now() }) }).catch(() => {});
      // #endregion
      authSubscription.unsubscribe();
      supabase.removeChannel(subscribedChannel);
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

