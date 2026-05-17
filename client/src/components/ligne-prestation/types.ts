export type LignePrestationFocusField =
  | "description"
  | "quantite"
  | "unite"
  | "prixUnitaireHT"
  | "tauxTVA";

export interface LignePrestationDraft {
  description: string;
  quantite: number;
  unite: string;
  prixUnitaireHT: number;
  tauxTVA: number;
}

export function formatQuantiteDisplay(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return safe.toFixed(2);
}

export function ligneDraftFromFields(fields: {
  description: string;
  quantite: number;
  unite: string;
  prixUnitaireHT: number;
  tauxTVA: number;
}): LignePrestationDraft {
  return {
    description: fields.description,
    quantite: fields.quantite,
    unite: fields.unite,
    prixUnitaireHT: fields.prixUnitaireHT,
    tauxTVA: fields.tauxTVA,
  };
}
