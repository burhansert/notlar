import { type ReactNode, useState } from 'react';
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
  onCancelUnlock,
}: {
  notebookId?: string;
  title?: string;
  children: ReactNode;
  onCancelUnlock?: () => void;
}) {
  const { needsUnlock, touch, unlock, markProtected } = useNotebookLock();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blocked = Boolean(notebookId) && needsUnlock(notebookId);

  async function handleUnlock(password: string) {
    if (!notebookId) return;
    setLoading(true);
    setError(null);
    try {
      await unlock(notebookId, password);
    } catch (err) {
      markProtected(notebookId, true);
      setError(err instanceof Error ? err.message : 'Açılamadı.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.wrap} {...notebookSessionViewProps(touch, notebookId)}>
      {children}
      <NotebookPasswordModal
        visible={blocked}
        mode="unlock"
        title={title}
        loading={loading}
        error={error}
        onConfirm={handleUnlock}
        onCancel={onCancelUnlock ?? (() => {})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
});
