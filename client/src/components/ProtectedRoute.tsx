import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';

const OWNER_ID = import.meta.env.VITE_OWNER_ID as string | undefined;

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const userId = user?.id ?? null;
  const isMainOwner = !OWNER_ID || userId === OWNER_ID;

  useEffect(() => {
    // Réinitialiser à chaque changement d'utilisateur
    setAuthorized(null);

    if (loading) return;

    if (!userId) {
      setLocation('/login');
      return;
    }

    if (isMainOwner) {
      setAuthorized(true);
      return;
    }

    // Vérifier si l'utilisateur est co-patron du propriétaire principal
    supabase
      .rpc('is_co_owner', { p_owner_id: OWNER_ID, p_user_id: userId })
      .then(({ data, error }) => {
        if (error || !data) {
          // Utilisateur authentifié mais pas autorisé
          signOut().then(() => setLocation('/login'));
        } else {
          setAuthorized(true);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, userId, isMainOwner]);

  // Pendant le chargement initial ou la vérification co-patron
  if (loading || (userId && authorized === null)) return null;

  if (!user || !authorized) return null;

  return <>{children}</>;
}
