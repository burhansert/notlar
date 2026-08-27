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
import { ActionMenuModal, ConfirmModal, EmptyState, PromptModal } from '@/components/ui';
import { colors, radius, shadow, spacing } from '@/constants/theme';
import { createNotebook, deleteNotebook, listNotebooks, updateNotebook } from '@/lib/api';
import { useAuth } from '@/lib/auth';
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
    } catch {
      setNotebooks([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [session?.token]);

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

  function openMenu(notebook: Notebook) {
    setMenuTarget(notebook);
  }

  function openFabMenu() {
    Alert.alert('Yeni oluştur', 'Ne oluşturmak istersiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Not defteri', onPress: () => setCreateOpen(true) },
      { text: 'Not', onPress: () => router.push('/note/new' as Href) },
    ]);
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
              onPress={() =>
                router.push(
                  `/notebook/${item.id}?title=${encodeURIComponent(item.title)}` as Href
                )
              }
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
