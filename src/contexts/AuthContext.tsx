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

  const handleSession = async (newSession: Session | null) => {
    setSession(newSession);
    setUser(newSession?.user ?? null);

    if (newSession?.user) {
      // Skip if we already fetched for this user
      if (fetchedUserIdRef.current === newSession.user.id) {
        setLoading(false);
        return;
      }
      fetchedUserIdRef.current = newSession.user.id;

      const appUserData = await fetchAppUser(newSession.user.id);
      if (!appUserData || appUserData.status !== 'active') {
        setAppUser(null);
        fetchedUserIdRef.current = null;
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
      } else {
        setAppUser(appUserData);
      }
    } else {
      setAppUser(null);
      fetchedUserIdRef.current = null;
    }
    setLoading(false);
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    fetchedUserIdRef.current = null;
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
