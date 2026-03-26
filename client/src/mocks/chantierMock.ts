import type { ChantierDetails } from "@/types/chantierDetails";

export const chantierDetailsMock: ChantierDetails = {
  id: "chantier-mock-001",
  nom: "Rénovation villa Chemin des Acacias",
  reference: "CH-2026-014",
  statut: "en_cours",
  archived: false,

  clientId: "client-001",
  clientNom: "M. Dubois Laurent",
  adresseChantier: "Chemin des Acacias 12, 1009 Pully",
  typeTravaux: "renovation",
  descriptionCourte: "Rénovation complète intérieure avec reprise des réseaux techniques.",

  dateDebutPrevue: "2026-03-10",
  dateDebutReelle: "2026-03-14",
  dateFinPrevue: "2026-07-02",
  dateFinReelle: "",
  dureeJoursCalendaires: 111,
  jalons: [
    { id: "jalon-1", nom: "Démolition terminée", date: "2026-03-28" },
    { id: "jalon-2", nom: "Électricité 1er passage", date: "2026-04-21" },
    { id: "jalon-3", nom: "Pose cuisine", date: "2026-06-08" },
  ],

  financier: {
    montantDevisHT: 184500,
    tvaPercent: 8.1,
    montantTTC: 199444.5,
    montantFacture: 121000,
    acomptesRecus: 85000,
    resteAFacturer: 78444.5,
    avancementFinancierPercent: 60.7,
  },

  devisAssocies: [
    { id: "devis-001", nom: "DEV-2026-014", type: "devis", date: "2026-03-01", statut: "accepté", lien: "/dashboard/quotes" },
  ],
  facturesAssociees: [
    { id: "fac-001", nom: "FAC-2026-041", type: "facture", date: "2026-04-03", statut: "payée", lien: "/dashboard/payments" },
    { id: "fac-002", nom: "FAC-2026-059", type: "facture", date: "2026-05-11", statut: "en attente", lien: "/dashboard/payments" },
  ],
  documentsUploades: [
    { id: "doc-001", nom: "Plan architecte V3.pdf", type: "plan", date: "2026-02-22" },
    { id: "doc-002", nom: "Bon commande menuiserie.pdf", type: "bon_commande", date: "2026-04-29" },
  ],

  chefChantierId: "chef-007",
  chefChantierNom: "Yann Marchand",
  ouvriersAssignes: ["ouvrier-11", "ouvrier-18", "ouvrier-24"],
  sousTraitants: [
    { id: "st-1", nom: "ElecPro SA", metier: "Electricite", tel: "+41 21 555 41 10" },
    { id: "st-2", nom: "HydroLac Sarl", metier: "Sanitaire", tel: "+41 21 555 38 22" },
  ],
  fournisseursPrincipaux: [
    { id: "f-1", nom: "Matériaux Romands", contact: "A. Gauthier — +41 21 555 92 00" },
    { id: "f-2", nom: "Carrelages Léman", contact: "S. Renaud — +41 21 555 77 41" },
  ],

  journalEntries: [
    {
      id: "log-1",
      date: "2026-05-14",
      auteur: "Yann Marchand",
      texte: "Validation client sur teinte façade, planning maintenu.",
      meteo: "beau",
    },
    {
      id: "log-2",
      date: "2026-05-16",
      auteur: "T. Morel",
      texte: "Retard fournisseur sur portes intérieures (+3 jours).",
      meteo: "pluie",
    },
  ],
  incidentsProblemes: "Retard logistique ponctuel sur les portes interieures.",

  materiaux: [
    { id: "mat-1", nom: "Placoplatre hydrofuge", qtePrevue: 180, qteCommandee: 180, qteLivree: 180, fournisseur: "Materiaux Romands", statut: "livre" },
    { id: "mat-2", nom: "Carrelage gres 60x60", qtePrevue: 145, qteCommandee: 145, qteLivree: 92, fournisseur: "Carrelages Leman", statut: "commande" },
    { id: "mat-3", nom: "Isolant laine roche", qtePrevue: 220, qteCommandee: 0, qteLivree: 0, fournisseur: "Materiaux Romands", statut: "en_attente" },
  ],

  notesInternes: "Coordonner réception menuiseries avec contrôle qualité site.",
  remarquesClient: "Souhaite limiter les interventions bruyantes après 17h.",
  pointsVigilance: [
    { id: "pv-1", texte: "Contrôle humidité avant pose parquet", niveau: "attention" },
    { id: "pv-2", texte: "Validation finale conformité électrique OIBT", niveau: "urgent" },
  ],
};

