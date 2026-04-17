import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Client } from "@/context/ChantiersContext";
import type { CrmColumn, CrmProspect, PendingSendContext } from "@/types/crm";
import { createEmptyCrmColumns } from "@/hooks/crmPipelineStorage";

const STORAGE_PREFIX = "crm-pipeline-v1:";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function parseStoredColumns(raw: unknown): CrmColumn[] | null {
  if (!isRecord(raw)) return null;
  const cols = raw.columns;
  if (!Array.isArray(cols)) return null;
  const template = createEmptyCrmColumns();
  const result: CrmColumn[] = [];
  for (const def of template) {
    const found = cols.find((c) => isRecord(c) && c.id === def.id);
    if (!found || !isRecord(found)) {
      result.push({ ...def, items: [] });
      continue;
    }
    const itemsRaw = found.items;
    if (!Array.isArray(itemsRaw)) {
      result.push({ ...def, items: [] });
      continue;
    }
    const items: CrmProspect[] = [];
    for (const item of itemsRaw) {
      if (!isRecord(item)) continue;
      const id = item.id != null ? String(item.id) : "";
      const email = item.email != null ? String(item.email) : "";
      if (!id || !email) continue;
      items.push({
        id,
        name: item.name != null ? String(item.name) : "",
        email,
        phone: item.phone != null ? String(item.phone) : undefined,
        company: item.company != null ? String(item.company) : undefined,
        notes: item.notes != null ? String(item.notes) : undefined,
        createdAt:
          item.createdAt != null ? String(item.createdAt) : new Date().toISOString().slice(0, 10),
        clientId: item.clientId != null ? String(item.clientId) : undefined,
      });
    }
    result.push({ id: def.id, name: def.name, items });
  }
  return result.length === template.length ? result : null;
}

export function useCrmPipeline() {
  const [userId, setUserId] = useState<string | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  const [columns, setColumns] = useState<CrmColumn[]>(() => createEmptyCrmColumns());
  const [pendingSendContext, setPendingSendContext] = useState<PendingSendContext | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) {
      setStorageReady(false);
      setColumns(createEmptyCrmColumns());
      return;
    }
    setStorageReady(false);
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
      if (!raw) {
        setColumns(createEmptyCrmColumns());
        setStorageReady(true);
        return;
      }
      const parsed = parseStoredColumns(JSON.parse(raw) as unknown);
      setColumns(parsed ?? createEmptyCrmColumns());
    } catch {
      setColumns(createEmptyCrmColumns());
    } finally {
      setStorageReady(true);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || !storageReady) return;
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify({ columns }));
    } catch {
      /* quota / private mode */
    }
  }, [userId, columns, storageReady]);

  const addProspectFromClient = useCallback((client: Client): { ok: true } | { ok: false; reason: "duplicate" } => {
    let out: { ok: true } | { ok: false; reason: "duplicate" } = { ok: true };
    setColumns((prev) => {
      const all = prev.find((c) => c.id === "all");
      if (all?.items.some((p) => p.clientId === client.id)) {
        out = { ok: false, reason: "duplicate" };
        return prev;
      }
      const displayName = [client.prenom, client.name].filter(Boolean).join(" ").trim() || client.name;
      const prospect: CrmProspect = {
        id: client.id,
        clientId: client.id,
        name: displayName,
        email: client.email,
        phone: client.phone,
        company: client.localite || undefined,
        notes: client.notes,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      return prev.map((col) =>
        col.id === "all" ? { ...col, items: [...col.items, prospect] } : col,
      );
    });
    return out;
  }, []);

  return {
    userId,
    storageReady,
    columns,
    setColumns,
    pendingSendContext,
    setPendingSendContext,
    addProspectFromClient,
  };
}
