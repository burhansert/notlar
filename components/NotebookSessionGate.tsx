import { type ReactNode, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { NotebookPasswordModal } from '@/components/NotebookPasswordModal';
import {
  notebookSessionViewProps,
  useNotebookLock,
} from '@/lib/notebookLock';

export function NotebookSessionGate({
  notebookId,
  title,
  children,
}: {
  notebookId?: string;
  title?: string;
  children: ReactNode;
}) {
  const { needsUnlock, touch, unlock, markProtected } = useNotebookLock();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const wasUnlockedRef = useRef(false);
  const locked = Boolean(notebookId) && needsUnlock(notebookId);
  const showModal = locked && !dismissed;

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
  }

  return (
    <View style={styles.wrap} {...notebookSessionViewProps(touch, notebookId)}>
      {children}
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
});
