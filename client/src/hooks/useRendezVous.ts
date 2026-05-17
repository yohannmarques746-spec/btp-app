import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentUserId } from './useChantiers';
import type { RendezVous, RendezVousInsert, RendezVousUpdate } from '@/types/rendezVous';

interface UseRendezVousReturn {
  rendezVous: RendezVous[];
  loading: boolean;
  error: string | null;
  refreshForMonth: (month: Date) => Promise<void>;
  createRendezVous: (data: RendezVousInsert) => Promise<void>;
  updateRendezVous: (data: RendezVousUpdate) => Promise<void>;
  deleteRendezVous: (id: string) => Promise<void>;
}

export function useRendezVous(): UseRendezVousReturn {
  const [rendezVous, setRendezVous] = useState<RendezVous[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Mémorise le dernier mois affiché pour pouvoir le re-fetch sur un event realtime.
  const lastMonthRef = useRef<Date | null>(null);

  // Convention dates : YYYY-MM-DD en locale (jamais toISOString qui décale en UTC)
  const toLocalDateStr = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const refreshForMonth = useCallback(async (month: Date) => {
    lastMonthRef.current = month;
    setLoading(true);
    setError(null);
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const { data, error: err } = await supabase
      .from('rendez_vous')
      .select('*')
      .gte('date', toLocalDateStr(start))
      .lte('date', toLocalDateStr(end))
      .order('date', { ascending: true })
      .order('heure_debut', { ascending: true });
    if (err) setError(err.message);
    else setRendezVous((data as RendezVous[]) ?? []);
    setLoading(false);
  }, []);

  // Realtime : à chaque INSERT/UPDATE/DELETE sur rendez_vous, on re-fetch le mois courant.
  useEffect(() => {
    const channel = supabase
      .channel('rendez_vous-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rendez_vous' }, () => {
        if (lastMonthRef.current) void refreshForMonth(lastMonthRef.current);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshForMonth]);

  const createRendezVous = useCallback(async (data: RendezVousInsert) => {
    const userId = await getCurrentUserId();
    if (!userId) throw new Error('Utilisateur non authentifié');
    const { error: err } = await supabase
      .from('rendez_vous')
      .insert({ ...data, user_id: userId });
    if (err) throw new Error(err.message);
  }, []);

  const updateRendezVous = useCallback(async ({ id, ...data }: RendezVousUpdate) => {
    const { error: err } = await supabase
      .from('rendez_vous')
      .update(data)
      .eq('id', id);
    if (err) throw new Error(err.message);
  }, []);

  const deleteRendezVous = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from('rendez_vous')
      .delete()
      .eq('id', id);
    if (err) throw new Error(err.message);
  }, []);

  return { rendezVous, loading, error, refreshForMonth, createRendezVous, updateRendezVous, deleteRendezVous };
}
