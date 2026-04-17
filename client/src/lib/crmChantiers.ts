import type { Chantier } from "@/context/ChantiersContext";
import type { CrmProspect } from "@/types/crm";
import type { Devis } from "@/types/devis";

/** Même prédicat que le compteur chantiers actifs du Dashboard (OverviewTab). */
export function isChantierActif(ch: Chantier): boolean {
  return ch.statut !== "terminé" && !ch.archived;
}

export function getActiveChantiersForClient(
  chantiers: Chantier[],
  clientId: string | undefined,
): Chantier[] {
  if (!clientId) return [];
  return chantiers.filter((ch) => ch.clientId === clientId && isChantierActif(ch));
}

/** Extrait des ids de devis depuis devisAssocies (jsonb tableau ou legacy). */
export function normalizeDevisAssociesIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === "string") out.push(item);
    else if (item != null && typeof item === "object" && "id" in item && typeof (item as { id: unknown }).id === "string") {
      out.push((item as { id: string }).id);
    }
  }
  return out;
}

function normalizeMatch(value?: string): string {
  return (value || "").trim().toLowerCase();
}

function normalizePhoneMatch(value?: string): string {
  return (value || "").replace(/\D/g, "");
}

/** Devis liés au client CRM : `client_id` prioritaire, sinon matching sur le bloc JSON client (legacy). */
export function devisListForCrmClient(
  devisList: Devis[],
  clientId: string | undefined,
  prospect: Pick<CrmProspect, "name" | "email" | "phone">,
): Devis[] {
  if (!clientId) return [];
  const byId = devisList.filter((d) => d.clientId === clientId);
  if (byId.length > 0) return byId;
  return devisList.filter((d) => {
    const c = d.client;
    const sameName = normalizeMatch(c.nom) === normalizeMatch(prospect.name);
    const sameEmail =
      normalizeMatch(prospect.email).length > 0 && normalizeMatch(c.email) === normalizeMatch(prospect.email);
    const samePhone =
      normalizePhoneMatch(prospect.phone).length > 0 &&
      normalizePhoneMatch(c.telephone) === normalizePhoneMatch(prospect.phone);
    return sameName || sameEmail || samePhone;
  });
}

export function sortDevisLinkedFirst(devis: Devis[], linkedIds: ReadonlySet<string>): Devis[] {
  return [...devis].sort((a, b) => {
    const aL = linkedIds.has(a.id) ? 0 : 1;
    const bL = linkedIds.has(b.id) ? 0 : 1;
    if (aL !== bL) return aL - bL;
    return b.dateEmission.localeCompare(a.dateEmission);
  });
}
