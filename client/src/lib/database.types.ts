export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      admin_codes: {
        Row: {
          id: string;
          code: string;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["admin_codes"]["Row"]> & { code: string };
        Update: Partial<Database["public"]["Tables"]["admin_codes"]["Row"]>;
      };
      profil_entreprise: {
        Row: {
          id: string;
          user_id: string;
          created_at: string | null;
          nom: string | null;
          adresse: string | null;
          npa: string | null;
          localite: string | null;
          pays: string | null;
          telephone: string | null;
          email: string | null;
          site_web: string | null;
          numero_ide: string | null;
          numero_tva: string | null;
          iban: string | null;
          logo_url: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["profil_entreprise"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["profil_entreprise"]["Row"]>;
      };
      clients: {
        Row: {
          id: string;
          user_id: string;
          created_at: string | null;
          nom: string;
          prenom: string | null;
          email: string | null;
          telephone: string | null;
          adresse: string | null;
          npa: string | null;
          localite: string | null;
          pays: string | null;
          notes: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["clients"]["Row"]> & { nom: string };
        Update: Partial<Database["public"]["Tables"]["clients"]["Row"]>;
      };
      chantiers: {
        Row: {
          id: string;
          user_id: string;
          created_at: string | null;
          nom: string;
          client_id: string | null;
          adresse: string | null;
          npa: string | null;
          localite: string | null;
          latitude: number | null;
          longitude: number | null;
          date_debut: string | null;
          date_fin_prevue: string | null;
          statut: string | null;
          description: string | null;
          budget: number | null;
          notes: string | null;
          duree: string | null;
          images: Json | null;
          journal_entries: Json | null;
          incidents_problemes: Json | null;
          materiaux: Json | null;
          documents_uploades: Json | null;
          devis_associes: Json | null;
          factures_associees: Json | null;
          archived: boolean | null;
        };
        Insert: Partial<Database["public"]["Tables"]["chantiers"]["Row"]> & { nom: string };
        Update: Partial<Database["public"]["Tables"]["chantiers"]["Row"]>;
      };
      devis: {
        Row: {
          id: string;
          user_id: string;
          created_at: string | null;
          numero: string;
          client_id: string | null;
          date_emission: string | null;
          date_validite: string | null;
          statut: string | null;
          lignes: Json | null;
          tva_taux: number | null;
          montant_ht: number | null;
          montant_tva: number | null;
          montant_ttc: number | null;
          conditions: string | null;
          notes_internes: string | null;
          signature_client: string | null;
          objet: string | null;
          delai_execution: string | null;
          devis_payant: boolean | null;
          montant_devis: number | null;
          emetteur: Json | null;
          client: Json | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["devis"]["Row"]> & { numero: string };
        Update: Partial<Database["public"]["Tables"]["devis"]["Row"]>;
      };
      factures: {
        Row: {
          id: string;
          user_id: string;
          created_at: string | null;
          numero: string;
          devis_id: string | null;
          client_id: string | null;
          date_emission: string | null;
          date_echeance: string | null;
          statut: string | null;
          lignes: Json | null;
          tva_taux: number | null;
          montant_ht: number | null;
          montant_tva: number | null;
          montant_ttc: number | null;
          notes: string | null;
          updated_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["factures"]["Row"]> & { numero: string };
        Update: Partial<Database["public"]["Tables"]["factures"]["Row"]>;
      };
    };
  };
};

