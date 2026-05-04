import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { isOwner, OWNERS_LIST } from '@/lib/ownerUtils';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  const userId = user?.id ?? null;
  const isMainOwner = userId ? isOwner(userId) : false;
  const firstOwnerId = OWNERS_LIST[0];

  useEffect(() => {
    // Réinitialiser à chaque changement d'utilisateur
    setAuthorized(null);

    if (loading) return;

    if (!userId) {
      setLocation('/login');
      return;
    }

    // L'utilisateur est propriétaire → accès complet
    if (isMainOwner) {
      setAuthorized(true);
      return;
    }

    if (!firstOwnerId) {
      signOut().then(() => setLocation('/login'));
      return;
    }

    // Vérifier si l'utilisateur est co-patron du propriétaire principal
    supabase
      .rpc('is_co_owner', { p_owner_id: firstOwnerId, p_user_id: userId })
      .then(({ data, error }) => {
        if (error || !data) {
          // Utilisateur authentifié mais pas autorisé
          signOut().then(() => setLocation('/login'));
        } else {
          setAuthorized(true);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, userId, isMainOwner, firstOwnerId]);

  // Pendant le chargement initial ou la vérification co-patron
  if (loading || (userId && authorized === null)) return null;

  if (!user || !authorized) return null;

  return <>{children}</>;
}
