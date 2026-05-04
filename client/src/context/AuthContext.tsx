import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { isOwner, OWNERS_LIST } from '@/lib/ownerUtils';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | Error | null }>;
  signIn: (email: string, password: string) => Promise<{ data: { user: User | null } | null; error: AuthError | Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Prevent onAuthStateChange from overwriting state while signIn() is mid-flight
  const suppressAuthUpdate = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!suppressAuthUpdate.current) {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!suppressAuthUpdate.current) {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string): Promise<{ error: AuthError | Error | null }> => {
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (!error && data.user) {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          email: normalizedEmail,
          full_name: fullName,
        });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
      }

      // Créer la demande d'adhésion avec le premier propriétaire
      const firstOwnerId = OWNERS_LIST[0];
      if (firstOwnerId) {
        const { error: memberError } = await supabase
          .from('team_members')
          .insert({
            user_id: firstOwnerId,
            auth_user_id: data.user.id,
            email: normalizedEmail,
            name: fullName || normalizedEmail,
            role: 'employee',
            status: 'en_attente_confirmation',
            permissions: {},
          });

        if (memberError) {
          console.error('Failed to create team member request:', memberError);
        }
      } else {
        console.error('VITE_OWNER_IDS not configured — team membership not created');
      }
    }

    return { error };
  };

  const signIn = async (email: string, password: string): Promise<{ data: { user: User | null } | null; error: AuthError | Error | null }> => {
    const normalizedEmail = email.trim().toLowerCase();

    suppressAuthUpdate.current = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error || !data.user) {
        return { data: null, error };
      }

      // Les propriétaires (owners) bypassent la vérification d'adhésion
      if (isOwner(data.user.id)) {
        setUser(data.user);
        setSession(data.session);
        return { data: { user: data.user }, error: null };
      }

      if (OWNERS_LIST.length === 0) {
        await supabase.auth.signOut();
        return { data: null, error: new Error('Configuration manquante (VITE_OWNER_IDS)') };
      }

      // Utiliser le premier propriétaire pour vérifier l'adhésion
      const firstOwnerId = OWNERS_LIST[0];

      // Vérifier le statut d'adhésion dans team_members
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('id, status')
        .eq('auth_user_id', data.user.id)
        .eq('user_id', firstOwnerId)
        .maybeSingle();

      if (memberError) {
        // Erreur DB — ne pas bloquer (peut être RLS ou connectivity). resolve-session gère le fallback.
        console.error('Failed to check team membership:', memberError);
        setUser(data.user);
        setSession(data.session);
        return { data: { user: data.user }, error: null };
      }

      // Pas dans team_members → peut être co-patron. resolve-session tranche.
      if (!memberData) {
        setUser(data.user);
        setSession(data.session);
        return { data: { user: data.user }, error: null };
      }

      // Bloquer explicitement les membres non-actifs
      if (memberData.status !== 'actif') {
        await supabase.auth.signOut();
        const statusMessages: Record<string, string> = {
          en_attente_confirmation: "Votre demande d'accès est en attente d'approbation du patron.",
          'bloqué': "Votre accès a été bloqué. Contactez votre patron.",
          'refusé': "Votre demande d'accès a été refusée. Contactez votre patron.",
          'supprimé': "Ce compte a été supprimé. Contactez votre patron.",
        };
        const msg = statusMessages[memberData.status] ?? `Accès non autorisé (statut : ${memberData.status})`;
        return { data: null, error: new Error(msg) };
      }

      // Employé actif — resolve-session gère le token membre (pas de session Supabase permanente)
      setUser(data.user);
      setSession(data.session);
      return { data: { user: data.user }, error: null };
    } finally {
      suppressAuthUpdate.current = false;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

