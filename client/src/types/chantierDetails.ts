export type ChantierStatut = "en_attente" | "en_cours" | "termine" | "arrete";

export type TypeTravaux = "gros_oeuvre" | "second_oeuvre" | "finitions" | "renovation" | "autre";

export type MeteoCondition = "beau" | "nuageux" | "pluie" | "neige" | "vent_fort";

export type NiveauVigilance = "info" | "attention" | "urgent";

export type StatutLivraison = "en_attente" | "commande" | "livre";

export interface ChantierHeader {
  id: string;
  nom: string;
  reference: string;
  statut: ChantierStatut;
  archived?: boolean;
}

export interface Jalon {
  id: string;
  nom: string;
  date: string;
}

export interface LigneFinanciere {
  montantDevisHT: number;
  tvaPercent: number;
  montantTTC: number;
  montantFacture: number;
  acomptesRecus: number;
  resteAFacturer: number;
  avancementFinancierPercent: number;
  /** Devis source du montant HT (lien optionnel vers la fiche Devis). */
  devisId?: string;
  /** Numéro de devis (sérialisé en base, garde la rétro-compatibilité string[]). */
  devisNumero?: string;
  /** Facture source du montant facturé (lien optionnel vers la fiche Facture). */
  factureId?: string;
  /** Numéro de facture (sérialisé en base, garde la rétro-compatibilité string[]). */
  factureNumero?: string;
}

export interface DocumentLie {
  id: string;
  nom: string;
  type: "devis" | "facture" | "plan" | "pv_reception" | "bon_commande" | "autre";
  date: string;
  statut?: string;
  lien?: string;
}

export interface SousTraitant {
  id: string;
  nom: string;
  metier: string;
  tel: string;
}

export interface Fournisseur {
  id: string;
  nom: string;
  contact: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  texte: string;
  auteur: string;
  meteo?: MeteoCondition;
}

export interface Materiau {
  id: string;
  nom: string;
  qtePrevue: number;
  qteCommandee: number;
  qteLivree: number;
  fournisseur: string;
  statut: StatutLivraison;
}

export interface PointVigilance {
  id: string;
  texte: string;
  niveau: NiveauVigilance;
}

export interface ChantierDetails extends ChantierHeader {
  // Section 2 — Informations générales
  clientId?: string;
  clientNom?: string;
  adresseChantier?: string;
  typeTravaux?: TypeTravaux;
  descriptionCourte?: string;

  // Section 3 — Dates & planning
  dateDebutPrevue?: string;
  dateDebutReelle?: string;
  dateFinPrevue?: string;
  dateFinReelle?: string;
  dureeJoursCalendaires?: number;
  jalons?: Jalon[];

  // Section 4 — Financier
  financier?: LigneFinanciere;

  // Section 5 — Documents liés
  devisAssocies?: DocumentLie[];
  facturesAssociees?: DocumentLie[];
  documentsUploades?: DocumentLie[];

  // Section 6 — Équipe & intervenants
  chefChantierId?: string;
  chefChantierNom?: string;
  ouvriersAssignes?: string[];
  sousTraitants?: SousTraitant[];
  fournisseursPrincipaux?: Fournisseur[];

  // Section 7 — Suivi / Journal
  journalEntries?: JournalEntry[];
  incidentsProblemes?: string;

  // Section 8 — Matériaux
  materiaux?: Materiau[];

  // Section 9 — Notes & observations
  notesInternes?: string;
  remarquesClient?: string;
  pointsVigilance?: PointVigilance[];
}

