import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import * as api from '@/lib/api';
import { validateEmail, validatePassword } from '@/lib/credentials';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { AppSession, Profile } from '@/lib/types';

const SESSION_KEY = 'notlar.session';

type AuthContextValue = {
  session: AppSession | null;
  user: Profile | null;
  profile: Profile | null;
  isLoading: boolean;
  isConfigured: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function readStoredSession() {
  if (Platform.OS === 'web' && typeof window === 'undefined') return null;
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppSession;
  } catch {
    return null;
  }
}

async function writeStoredSession(session: AppSession | null) {
  if (Platform.OS === 'web' && typeof window === 'undefined') return;
  if (session) {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    await AsyncStorage.removeItem(SESSION_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AppSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySession = useCallback(async (next: AppSession | null) => {
    setSession(next);
    await writeStoredSession(next);
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const stored = await readStoredSession();
        if (!stored?.token) return;
        const restored = await api.restoreSession(stored.token);
        if (mounted) await applySession(restored);
      } catch {
        await writeStoredSession(null);
        if (mounted) setSession(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [applySession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const emailError = validateEmail(email);
      if (emailError) throw new Error(emailError);
      const passwordError = validatePassword(password);
      if (passwordError) throw new Error(passwordError);
      const next = await api.loginUser(email, password);
      await applySession(next);
    },
    [applySession]
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      const emailError = validateEmail(email);
      if (emailError) throw new Error(emailError);
      const passwordError = validatePassword(password);
      if (passwordError) throw new Error(passwordError);
      const next = await api.registerUser(email, password);
      await applySession(next);
    },
    [applySession]
  );

  const signOut = useCallback(async () => {
    if (session?.token) {
      try {
        await api.logoutUser(session.token);
      } catch {
        // Yerel oturumu yine de kapat.
      }
    }
    await applySession(null);
  }, [applySession, session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile: session?.user ?? null,
      isLoading,
      isConfigured: isSupabaseConfigured,
      isAdmin: session?.user.role === 'admin' && session.user.is_active,
      signIn,
      signUp,
      signOut,
    }),
    [session, isLoading, signIn, signUp, signOut]
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
