import { createContext, useContext, ReactNode } from 'react';
import { useClients } from '@/hooks/useClients';
import { useChantiers as useSupabaseChantiers } from '@/hooks/useChantiers';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface Chantier {
  id: string;
  nom: string;
  clientId: string;
  clientName: string;
  dateDebut: string;
  duree: string;
  images: string[];
  statut: 'planifié' | 'en cours' | 'terminé' | 'archivé';
  archived?: boolean;
  journalEntries?: { id: string; date: string; auteur: string; texte: string; meteo: string }[];
  incidentsProblemes?: string;
  materiaux?: { id: string; nom: string; qte_prevue: number; qte_commandee: number; qte_livree: number; fournisseur: string }[];
  documentsUploades?: { id: string; nom: string; categorie: string; url: string }[];
  devisAssocies?: string[];
  facturesAssociees?: string[];
}

interface ChantiersContextType {
  clients: Client[];
  chantiers: Chantier[];
  loading: boolean;
  addClient: (client: Client) => Promise<{ error: Error | null }>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<{ error: Error | null }>;
  addChantier: (chantier: Chantier) => Promise<{ error: Error | null }>;
  updateChantier: (id: string, updates: Partial<Chantier>) => Promise<{ error: Error | null }>;
  deleteChantier: (id: string) => Promise<{ error: Error | null }>;
}

const ChantiersContext = createContext<ChantiersContextType | undefined>(undefined);

export function ChantiersProvider({ children }: { children: ReactNode }) {
  const clientsHook = useClients();
  const chantiersHook = useSupabaseChantiers();

  const addClient = async (client: Client) => {
    const { error } = await clientsHook.saveClient({
      name: client.name,
      email: client.email,
      phone: client.phone,
    });
    return { error: error as Error | null };
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    const current = clientsHook.clients.find((c) => c.id === id);
    if (!current) return { error: new Error("Client introuvable") };
    const { error } = await clientsHook.saveClient({
      name: updates.name ?? current.name,
      email: updates.email ?? current.email,
      phone: updates.phone ?? current.phone,
    }, id);
    return { error: error as Error | null };
  };

  const addChantier = async (chantier: Chantier) => {
    const { error } = await chantiersHook.saveChantier({
      nom: chantier.nom,
      clientId: chantier.clientId,
      dateDebut: chantier.dateDebut,
      duree: chantier.duree,
      images: chantier.images,
      statut: chantier.statut,
      archived: chantier.archived ?? false,
      journalEntries: chantier.journalEntries ?? [],
      incidentsProblemes: chantier.incidentsProblemes ?? "",
      materiaux: chantier.materiaux ?? [],
      documentsUploades: chantier.documentsUploades ?? [],
      devisAssocies: chantier.devisAssocies ?? [],
      facturesAssociees: chantier.facturesAssociees ?? [],
    });
    return { error: error as Error | null };
  };

  const updateChantier = async (id: string, updates: Partial<Chantier>) => {
    const { error } = await chantiersHook.updateChantier(id, updates);
    return { error: error as Error | null };
  };

  const deleteChantier = async (id: string) => {
    const { error } = await chantiersHook.deleteChantier(id);
    return { error: error as Error | null };
  };

  return (
    <ChantiersContext.Provider
      value={{
        clients: clientsHook.clients,
        chantiers: chantiersHook.chantiers,
        loading: clientsHook.loading || chantiersHook.loading,
        addClient,
        updateClient,
        addChantier,
        updateChantier,
        deleteChantier,
      }}
    >
      {children}
    </ChantiersContext.Provider>
  );
}

export function useChantiers() {
  const context = useContext(ChantiersContext);
  if (context === undefined) {
    throw new Error('useChantiers must be used within a ChantiersProvider');
  }
  return context;
}

