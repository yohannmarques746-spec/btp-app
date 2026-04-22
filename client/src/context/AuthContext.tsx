import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

// #region agent log
let __dbgSignUpSeq = 0;
let __dbgLastSignUpAt = 0;
// #endregion

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ data: { user: User | null } | null; error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Récupérer la session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Écouter les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    // #region agent log
    const now = Date.now();
    const seq = ++__dbgSignUpSeq;
    const deltaMs = __dbgLastSignUpAt ? now - __dbgLastSignUpAt : -1;
    __dbgLastSignUpAt = now;
    fetch('http://127.0.0.1:7471/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'b01c17' },
      body: JSON.stringify({
        sessionId: 'b01c17',
        runId: 'pre-fix',
        hypothesisId: 'H1',
        location: 'AuthContext.tsx:signUp:entry',
        message: 'signUp invoked',
        data: { seq, deltaMsSincePrev: deltaMs, emailLen: normalizedEmail.length },
        timestamp: now,
      }),
    }).catch(() => {});
    // #endregion
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    // #region agent log
    fetch('http://127.0.0.1:7471/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'b01c17' },
      body: JSON.stringify({
        sessionId: 'b01c17',
        runId: 'pre-fix',
        hypothesisId: 'H2',
        location: 'AuthContext.tsx:signUp:afterSupabase',
        message: 'signUp supabase response',
        data: {
          seq: __dbgSignUpSeq,
          hasError: !!error,
          errName: error?.name ?? null,
          errMsgPrefix: error?.message ? String(error.message).slice(0, 120) : null,
          statusFromErr: (error as { status?: number })?.status ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if (!error && data.user) {
      // Créer le profil utilisateur
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          email: email,
          full_name: fullName,
        });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
      }
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    // Mettre à jour user/session immédiatement — sans attendre onAuthStateChange
    // pour éviter la race condition dans ProtectedRoute
    if (!error && data.user) {
      setUser(data.user);
      setSession(data.session);
    }

    return { data: data ? { user: data.user } : null, error };
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

