import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Platform } from 'react-native';

import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Notebook } from '@/lib/types';

export const NOTEBOOK_IDLE_LOCK_MS = 2 * 60 * 1000;
const TOUCH_THROTTLE_MS = 10 * 1000;

type NotebookLockContextValue = {
  isProtected: (notebookId?: string | null) => boolean;
  isUnlocked: (notebookId?: string | null) => boolean;
  needsUnlock: (notebookId?: string | null) => boolean;
  getRemainingLockMs: (notebookId?: string | null, now?: number) => number;
  syncNotebooks: (notebooks: Notebook[]) => void;
  markProtected: (notebookId: string, locked: boolean) => void;
  unlock: (notebookId: string, password: string) => Promise<void>;
  lock: (notebookId: string) => Promise<void>;
  lockAllUnlocked: () => void;
  enterSession: (notebookId?: string | null) => void;
  leaveSession: (notebookId?: string | null) => void;
  touch: (notebookId?: string | null) => void;
  setPassword: (notebookId: string, newPassword: string, currentPassword?: string) => Promise<void>;
  removePassword: (notebookId: string, currentPassword: string) => Promise<void>;
};

const NotebookLockContext = createContext<NotebookLockContextValue | undefined>(undefined);

export function isNotebookLockedError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return message.toLocaleLowerCase('tr-TR').includes('kilitli');
}

