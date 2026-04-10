import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getCurrentUserId } from './useChantiers';
import type { EntrepriseProfil, EntrepriseProfilUpdate } from '@/types/entrepriseProfil';

export function useEntrepriseProfil() {
  const [profil, setProfil] = useState<EntrepriseProfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfil = useCallback(async () => {
    setLoading(true);
    setError(null);
    const userId = await getCurrentUserId();
    if (!userId) {
      setProfil(null);
      setLoading(false);
      return;
    }
    const { data, error: err } = await supabase
      .from('entreprise_profil')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (err) setError(err.message);
    else setProfil((data as EntrepriseProfil | null) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchProfil();
  }, [fetchProfil]);

  const saveProfil = useCallback(
    async (values: EntrepriseProfilUpdate) => {
      setSaving(true);
      setError(null);
      const userId = await getCurrentUserId();
      if (!userId) {
        setSaving(false);
        throw new Error('Utilisateur non authentifié');
      }
      const { error: err } = await supabase.from('entreprise_profil').upsert(
        {
          ...values,
          user_id: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
      if (err) {
        setError(err.message);
        setSaving(false);
        throw new Error(err.message);
      }
      await fetchProfil();
      setSaving(false);
    },
    [fetchProfil],
  );

  return { profil, loading, saving, error, saveProfil };
}
