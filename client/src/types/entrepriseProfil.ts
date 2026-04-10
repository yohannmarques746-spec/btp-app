export interface EntrepriseProfil {
  id: string;
  user_id: string;
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
  numero_ide: string;
  site_web: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export type EntrepriseProfilUpdate = Omit<EntrepriseProfil, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
