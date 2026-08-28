import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { NotebookCard } from '@/components/NotebookCard';
import { NotebookPasswordModal, type NotebookPasswordMode } from '@/components/NotebookPasswordModal';
import { ActionMenuModal, ConfirmModal, EmptyState, PromptModal } from '@/components/ui';
import { colors, radius, shadow, spacing } from '@/constants/theme';
import { createNotebook, deleteNotebook, listNotebooks, updateNotebook } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useNotebookLock } from '@/lib/notebookLock';
import type { Notebook } from '@/lib/types';

export default function NotebooksScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Notebook | null>(null);
  const [menuTarget, setMenuTarget] = useState<Notebook | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Notebook | null>(null);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<Notebook | null>(null);
  const [passwordMode, setPasswordMode] = useState<NotebookPasswordMode>('unlock');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const notebookLock = useNotebookLock();
  const { syncNotebooks, needsUnlock, unlock, setPassword, removePassword } = notebookLock;

  const load = useCallback(async () => {
    if (!session?.token) {
      setNotebooks([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await listNotebooks(session.token);
      setNotebooks(data ?? []);
      notebookLock.syncNotebooks(data ?? []);
    } catch {
      setNotebooks([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [session?.token, syncNotebooks]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notebooks;
    return notebooks.filter((notebook) => notebook.title.toLowerCase().includes(q));
  }, [notebooks, query]);

  async function handleCreate(title: string) {
    if (!session?.token) return;
    setCreateOpen(false);
    try {
      await createNotebook(session.token, title);
      load();
    } catch (err) {
      Alert.alert('Oluşturulamadı', err instanceof Error ? err.message : 'Bilinmeyen hata');
    }
  }

  async function handleEdit(title: string) {
    if (!session?.token || !editTarget) return;
    const target = editTarget;
    setEditTarget(null);
    try {
      await updateNotebook(session.token, target.id, title);
      load();
    } catch (err) {
      Alert.alert('Güncellenemedi', err instanceof Error ? err.message : 'Bilinmeyen hata');
    }
  }

  function openNotebook(notebook: Notebook) {
    if (notebook.is_locked && needsUnlock(notebook.id)) {
      setPasswordError(null);
      setPasswordMode('unlock');
      setPasswordTarget(notebook);
      return;
    }
    router.push(`/notebook/${notebook.id}?title=${encodeURIComponent(notebook.title)}` as Href);
  }

  function openMenu(notebook: Notebook) {
    setMenuTarget(notebook);
  }

  function openPassword(notebook: Notebook, mode: NotebookPasswordMode) {
    setPasswordError(null);
    setPasswordMode(mode);
    setPasswordTarget(notebook);
  }

  async function handlePasswordConfirm(password: string, currentPassword?: string) {
    if (!passwordTarget) return;
    const target = passwordTarget;
    setPasswordLoading(true);
    setPasswordError(null);
    try {
      if (passwordMode === 'unlock') {
        await unlock(target.id, password);
        setPasswordTarget(null);
        router.push(`/notebook/${target.id}?title=${encodeURIComponent(target.title)}` as Href);
      } else if (passwordMode === 'remove') {
        await removePassword(target.id, currentPassword ?? password);
        setPasswordTarget(null);
        load();
      } else {
        await setPassword(target.id, password, currentPassword);
        setPasswordTarget(null);
        load();
      }
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'İşlem başarısız.');
    } finally {
      setPasswordLoading(false);
    }
  }

  function openFabMenu() {
    setFabMenuOpen(true);
  }

  async function handleDelete() {
    if (!session?.token || !deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteNotebook(session.token, target.id);
      load();
    } catch (err) {
      Alert.alert('Silinemedi', err instanceof Error ? err.message : 'Bilinmeyen hata');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.search}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Not defterlerinde ara"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />
      </View>
      {loading ? (
        <ActivityIndicator color={colors.forest} style={styles.loader} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.forest}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <EmptyState
              icon="book-outline"
              title={query ? 'Sonuç yok' : 'Henüz not defteri yok'}
              subtitle={
                query
                  ? 'Farklı bir arama deneyin.'
                  : 'İlk not defterinizi veya notunuzu oluşturmak için + düğmesine dokunun.'
              }
            />
          }
          renderItem={({ item }) => (
            <NotebookCard
              notebook={item}
              onPress={() => openNotebook(item)}
              onMenuPress={() => openMenu(item)}
            />
          )}
        />
      )}
      <Pressable
        onPress={openFabMenu}
        style={({ pressed }) => [styles.fab, shadow.card, { opacity: pressed ? 0.85 : 1 }]}>
        <Ionicons name="add" size={28} color={colors.white} />
      </Pressable>
      <PromptModal
        visible={createOpen}
        title="Yeni not defteri"
        label="Başlık"
        placeholder="Örn. İş notları"
        confirmLabel="Oluştur"
        onCancel={() => setCreateOpen(false)}
        onConfirm={handleCreate}
      />
      <PromptModal
        visible={Boolean(editTarget)}
        title="Not defterini yeniden adlandır"
        label="Başlık"
        initialValue={editTarget?.title ?? ''}
        onCancel={() => setEditTarget(null)}
        onConfirm={handleEdit}
      />
      <ActionMenuModal
        visible={fabMenuOpen}
        title="Yeni oluştur"
        message="Ne oluşturmak istersiniz?"
        onClose={() => setFabMenuOpen(false)}
        actions={[
          {
            label: 'Not defteri',
            onPress: () => setCreateOpen(true),
          },
          {
            label: 'Not',
            onPress: () => router.push('/note/new' as Href),
          },
        ]}
      />
      <ActionMenuModal
        visible={Boolean(menuTarget)}
        title={menuTarget?.title.trim() || 'Not defteri'}
        message="Ne yapmak istersiniz?"
        onClose={() => setMenuTarget(null)}
        actions={[
          {
            label: 'Yeniden adlandır',
            onPress: () => {
              if (menuTarget) setEditTarget(menuTarget);
            },
          },
          menuTarget?.is_locked
            ? {
                label: 'Şifreyi değiştir',
                onPress: () => {
                  if (menuTarget) openPassword(menuTarget, 'change');
                },
              }
            : {
                label: 'Şifre koy',
                onPress: () => {
                  if (menuTarget) openPassword(menuTarget, 'set');
                },
              },
          ...(menuTarget?.is_locked
            ? [
                {
                  label: 'Kilidi kaldır',
                  onPress: () => {
                    if (menuTarget) openPassword(menuTarget, 'remove');
                  },
                },
              ]
            : []),
          {
            label: 'Sil',
            destructive: true,
            onPress: () => {
              if (menuTarget) setDeleteTarget(menuTarget);
            },
          },
        ]}
      />
      <ConfirmModal
        visible={Boolean(deleteTarget)}
        title="Not defterini sil"
        message="Bu not defteri ve içindeki tüm bölümler ile notlar kalıcı olarak silinecek."
        confirmLabel="Sil"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
      <NotebookPasswordModal
        visible={Boolean(passwordTarget)}
        mode={passwordMode}
        title={passwordTarget?.title}
        loading={passwordLoading}
        error={passwordError}
        onCancel={() => {
          setPasswordTarget(null);
          setPasswordError(null);
        }}
        onConfirm={handlePasswordConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  search: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.ink,
    fontSize: 16,
    paddingVertical: 10,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  loader: {
    marginTop: 40,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
