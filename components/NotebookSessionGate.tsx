import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Platform, StyleSheet, Text, View } from 'react-native';

import { NotebookPasswordModal } from '@/components/NotebookPasswordModal';
import { colors, radius, spacing } from '@/constants/theme';
import {
  notebookSessionViewProps,
  useNotebookLock,
} from '@/lib/notebookLock';

const NOTEBOOKS_HREF = '/(tabs)' as Href;

export function NotebookSessionGate({
  notebookId,
  title,
  children,
}: {
  notebookId?: string;
  title?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const { needsUnlock, touch, unlock, markProtected, enterSession, leaveSession } = useNotebookLock();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const wasUnlockedRef = useRef(false);
  const locked = Boolean(notebookId) && needsUnlock(notebookId);
  const showModal = locked && !dismissed;

  useFocusEffect(
    useCallback(() => {
      if (!notebookId) return undefined;
      enterSession(notebookId);

      const resetTimer = () => touch(notebookId);
      const webListeners =
        Platform.OS === 'web' && typeof document !== 'undefined'
          ? (() => {
              document.addEventListener('keydown', resetTimer, true);
              document.addEventListener('keyup', resetTimer, true);
              document.addEventListener('input', resetTimer, true);
              return () => {
                document.removeEventListener('keydown', resetTimer, true);
                document.removeEventListener('keyup', resetTimer, true);
                document.removeEventListener('input', resetTimer, true);
              };
            })()
          : null;

      return () => {
        webListeners?.();
        leaveSession(notebookId);
      };
    }, [enterSession, leaveSession, notebookId, touch])
  );

  useEffect(() => {
    setDismissed(false);
    setError(null);
    wasUnlockedRef.current = false;
  }, [notebookId]);

  useEffect(() => {
    if (!notebookId) return;
    if (locked && wasUnlockedRef.current) {
      setDismissed(false);
    }
    wasUnlockedRef.current = !locked;
  }, [notebookId, locked]);

  async function handleUnlock(password: string) {
    if (!notebookId) return;
    setLoading(true);
    setError(null);
    try {
      await unlock(notebookId, password);
      setDismissed(false);
    } catch (err) {
      markProtected(notebookId, true);
      setError(err instanceof Error ? err.message : 'Açılamadı.');
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    setDismissed(true);
    setError(null);
    // Kilitli içerikte kalmamak için doğrudan not defteri listesine dönülür.
    router.replace(NOTEBOOKS_HREF);
  }

  return (
    <View style={styles.wrap} {...notebookSessionViewProps(touch, notebookId)}>
      {children}
      {locked ? (
        <View style={styles.cover}>
          <View style={styles.coverIcon}>
            <Ionicons name="lock-closed-outline" size={30} color={colors.forest} />
          </View>
          <Text style={styles.coverTitle}>Bu not defteri kilitli</Text>
          {title ? <Text style={styles.coverSubtitle}>{title}</Text> : null}
          <Text style={styles.coverMessage}>
            İçeriği görmek için şifreyi girin.
          </Text>
          <Pressable
            onPress={() => {
              setError(null);
              setDismissed(false);
            }}
            style={({ pressed }) => [styles.coverButton, { opacity: pressed ? 0.85 : 1 }]}>
            <Text style={styles.coverButtonLabel}>Şifreyi gir</Text>
          </Pressable>
        </View>
      ) : null}
      <NotebookPasswordModal
        visible={showModal}
        mode="unlock"
        title={title}
        loading={loading}
        error={error}
        onConfirm={handleUnlock}
        onCancel={handleCancel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  cover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  coverIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.forestSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.forest,
    textAlign: 'center',
  },
  coverMessage: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
    textAlign: 'center',
  },
  coverButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.forest,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
  },
  coverButtonLabel: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