export function NotebookLockProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const token = session?.token;
  const [protectedIds, setProtectedIds] = useState<Record<string, true>>({});
  const [unlocks, setUnlocks] = useState<Record<string, number>>({});
  const unlocksRef = useRef<Record<string, number>>({});
  const lastTouchRef = useRef<Record<string, number>>({});
  const tokenRef = useRef(token);
  const sessionCountsRef = useRef<Record<string, number>>({});

  tokenRef.current = token;

  const writeUnlocks = useCallback((updater: (prev: Record<string, number>) => Record<string, number>) => {
    setUnlocks(() => {
      const next = updater(unlocksRef.current);
      unlocksRef.current = next;
      return next;
    });
  }, []);

  const markProtected = useCallback((notebookId: string, locked: boolean) => {
    setProtectedIds((prev) => {
      if (locked) {
        if (prev[notebookId]) return prev;
        return { ...prev, [notebookId]: true };
      }
      if (!prev[notebookId]) return prev;
      const next = { ...prev };
      delete next[notebookId];
      return next;
    });
    if (!locked) {
      writeUnlocks((prev) => {
        if (!prev[notebookId]) return prev;
        const next = { ...prev };
        delete next[notebookId];
        return next;
      });
    }
  }, [writeUnlocks]);

  const syncNotebooks = useCallback((notebooks: Notebook[]) => {
    setProtectedIds((prev) => {
      const next: Record<string, true> = { ...prev };
      let changed = false;
      notebooks.forEach((notebook) => {
        if (notebook.is_locked) {
          if (!next[notebook.id]) {
            next[notebook.id] = true;
            changed = true;
          }
        } else if (next[notebook.id]) {
          delete next[notebook.id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    writeUnlocks((prev) => {
      let changed = false;
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        const notebook = notebooks.find((item) => item.id === id);
        if (notebook && !notebook.is_locked) {
          delete next[id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [writeUnlocks]);

  const lock = useCallback(async (notebookId: string) => {
    writeUnlocks((prev) => {
      if (!prev[notebookId]) return prev;
      const next = { ...prev };
      delete next[notebookId];
      return next;
    });
    delete lastTouchRef.current[notebookId];
    const currentToken = tokenRef.current;
    if (!currentToken) return;
    try {
      await api.lockNotebook(currentToken, notebookId);
    } catch {
      // Yerel kilit yine de uygulanır.
    }
  }, [writeUnlocks]);

  const lockAllUnlocked = useCallback(() => {
    const now = Date.now();
    Object.entries(unlocksRef.current).forEach(([id, lastActivity]) => {
      if ((sessionCountsRef.current[id] ?? 0) > 0) return;
      // Listeden şifre girilip deftere geçilirken odak kayması kilidi kapatmasın.
      if (now - lastActivity < 800) return;
      void lock(id);
    });
  }, [lock]);

  const enterSession = useCallback((notebookId?: string | null) => {
    if (!notebookId) return;
    sessionCountsRef.current[notebookId] = (sessionCountsRef.current[notebookId] ?? 0) + 1;
  }, []);

  const leaveSession = useCallback((notebookId?: string | null) => {
    if (!notebookId) return;
    sessionCountsRef.current[notebookId] = Math.max(0, (sessionCountsRef.current[notebookId] ?? 1) - 1);
  }, []);

  const unlock = useCallback(
    async (notebookId: string, password: string) => {
      if (!tokenRef.current) throw new Error('Oturum gerekli.');
      await api.unlockNotebook(tokenRef.current, notebookId, password);
      markProtected(notebookId, true);
      writeUnlocks((prev) => ({ ...prev, [notebookId]: Date.now() }));
      lastTouchRef.current[notebookId] = Date.now();
    },
    [markProtected, writeUnlocks]
  );

  const touch = useCallback(
    (notebookId?: string | null) => {
      if (!notebookId || !unlocksRef.current[notebookId]) return;
      const now = Date.now();
      // Yazmayı bozmamak için React state güncellenmez; sayaç ref'ten okur.
      unlocksRef.current = { ...unlocksRef.current, [notebookId]: now };
      const last = lastTouchRef.current[notebookId] ?? 0;
      if (now - last < TOUCH_THROTTLE_MS) return;
      lastTouchRef.current[notebookId] = now;
      const currentToken = tokenRef.current;
      if (!currentToken) return;
      api.touchNotebook(currentToken, notebookId).catch(() => {
        void lock(notebookId);
      });
    },
    [lock]
  );

  const setPassword = useCallback(
    async (notebookId: string, newPassword: string, currentPassword?: string) => {
      if (!tokenRef.current) throw new Error('Oturum gerekli.');
      await api.setNotebookPassword(tokenRef.current, notebookId, newPassword, currentPassword);
      markProtected(notebookId, true);
      writeUnlocks((prev) => ({ ...prev, [notebookId]: Date.now() }));
      lastTouchRef.current[notebookId] = Date.now();
    },
    [markProtected, writeUnlocks]
  );

  const removePassword = useCallback(
    async (notebookId: string, currentPassword: string) => {
      if (!tokenRef.current) throw new Error('Oturum gerekli.');
      await api.setNotebookPassword(tokenRef.current, notebookId, '', currentPassword);
      markProtected(notebookId, false);
    },
    [markProtected]
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      Object.entries(unlocksRef.current).forEach(([id, lastActivity]) => {
        if (now - lastActivity >= NOTEBOOK_IDLE_LOCK_MS) {
          void lock(id);
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lock]);

  useEffect(() => {
    const expireIfNeeded = () => {
      const now = Date.now();
      Object.entries(unlocksRef.current).forEach(([id, lastActivity]) => {
        if (now - lastActivity >= NOTEBOOK_IDLE_LOCK_MS) {
          void lock(id);
        }
      });
    };

    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') expireIfNeeded();
    });

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', expireIfNeeded);
      return () => {
        appSub.remove();
        document.removeEventListener('visibilitychange', expireIfNeeded);
      };
    }

    return () => appSub.remove();
  }, [lock]);

  useEffect(() => {
    if (token) return;
    writeUnlocks(() => ({}));
    lastTouchRef.current = {};
    sessionCountsRef.current = {};
  }, [token, writeUnlocks]);

  const isProtected = useCallback(
    (notebookId?: string | null) => Boolean(notebookId && protectedIds[notebookId]),
    [protectedIds]
  );

  const isUnlocked = useCallback(
    (notebookId?: string | null) => Boolean(notebookId && unlocks[notebookId]),
    [unlocks]
  );

  const needsUnlock = useCallback(
    (notebookId?: string | null) => isProtected(notebookId) && !isUnlocked(notebookId),
    [isProtected, isUnlocked]
  );

  const getRemainingLockMs = useCallback((notebookId?: string | null, now = Date.now()) => {
    if (!notebookId) return 0;
    const lastActivity = unlocksRef.current[notebookId];
    if (!lastActivity) return 0;
    return Math.max(0, NOTEBOOK_IDLE_LOCK_MS - (now - lastActivity));
  }, []);

  const value = useMemo<NotebookLockContextValue>(
    () => ({
      isProtected,
      isUnlocked,
      needsUnlock,
      getRemainingLockMs,
      syncNotebooks,
      markProtected,
      unlock,
      lock,
      lockAllUnlocked,
      enterSession,
      leaveSession,
      touch,
      setPassword,
      removePassword,
    }),
    [
      isProtected,
      isUnlocked,
      needsUnlock,
      getRemainingLockMs,
      syncNotebooks,
      markProtected,
      unlock,
      lock,
      lockAllUnlocked,
      enterSession,
      leaveSession,
      touch,
      setPassword,
      removePassword,
    ]
  );

  return <NotebookLockContext.Provider value={value}>{children}</NotebookLockContext.Provider>;
}

export function useNotebookLock() {
  const context = useContext(NotebookLockContext);
  if (!context) {
    throw new Error('useNotebookLock, NotebookLockProvider içinde kullanılmalı.');
  }
  return context;
}
