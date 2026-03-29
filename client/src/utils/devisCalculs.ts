import type { Devis, LignePrestation, TVAParTaux, TauxTVA } from "@/types/devis";

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateLigneTotalHT(ligne: Pick<LignePrestation, "quantite" | "prixUnitaireHT">): number {
  const q = Number(ligne.quantite);
  const p = Number(ligne.prixUnitaireHT);
  if (!Number.isFinite(q) || !Number.isFinite(p)) return 0;
  return Number((q * p).toFixed(2));
}

/** Totaux cohérents avec l’affichage « Qté × PU HT » (ignore totalHT stocké si obsolète). */
export function lignesAvecTotalHTCalcule(lignes: LignePrestation[]): LignePrestation[] {
  return lignes.map((l) => ({
    ...l,
    totalHT: calculateLigneTotalHT(l),
  }));
}

export function calculateDateExpiration(dateEmission: string, dureeValidite: number): string {
  const base = new Date(dateEmission);
  if (Number.isNaN(base.getTime())) return dateEmission;
  base.setDate(base.getDate() + dureeValidite);
  return toISODate(base);
}

export function calculateTVAParTaux(lignes: LignePrestation[]): TVAParTaux[] {
  const grouped = new Map<TauxTVA, number>();

  for (const ligne of lignes) {
    const prev = grouped.get(ligne.tauxTVA) ?? 0;
    grouped.set(ligne.tauxTVA, prev + ligne.totalHT);
  }

  return Array.from(grouped.entries())
    .map(([taux, baseHT]) => ({
      taux,
      baseHT: Number(baseHT.toFixed(2)),
      montantTVA: Number(((baseHT * taux) / 100).toFixed(2)),
    }))
    .sort((a, b) => a.taux - b.taux);
}

export function calculateTotaux(lignes: LignePrestation[]): {
  sousTotalHT: number;
  montantTVA: number;
  totalTTC: number;
  tvaParTaux: TVAParTaux[];
} {
  const sousTotalHT = Number(lignes.reduce((acc, ligne) => acc + ligne.totalHT, 0).toFixed(2));
  const tvaParTaux = calculateTVAParTaux(lignes);
  const montantTVA = Number(tvaParTaux.reduce((acc, t) => acc + t.montantTVA, 0).toFixed(2));
  const totalTTC = Number((sousTotalHT + montantTVA).toFixed(2));

  return { sousTotalHT, montantTVA, totalTTC, tvaParTaux };
}

export function computeDevisStatus(devis: Devis, now = new Date()): Devis["statut"] {
  if (devis.statut === "accepte" || devis.statut === "refuse") return devis.statut;

  const expiration = new Date(devis.dateExpiration);
  if (!Number.isNaN(expiration.getTime()) && expiration < now) {
    return "expire";
  }

  return devis.statut;
}

export function buildNumeroDevis(counter: number, date = new Date()): string {
  const year = date.getFullYear();
  return `DEV-${year}-${String(counter).padStart(3, "0")}`;
}
