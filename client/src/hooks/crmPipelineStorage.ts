import type { CrmColumn } from "@/types/crm";

export function createEmptyCrmColumns(): CrmColumn[] {
  return [
    { id: "all", name: "Tous les prospects", items: [] },
    { id: "quote", name: "Envoi du devis", items: [] },
    { id: "invoice", name: "Envoi de facture", items: [] },
    { id: "followup1", name: "Relance 1", items: [] },
    { id: "followup2", name: "Relance 2", items: [] },
    { id: "followup3", name: "Relance 3", items: [] },
    { id: "followup4", name: "Relance 4", items: [] },
  ];
}
