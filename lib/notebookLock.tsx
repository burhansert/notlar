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
import { AppState, Platform, type ViewProps } from 'react-native';

import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Notebook } from '@/lib/types';

export const NOTEBOOK_IDLE_LOCK_MS = 2 * 60 * 1000;
const TOUCH_THROTTLE_MS = 10 * 1000;
const EXIT_LOCK_DELAY_MS = 280;

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
  const unlocksRef = useRef(unlocks);
  const lastTouchRef = useRef<Record<string, number>>({});
  const tokenRef = useRef(token);
  const sessionCountsRef = useRef<Record<string, number>>({});
  const leaveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  unlocksRef.current = unlocks;
  tokenRef.current = token;

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
      setUnlocks((prev) => {
        if (!prev[notebookId]) return prev;
        const next = { ...prev };
        delete next[notebookId];
        return next;
      });
    }
  }, []);

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
    setUnlocks((prev) => {
      const lockedIds = new Set(notebooks.filter((notebook) => notebook.is_locked).map((notebook) => notebook.id));
      let changed = false;
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        const notebook = notebooks.find((item) => item.id === id);
        if (notebook && !notebook.is_locked) {
          delete next[id];
          changed = true;
        }
        if (notebook && notebook.is_locked) lockedIds.add(id);
      });
      return changed ? next : prev;
    });
  }, []);

  const lock = useCallback(async (notebookId: string) => {
    const leaveTimer = leaveTimersRef.current[notebookId];
    if (leaveTimer) {
      clearTimeout(leaveTimer);
      delete leaveTimersRef.current[notebookId];
    }
    setUnlocks((prev) => {
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
  }, []);

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
    const leaveTimer = leaveTimersRef.current[notebookId];
    if (leaveTimer) {
      clearTimeout(leaveTimer);
      delete leaveTimersRef.current[notebookId];
    }
    sessionCountsRef.current[notebookId] = (sessionCountsRef.current[notebookId] ?? 0) + 1;
  }, []);

  const leaveSession = useCallback(
    (notebookId?: string | null) => {
      if (!notebookId) return;
      const next = Math.max(0, (sessionCountsRef.current[notebookId] ?? 1) - 1);
      sessionCountsRef.current[notebookId] = next;
      if (next > 0) return;
      const leaveTimer = leaveTimersRef.current[notebookId];
      if (leaveTimer) clearTimeout(leaveTimer);
      leaveTimersRef.current[notebookId] = setTimeout(() => {
        delete leaveTimersRef.current[notebookId];
        if ((sessionCountsRef.current[notebookId] ?? 0) > 0) return;
        void lock(notebookId);
      }, EXIT_LOCK_DELAY_MS);
    },
    [lock]
  );

  const unlock = useCallback(
    async (notebookId: string, password: string) => {
      if (!tokenRef.current) throw new Error('Oturum gerekli.');
      await api.unlockNotebook(tokenRef.current, notebookId, password);
      markProtected(notebookId, true);
      setUnlocks((prev) => ({ ...prev, [notebookId]: Date.now() }));
      lastTouchRef.current[notebookId] = Date.now();
    },
    [markProtected]
  );

  const touch = useCallback(
    (notebookId?: string | null) => {
      if (!notebookId || !unlocksRef.current[notebookId]) return;
      const now = Date.now();
      setUnlocks((prev) => {
        if (!prev[notebookId]) return prev;
        return { ...prev, [notebookId]: now };
      });
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
      setUnlocks((prev) => ({ ...prev, [notebookId]: Date.now() }));
      lastTouchRef.current[notebookId] = Date.now();
    },
    [markProtected]
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
    setUnlocks({});
    lastTouchRef.current = {};
    sessionCountsRef.current = {};
    Object.values(leaveTimersRef.current).forEach(clearTimeout);
    leaveTimersRef.current = {};
  }, [token]);

  useEffect(() => {
    return () => {
      Object.values(leaveTimersRef.current).forEach(clearTimeout);
    };
  }, []);

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

  const getRemainingLockMs = useCallback(
    (notebookId?: string | null, now = Date.now()) => {
      if (!notebookId) return 0;
      const lastActivity = unlocks[notebookId];
      if (!lastActivity) return 0;
      return Math.max(0, NOTEBOOK_IDLE_LOCK_MS - (now - lastActivity));
    },
    [unlocks]
  );

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

export function notebookSessionViewProps(touch: (notebookId?: string | null) => void, notebookId?: string): ViewProps {
  return {
    onTouchStart: () => touch(notebookId),
    ...(Platform.OS === 'web'
      ? {
          onMouseMove: () => touch(notebookId),
          onKeyDown: () => touch(notebookId),
        }
      : null),
  };
}
