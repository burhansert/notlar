import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';
import {
  normalizeUsername,
  translateAuthError,
  usernameToEmail,
  validatePassword,
  validateUsername,
} from '@/lib/username';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isConfigured: boolean;
  isAdmin: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, role, is_active, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async (nextSession: Session | null) => {
    if (!nextSession?.user) {
      setProfile(null);
      return;
    }

    const nextProfile = await fetchProfile(nextSession.user.id);
    if (nextProfile && !nextProfile.is_active) {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      throw new Error('Hesabınız yönetici tarafından durduruldu.');
    }
    setProfile(nextProfile);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        try {
          await loadProfile(data.session);
        } catch {
          setProfile(null);
        }
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      loadProfile(nextSession).catch(() => {
        setProfile(null);
      });
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (username: string, password: string) => {
    const usernameError = validateUsername(username);
    if (usernameError) throw new Error(usernameError);
    const passwordError = validatePassword(password);
    if (passwordError) throw new Error(passwordError);

    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    if (error) throw new Error(translateAuthError(error.message));
  }, []);

  const signUp = useCallback(async (username: string, password: string) => {
    const normalized = normalizeUsername(username);
    const usernameError = validateUsername(normalized);
    if (usernameError) throw new Error(usernameError);
    const passwordError = validatePassword(password);
    if (passwordError) throw new Error(passwordError);

    const { data, error } = await supabase.auth.signUp({
      email: usernameToEmail(normalized),
      password,
      options: {
        data: { username: normalized },
      },
    });
    if (error) throw new Error(translateAuthError(error.message));
    if (!data.session) {
      throw new Error(
        'Kayıt alındı ancak oturum açılmadı. Supabase e-posta doğrulamasını kapatın ve tekrar deneyin.'
      );
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(translateAuthError(error.message));
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    const nextProfile = await fetchProfile(session.user.id);
    setProfile(nextProfile);
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      isLoading,
      isConfigured: isSupabaseConfigured,
      isAdmin: profile?.role === 'admin' && profile.is_active,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [session, profile, isLoading, signIn, signUp, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth, AuthProvider içinde kullanılmalı.');
  }
  return context;
}
