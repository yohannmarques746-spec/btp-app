import type { Chantier, Client } from "@/context/ChantiersContext";
import type {
  ChantierDetails,
  ChantierStatut,
  DocumentLie,
  JournalEntry,
  Materiau,
  MeteoCondition,
  StatutLivraison,
} from "@/types/chantierDetails";

const METEO_VALUES: MeteoCondition[] = ["beau", "nuageux", "pluie", "neige", "vent_fort"];

function mapLegacyStatus(statut: Chantier["statut"]): ChantierStatut {
  if (statut === "en cours") return "en_cours";
  if (statut === "terminé") return "termine";
  if (statut === "archivé") return "arrete";
  return "en_attente";
}

function normalizeMeteo(raw: string | undefined): MeteoCondition | undefined {
  if (!raw) return undefined;
  const lower = raw.toLowerCase().trim();
  return METEO_VALUES.includes(lower as MeteoCondition) ? (lower as MeteoCondition) : "beau";
}

function docTypeFromCategorie(categorie: string): DocumentLie["type"] {
  const c = categorie.toLowerCase().trim();
  if (c === "devis" || c === "facture" || c === "plan" || c === "pv_reception" || c === "bon_commande" || c === "autre") {
    return c;
  }
  return "autre";
}

function materiauStatut(m: { qte_prevue: number; qte_commandee: number; qte_livree: number }): StatutLivraison {
  if (m.qte_prevue > 0 && m.qte_livree >= m.qte_prevue) return "livre";
  if (m.qte_commandee > 0 || m.qte_livree > 0) return "commande";
  return "en_attente";
}

function formatClientAddress(client: Client): string {
  const parts = [client.adresse, client.npa, client.localite].filter(Boolean);
  return parts.length ? parts.join(", ") : "";
}

/** Durée en jours calendaires (inclus début et fin), déduite du texte saisi à la création (ex. « 2 semaines », « 30 », « 15 jours »). */
export function parseDureeToInclusiveDays(duree: string): number | null {
  const raw = duree.trim().toLowerCase();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    const n = parseInt(raw, 10);
    return n >= 1 ? n : null;
  }

  const numRx = /(\d+(?:[.,]\d+)?)/;
  const sem = raw.match(/(\d+(?:[.,]\d+)?)\s*(?:semaine|semaines)\b/);
  if (sem) {
    const n = parseFloat(sem[1].replace(",", "."));
    return Number.isFinite(n) && n > 0 ? Math.max(1, Math.round(n * 7)) : null;
  }

  const mois = raw.match(/(\d+(?:[.,]\d+)?)\s*(?:mois)\b/);
  if (mois) {
    const n = parseFloat(mois[1].replace(",", "."));
    return Number.isFinite(n) && n > 0 ? Math.max(1, Math.round(n * 30)) : null;
  }

  const jours = raw.match(/(\d+(?:[.,]\d+)?)\s*(?:jour|jours)\b/);
  if (jours) {
    const n = parseFloat(jours[1].replace(",", "."));
    return Number.isFinite(n) && n > 0 ? Math.max(1, Math.round(n)) : null;
  }

  const jCourt = raw.match(/(\d+(?:[.,]\d+)?)\s+j\b/);
  if (jCourt) {
    const n = parseFloat(jCourt[1].replace(",", "."));
    return Number.isFinite(n) && n > 0 ? Math.max(1, Math.round(n)) : null;
  }

  const fallback = raw.match(numRx);
  if (fallback) {
    const n = parseFloat(fallback[1].replace(",", "."));
    return Number.isFinite(n) && n > 0 ? Math.max(1, Math.round(n)) : null;
  }

  return null;
}

/** Fin prévue (YYYY-MM-DD) : même convention que durationFromDates sur la fiche (N jours calendaires inclusifs). */
export function dateFinPrevueFromDebutEtDuree(dateDebutIso: string, dureeText: string): string {
  const days = parseDureeToInclusiveDays(dureeText);
  if (!days || !dateDebutIso.trim()) return "";

  const start = new Date(`${dateDebutIso.trim()}T12:00:00`);
  if (Number.isNaN(start.getTime())) return "";

  const end = new Date(start);
  end.setDate(end.getDate() + days - 1);
  return end.toISOString().slice(0, 10);
}

