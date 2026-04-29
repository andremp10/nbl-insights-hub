import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AppUser {
  id: string;
  auth_user_id: string;
  email: string;
  role: 'master' | 'user';
  status: 'active' | 'inactive';
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  appUser: AppUser | null;
  isMaster: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const APP_USER_CACHE_KEY = 'nbl_app_user_cache_v1';

function readCachedAppUser(authUserId: string): AppUser | null {
  try {
    const raw = sessionStorage.getItem(APP_USER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppUser;
    if (parsed?.auth_user_id === authUserId) return parsed;
    return null;
  } catch {
    return null;
  }
}

function writeCachedAppUser(appUser: AppUser | null) {
  try {
    if (!appUser) sessionStorage.removeItem(APP_USER_CACHE_KEY);
    else sessionStorage.setItem(APP_USER_CACHE_KEY, JSON.stringify(appUser));
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedUserIdRef = useRef<string | null>(null);

  const fetchAppUser = async (authUserId: string): Promise<AppUser | null> => {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('auth_user_id', authUserId)
      .single();

    if (error || !data) return null;
    return data as AppUser;
  };

  const handleSession = (newSession: Session | null) => {
    setSession(newSession);
    setUser(newSession?.user ?? null);

    if (!newSession?.user) {
      setAppUser(null);
      fetchedUserIdRef.current = null;
      writeCachedAppUser(null);
      setLoading(false);
      return;
    }

    // Try cache first — unblocks UI immediately on refresh.
    const cached = readCachedAppUser(newSession.user.id);
    if (cached) {
      setAppUser(cached);
      setLoading(false);
    }

    if (fetchedUserIdRef.current === newSession.user.id) {
      setLoading(false);
      return;
    }
    fetchedUserIdRef.current = newSession.user.id;

    // Revalidate in background; do not block UI.
    fetchAppUser(newSession.user.id).then((appUserData) => {
      if (!appUserData || appUserData.status !== 'active') {
        setAppUser(null);
        fetchedUserIdRef.current = null;
        writeCachedAppUser(null);
        supabase.auth.signOut();
        setSession(null);
        setUser(null);
      } else {
        setAppUser(appUserData);
        writeCachedAppUser(appUserData);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // Listen for changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const TIMEOUT_MS = 8000;
    const MAX_ATTEMPTS = 2;

    const attempt = async (): Promise<{ error: string | null; timedOut?: boolean }> => {
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<{ timedOut: true }>((resolve) => {
        timeoutId = setTimeout(() => resolve({ timedOut: true }), TIMEOUT_MS);
      });

      try {
        const result = await Promise.race([
          supabase.auth.signInWithPassword({ email, password }),
          timeoutPromise,
        ]);

        if ((result as { timedOut?: boolean }).timedOut) {
          return { error: 'timeout', timedOut: true };
        }

        const { error } = result as Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;
        if (error) return { error: error.message };
        return { error: null };
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    };

    for (let i = 1; i <= MAX_ATTEMPTS; i++) {
      const res = await attempt();
      // Retry only on timeout / 5xx-ish transient failures
      const transient =
        res.timedOut ||
        (res.error && /timeout|504|503|502|network|fetch/i.test(res.error));
      if (!transient || i === MAX_ATTEMPTS) {
        if (res.timedOut) {
          return { error: 'O servidor de autenticação está lento. Tente novamente em instantes.' };
        }
        return { error: res.error };
      }
    }
    return { error: 'Falha ao autenticar. Tente novamente.' };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    fetchedUserIdRef.current = null;
    writeCachedAppUser(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      session,
      user,
      appUser,
      isMaster: appUser?.role === 'master',
      loading,
      signIn,
      resetPassword,
      signOut,
    }}>
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
