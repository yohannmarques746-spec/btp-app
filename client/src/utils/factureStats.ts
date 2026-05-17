import type { FactureRecord, FactureStatus } from "@/hooks/useFactures";

export interface FactureDashboardStats {
  total: number;
  payee: number;
  enAttente: number;
  enRetard: number;
  impayeTotal: number;
  countImpaye: number;
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

/** Applique le statut « en_retard » si échéance dépassée (aligné PaymentsPage). */
export function applyAutoRetardStatut(
  factures: FactureRecord[],
  today: string = todayISO()
): FactureRecord[] {
  return factures.map((f) => {
    if (f.statut === "payee") return f;
    if (f.dateEcheance && f.dateEcheance < today) {
      return { ...f, statut: "en_retard" as FactureStatus };
    }
    return f;
  });
}

export function computeFactureDashboardStats(factures: FactureRecord[]): FactureDashboardStats {
  const withStatus = applyAutoRetardStatut(factures);

  const total = withStatus.reduce((sum, f) => sum + f.montantTTC, 0);
  const payee = withStatus
    .filter((f) => f.statut === "payee")
    .reduce((sum, f) => sum + f.montantTTC, 0);
  const enAttente = withStatus
    .filter((f) => f.statut === "non_payee")
    .reduce((sum, f) => sum + f.montantTTC, 0);
  const enRetard = withStatus
    .filter((f) => f.statut === "en_retard")
    .reduce((sum, f) => sum + f.montantTTC, 0);
  const impayeFactures = withStatus.filter((f) => f.statut !== "payee");
  const impayeTotal = impayeFactures.reduce((sum, f) => sum + f.montantTTC, 0);

  return {
    total,
    payee,
    enAttente,
    enRetard,
    impayeTotal,
    countImpaye: impayeFactures.length,
  };
}
