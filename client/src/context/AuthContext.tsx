import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
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
    // #region agent log
    fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'07ec15'},body:JSON.stringify({sessionId:'07ec15',runId:'supabase-auth-debug-1',hypothesisId:'H2',location:'client/src/context/AuthContext.tsx:42',message:'signUp called',data:{hasEmail:Boolean(email),passwordLength:password?.length||0,hasFullName:Boolean(fullName)},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    // #region agent log
    fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'07ec15'},body:JSON.stringify({sessionId:'07ec15',runId:'supabase-auth-debug-1',hypothesisId:'H2',location:'client/src/context/AuthContext.tsx:53',message:'signUp result',data:{hasUser:Boolean(data?.user),errorMessage:error?.message||null,errorName:error?.name||null,errorStatus:(error as { status?: number } | null)?.status||null},timestamp:Date.now()})}).catch(()=>{});
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
        // #region agent log
        fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'07ec15'},body:JSON.stringify({sessionId:'07ec15',runId:'supabase-auth-debug-1',hypothesisId:'H4',location:'client/src/context/AuthContext.tsx:66',message:'user_profiles insert failed after signUp',data:{profileErrorMessage:profileError.message,profileErrorCode:(profileError as { code?: string }).code||null},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        console.error('Error creating user profile:', profileError);
      }
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    // #region agent log
    fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'07ec15'},body:JSON.stringify({sessionId:'07ec15',runId:'supabase-auth-debug-1',hypothesisId:'H3',location:'client/src/context/AuthContext.tsx:74',message:'signIn called',data:{hasEmail:Boolean(email),passwordLength:password?.length||0},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // #region agent log
    fetch('http://127.0.0.1:7281/ingest/9f4619ca-3c4c-4985-8121-3b0a2609e4da',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'07ec15'},body:JSON.stringify({sessionId:'07ec15',runId:'supabase-auth-debug-1',hypothesisId:'H3',location:'client/src/context/AuthContext.tsx:82',message:'signIn result',data:{hasSession:Boolean(data?.session),hasUser:Boolean(data?.user),errorMessage:error?.message||null,errorName:error?.name||null,errorStatus:(error as { status?: number } | null)?.status||null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    return { error };
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

