import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

  const fetchAppUser = async (authUserId: string): Promise<AppUser | null> => {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('auth_user_id', authUserId)
      .single();

    if (error || !data) return null;
    return data as AppUser;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Use setTimeout to avoid Supabase client deadlock
        setTimeout(async () => {
          const appUserData = await fetchAppUser(session.user.id);
          if (!appUserData || appUserData.status !== 'active') {
            setAppUser(null);
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
          } else {
            setAppUser(appUserData);
          }
          setLoading(false);
        }, 0);
      } else {
        setAppUser(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const appUserData = await fetchAppUser(session.user.id);
        if (!appUserData || appUserData.status !== 'active') {
          setAppUser(null);
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
        } else {
          setAppUser(appUserData);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    // Role check happens in onAuthStateChange
    return { error: null };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
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
