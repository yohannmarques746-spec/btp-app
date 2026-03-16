export type TauxTVA = 0 | 2.6 | 3.8 | 8.1;

export type UnitePrestation = "heure" | "jour" | "forfait" | "piece" | "autre";

export type StatutDevis = "brouillon" | "envoye" | "accepte" | "refuse" | "expire";

export interface Emetteur {
  nom: string;
  adresse: string;
  npa: string;
  ville: string;
  ide: string;
  email: string;
  telephone: string;
  logo?: string;
  iban?: string;
  nonAssujettiTVA?: boolean;
}

export interface Client {
  nom: string;
  adresse: string;
  npa: string;
  ville: string;
  email?: string;
  telephone?: string;
  contact?: string;
}

export interface LignePrestation {
  id: string;
  description: string;
  quantite: number;
  unite: UnitePrestation;
  prixUnitaireHT: number;
  tauxTVA: TauxTVA;
  totalHT: number;
}

export interface Devis {
  id: string;
  numero: string;
  dateEmission: string;
  dureeValidite: number;
  dateExpiration: string;
  objet: string;
  emetteur: Emetteur;
  client: Client;
  lignes: LignePrestation[];
  sousTotalHT: number;
  montantTVA: number;
  totalTTC: number;
  conditionsPaiement: string;
  delaiExecution?: string;
  notes?: string;
  devisPayant: boolean;
  montantDevis?: number;
  statut: StatutDevis;
  createdAt: string;
  updatedAt: string;
}

export interface TVAParTaux {
  taux: TauxTVA;
  baseHT: number;
  montantTVA: number;
}

export const TVA_OPTIONS: TauxTVA[] = [0, 2.6, 3.8, 8.1];

export const UNITE_OPTIONS: UnitePrestation[] = ["heure", "jour", "forfait", "piece", "autre"];

export const DEVIS_STATUS_OPTIONS: StatutDevis[] = ["brouillon", "envoye", "accepte", "refuse", "expire"];
