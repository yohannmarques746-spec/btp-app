import { createContext, useContext, useState, ReactNode } from 'react';

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
  statut: 'planifié' | 'en cours' | 'terminé';
}

interface ChantiersContextType {
  clients: Client[];
  chantiers: Chantier[];
  addClient: (client: Client) => void;
  addChantier: (chantier: Chantier) => void;
  updateChantier: (id: string, updates: Partial<Chantier>) => void;
}

const ChantiersContext = createContext<ChantiersContextType | undefined>(undefined);

export function ChantiersProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([
    { id: '1', name: 'Jean Dupont', email: 'jean.dupont@email.com', phone: '06 12 34 56 78' },
    { id: '2', name: 'Marie Martin', email: 'marie.martin@email.com', phone: '06 98 76 54 32' }
  ]);
  const [chantiers, setChantiers] = useState<Chantier[]>([]);

  const addClient = (client: Client) => {
    setClients(prev => [...prev, client]);
  };

  const addChantier = (chantier: Chantier) => {
    setChantiers(prev => [...prev, chantier]);
  };

  const updateChantier = (id: string, updates: Partial<Chantier>) => {
    setChantiers(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  return (
    <ChantiersContext.Provider value={{ clients, chantiers, addClient, addChantier, updateChantier }}>
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