/** Coquille minimale si le chantier n'est pas encore dans la liste. */
export function emptyChantierDetailsShell(id: string): ChantierDetails {
  return {
    id,
    nom: "",
    reference: "",
    statut: "en_attente",
    archived: false,
    clientId: "",
    clientNom: "",
    adresseChantier: "",
    typeTravaux: "autre",
    descriptionCourte: "",
    dateDebutPrevue: "",
    dateDebutReelle: "",
    dateFinPrevue: "",
    dateFinReelle: "",
    dureeJoursCalendaires: undefined,
    jalons: [],
    devisAssocies: [],
    facturesAssociees: [],
    documentsUploades: [],
    chefChantierId: undefined,
    chefChantierNom: "",
    ouvriersAssignes: [],
    sousTraitants: [],
    fournisseursPrincipaux: [],
    journalEntries: [],
    incidentsProblemes: "",
    materiaux: [],
    notesInternes: "",
    remarquesClient: "",
    pointsVigilance: [],
  };
}

/** Met à jour nom / adresse client sans écraser le reste de la fiche (ex. clients chargés après les chantiers). */
export function mergeClientFieldsIntoDetails(
  base: ChantierDetails,
  record: Chantier,
  clients: Client[],
): ChantierDetails {
  const crm = clients.find((c) => c.id === record.clientId);
  const clientNom = crm?.name ?? record.clientName ?? "";
  const adresseChantier = crm ? formatClientAddress(crm) : "";
  if (
    base.clientId === record.clientId &&
    base.clientNom === clientNom &&
    base.adresseChantier === adresseChantier
  ) {
    return base;
  }
  return {
    ...base,
    clientId: record.clientId,
    clientNom,
    adresseChantier,
  };
}

export function buildChantierDetails(record: Chantier, clients: Client[]): ChantierDetails {
  const crm = clients.find((c) => c.id === record.clientId);
  const clientNom = crm?.name ?? record.clientName ?? "";
  const adresseChantier = crm ? formatClientAddress(crm) : "";

  const journalEntries: JournalEntry[] = (record.journalEntries ?? []).map((e) => ({
    id: e.id,
    date: e.date,
    texte: e.texte,
    auteur: e.auteur,
    meteo: normalizeMeteo(e.meteo),
  }));

  const materiaux: Materiau[] = (record.materiaux ?? []).map((m) => ({
    id: m.id,
    nom: m.nom,
    qtePrevue: m.qte_prevue,
    qteCommandee: m.qte_commandee,
    qteLivree: m.qte_livree,
    fournisseur: m.fournisseur,
    statut: materiauStatut(m),
  }));

  const devisAssocies: DocumentLie[] = (record.devisAssocies ?? []).map((nom, i) => ({
    id: `devis-${record.id}-${i}`,
    nom,
    type: "devis" as const,
    date: "",
  }));

  const facturesAssociees: DocumentLie[] = (record.facturesAssociees ?? []).map((nom, i) => ({
    id: `facture-${record.id}-${i}`,
    nom,
    type: "facture" as const,
    date: "",
  }));

  const documentsUploades: DocumentLie[] = (record.documentsUploades ?? []).map((d) => ({
    id: d.id,
    nom: d.nom,
    type: docTypeFromCategorie(d.categorie),
    date: "",
    lien: d.url,
  }));

  const dateDebutPrevue = record.dateDebut || "";
  const dateFinPrevue = dateFinPrevueFromDebutEtDuree(dateDebutPrevue, record.duree ?? "");
  const inclusiveDays =
    dateDebutPrevue && dateFinPrevue
      ? Math.max(
          1,
          Math.floor(
            (new Date(`${dateFinPrevue}T12:00:00`).getTime() - new Date(`${dateDebutPrevue}T12:00:00`).getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1,
        )
      : undefined;

  return {
    id: record.id,
    nom: record.nom,
    reference: "",
    statut: mapLegacyStatus(record.statut),
    archived: Boolean(record.archived),
    clientId: record.clientId,
    clientNom,
    adresseChantier,
    typeTravaux: "autre",
    descriptionCourte: "",
    dateDebutPrevue,
    dateDebutReelle: "",
    dateFinPrevue,
    dateFinReelle: "",
    dureeJoursCalendaires: inclusiveDays,
    jalons: [],
    devisAssocies,
    facturesAssociees,
    documentsUploades,
    chefChantierId: undefined,
    chefChantierNom: "",
    ouvriersAssignes: [],
    sousTraitants: [],
    fournisseursPrincipaux: [],
    journalEntries,
    incidentsProblemes: record.incidentsProblemes ?? "",
    materiaux,
    notesInternes: "",
    remarquesClient: "",
    pointsVigilance: [],
  };
}
