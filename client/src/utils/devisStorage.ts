import type { Devis, Emetteur } from "@/types/devis";
import { buildNumeroDevis, computeDevisStatus } from "@/utils/devisCalculs";

export const STORAGE_KEYS = {
  profil: "devis_profil",
  liste: "devis_liste",
  compteur: "devis_compteur",
} as const;

export const DEFAULT_EMETTEUR: Emetteur = {
  nom: "",
  adresse: "",
  npa: "",
  ville: "",
  ide: "",
  email: "",
  telephone: "",
  iban: "",
  logo: "",
  nonAssujettiTVA: false,
};

function safeJSONParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function loadProfilEmetteur(): Emetteur {
  return safeJSONParse<Emetteur>(localStorage.getItem(STORAGE_KEYS.profil), DEFAULT_EMETTEUR);
}

export function saveProfilEmetteur(profile: Emetteur): void {
  localStorage.setItem(STORAGE_KEYS.profil, JSON.stringify(profile));
}

export function loadDevisList(): Devis[] {
  const raw = safeJSONParse<Devis[]>(localStorage.getItem(STORAGE_KEYS.liste), []);
  const now = new Date();
  const updated = raw.map((d) => {
    const statut = computeDevisStatus(d, now);
    if (statut !== d.statut) {
      return { ...d, statut, updatedAt: new Date().toISOString() };
    }
    return d;
  });
  saveDevisList(updated);
  return updated;
}

export function saveDevisList(list: Devis[]): void {
  localStorage.setItem(STORAGE_KEYS.liste, JSON.stringify(list));
}

export function getNextDevisCounter(): number {
  const current = Number(localStorage.getItem(STORAGE_KEYS.compteur) || "0");
  const next = current + 1;
  localStorage.setItem(STORAGE_KEYS.compteur, String(next));
  return next;
}

export function getNextNumeroDevis(date = new Date()): string {
  const counter = getNextDevisCounter();
  return buildNumeroDevis(counter, date);
}
