import { useCallback, useEffect, useState } from "react";
import type { TauxTVA } from "@/types/devis";
import type { UnitePrestationCode } from "@/constants/unitesPrestation";

export interface PrestationCatalogue {
  id: string;
  description: string;
  unite: UnitePrestationCode;
  prixUnitaireHT: number;
  tauxTVA: TauxTVA;
}

const STORAGE_KEY = "app_catalogue_prestations";
const LEGACY_STORAGE_KEY = "caldy_catalogue_prestations";

function loadFromStorage(): PrestationCatalogue[] {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY) ?? globalThis.localStorage?.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    if (!globalThis.localStorage?.getItem(STORAGE_KEY)) {
      globalThis.localStorage?.setItem(STORAGE_KEY, raw);
      globalThis.localStorage?.removeItem(LEGACY_STORAGE_KEY);
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: PrestationCatalogue[]) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // silently fail
  }
}

export function useCataloguePrestations() {
  const [catalogue, setCatalogue] = useState<PrestationCatalogue[]>(loadFromStorage);

  useEffect(() => {
    saveToStorage(catalogue);
  }, [catalogue]);

  const addPrestation = useCallback((item: Omit<PrestationCatalogue, "id">) => {
    const newItem: PrestationCatalogue = { ...item, id: crypto.randomUUID() };
    setCatalogue((prev) => [...prev, newItem]);
    return newItem;
  }, []);

  const removePrestation = useCallback((id: string) => {
    setCatalogue((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const updatePrestation = useCallback((id: string, updates: Partial<Omit<PrestationCatalogue, "id">>) => {
    setCatalogue((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  return { catalogue, addPrestation, removePrestation, updatePrestation };
}
