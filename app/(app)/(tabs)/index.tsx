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
  Text,
  TextInput,
  View,
} from 'react-native';

import { NoteCard } from '@/components/NoteCard';
import { NotebookCard } from '@/components/NotebookCard';
import { NotebookPasswordModal, type NotebookPasswordMode } from '@/components/NotebookPasswordModal';
import { ActionMenuModal, ConfirmModal, EmptyState, PromptModal } from '@/components/ui';
import { colors, radius, shadow, spacing } from '@/constants/theme';
import {
  createNotebook,
  deleteNotebook,
  listNotebookPageNotes,
  listNotebooks,
  updateNotebook,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useNotebookLock } from '@/lib/notebookLock';
import type { Note, Notebook } from '@/lib/types';

type ListItem =
  | { kind: 'notebook'; id: string; notebook: Notebook }
  | { kind: 'note'; id: string; note: Note };

export default function NotebooksScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
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
      setNotes([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const [notebookData, noteData] = await Promise.all([
        listNotebooks(session.token),
        listNotebookPageNotes(session.token),
      ]);
      setNotebooks(notebookData ?? []);
      setNotes(noteData ?? []);
      syncNotebooks(notebookData ?? []);
    } catch {
      setNotebooks([]);
      setNotes([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [session?.token, syncNotebooks]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const listItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items: ListItem[] = [];

    for (const notebook of notebooks) {
      if (q && !notebook.title.toLowerCase().includes(q)) continue;
      items.push({ kind: 'notebook', id: `notebook-${notebook.id}`, notebook });
    }

    for (const note of notes) {
      if (
        q &&
        !note.title.toLowerCase().includes(q) &&
        !note.content.toLowerCase().includes(q)
      ) {
        continue;
      }
      items.push({ kind: 'note', id: `note-${note.id}`, note });
    }

    return items;
  }, [notebooks, notes, query]);

  const notebookHeaderIndex = useMemo(
    () => listItems.findIndex((entry) => entry.kind === 'notebook'),
    [listItems]
  );
  const noteHeaderIndex = useMemo(
    () => listItems.findIndex((entry) => entry.kind === 'note'),
    [listItems]
  );
  const hasNotebooks = listItems.some((entry) => entry.kind === 'notebook');
  const hasNotes = listItems.some((entry) => entry.kind === 'note');

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
          placeholder="Not defterleri ve notlarda ara"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
        />
      </View>
      {loading ? (
        <ActivityIndicator color={colors.forest} style={styles.loader} />
      ) : (
        <FlatList
          data={listItems}
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
              title={query ? 'Sonuç yok' : 'Henüz not defteri veya not yok'}
              subtitle={
                query
                  ? 'Farklı bir arama deneyin.'
                  : 'İlk not defterinizi veya notunuzu oluşturmak için + düğmesine dokunun.'
              }
            />
          }
          renderItem={({ item, index }) => {
            const showNotebookHeader = item.kind === 'notebook' && index === notebookHeaderIndex;
            const showNoteHeader = item.kind === 'note' && index === noteHeaderIndex;

            return (
              <View style={styles.itemGroup}>
                {showNotebookHeader && hasNotebooks ? (
                  <Text style={styles.sectionLabel}>Not Defterleri</Text>
                ) : null}
                {showNoteHeader && hasNotes ? (
                  <Text style={styles.sectionLabel}>Notlar</Text>
                ) : null}
                {item.kind === 'notebook' ? (
                  <NotebookCard
                    notebook={item.notebook}
                    onPress={() => openNotebook(item.notebook)}
                    onMenuPress={() => openMenu(item.notebook)}
                  />
                ) : (
                  <NoteCard
                    note={item.note}
                    onPress={() => router.push(`/note/${item.note.id}` as Href)}
                    onHandwritingPress={() =>
                      router.push(
                        `/note/handwriting/${item.note.id}?sectionId=${item.note.section_id}&notebookId=${item.note.notebook_id ?? ''}` as Href
                      )
                    }
                    onViewPress={() =>
                      router.push(
                        `/note/view/${item.note.id}?sectionId=${item.note.section_id}&notebookId=${item.note.notebook_id ?? ''}` as Href
                      )
                    }
                  />
                )}
              </View>
            );
          }}
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
  itemGroup: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
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
