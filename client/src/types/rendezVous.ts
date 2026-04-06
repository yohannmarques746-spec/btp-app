export type RdvStatut = 'planifié' | 'confirmé' | 'annulé' | 'terminé';

export interface RendezVous {
  id: string;
  user_id: string;
  chantier_id: string | null;
  titre: string;
  date: string;           // format YYYY-MM-DD (date locale, jamais UTC)
  heure_debut: string;    // format HH:mm
  heure_fin: string | null;
  description: string | null;
  statut: RdvStatut;
  created_at: string;
}

export type RendezVousInsert = Omit<RendezVous, 'id' | 'user_id' | 'created_at'>;
export type RendezVousUpdate = Partial<RendezVousInsert> & { id: string };
