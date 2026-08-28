import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

import { HeaderBackButton } from '@/components/HeaderBackButton';
import { NoteCard } from '@/components/NoteCard';
import { NotebookSessionGate } from '@/components/NotebookSessionGate';
import { SectionCard } from '@/components/SectionCard';
import { NotebookSectionPicker } from '@/components/NotebookSectionPicker';
import { ActionMenuModal, ConfirmModal, EmptyState, PromptModal } from '@/components/ui';
import { colors, radius, shadow, spacing } from '@/constants/theme';
import {
  createSection,
  deleteSection,
  listSections,
  listSectionsPageNotes,
  updateSection,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { isNotebookLockedError, useNotebookLock } from '@/lib/notebookLock';
import type { Notebook, Note, Section } from '@/lib/types';

type ListItem =
  | { kind: 'section'; id: string; section: Section }
  | { kind: 'note'; id: string; note: Note };

export default function SectionsScreen() {
  const { notebookId, title } = useLocalSearchParams<{ notebookId: string; title?: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const { markProtected, needsUnlock } = useNotebookLock();
  const [sections, setSections] = useState<Section[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Section | null>(null);
  const [menuTarget, setMenuTarget] = useState<Section | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Section | null>(null);
  const [moveTarget, setMoveTarget] = useState<Section | null>(null);
  const [fabMenuOpen, setFabMenuOpen] = useState(false);

  const notebookTitle = title?.trim() || 'Not defteri';

  const load = useCallback(async () => {
    if (!session?.token || !notebookId) {
      setSections([]);
      setNotes([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const [sectionData, noteData] = await Promise.all([
        listSections(session.token, notebookId),
        listSectionsPageNotes(session.token, notebookId),
      ]);
      setSections(sectionData ?? []);
      setNotes(noteData ?? []);
    } catch (err) {
      if (isNotebookLockedError(err)) markProtected(notebookId, true);
      setSections([]);
      setNotes([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [markProtected, notebookId, session?.token]);

  const locked = needsUnlock(notebookId);

  useEffect(() => {
    if (!locked) load();
  }, [load, locked]);

  const listItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items: ListItem[] = [];

    for (const section of sections) {
      if (q && !section.title.toLowerCase().includes(q)) continue;
      items.push({ kind: 'section', id: `section-${section.id}`, section });
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
  }, [notes, query, sections]);

  const sectionHeaderIndex = useMemo(
    () => listItems.findIndex((entry) => entry.kind === 'section'),
    [listItems]
  );
  const noteHeaderIndex = useMemo(
    () => listItems.findIndex((entry) => entry.kind === 'note'),
    [listItems]
  );
  const hasSections = listItems.some((entry) => entry.kind === 'section');
  const hasNotes = listItems.some((entry) => entry.kind === 'note');

  async function handleCreate(sectionTitle: string) {
    if (!session?.token || !notebookId) return;
    setCreateOpen(false);
    try {
      await createSection(session.token, notebookId, sectionTitle);
      load();
    } catch (err) {
      Alert.alert('Oluşturulamadı', err instanceof Error ? err.message : 'Bilinmeyen hata');
    }
  }

  async function handleEdit(sectionTitle: string) {
    if (!session?.token || !editTarget) return;
    const target = editTarget;
    setEditTarget(null);
    try {
      await updateSection(session.token, target.id, sectionTitle);
      load();
    } catch (err) {
      Alert.alert('Güncellenemedi', err instanceof Error ? err.message : 'Bilinmeyen hata');
    }
  }

  async function handleMove(notebook: Notebook) {
    if (!session?.token || !moveTarget || !notebookId) return;
    const target = moveTarget;
    setMoveTarget(null);
    try {
      await updateSection(session.token, target.id, target.title, undefined, notebook.id);
      load();
    } catch (err) {
      Alert.alert('Taşınamadı', err instanceof Error ? err.message : 'Bilinmeyen hata');
    }
  }

  function openMenu(section: Section) {
    setMenuTarget(section);
  }

  function openFabMenu() {
    setFabMenuOpen(true);
  }

  async function handleDelete() {
    if (!session?.token || !deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteSection(session.token, target.id);
      load();
    } catch (err) {
      Alert.alert('Silinemedi', err instanceof Error ? err.message : 'Bilinmeyen hata');
    }
  }

  return (
    <NotebookSessionGate
      notebookId={notebookId}
      title={notebookTitle}
      onCancelUnlock={() => router.back()}>
      <View style={styles.container}>
      <Stack.Screen
        options={{
          title: notebookTitle,
          headerLeft: () => <HeaderBackButton fallbackHref="/(tabs)" />,
        }}
      />
      <View style={styles.search}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Bölümler ve notlarda ara"
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
              icon="layers-outline"
              title={query ? 'Sonuç yok' : 'Henüz bölüm veya not yok'}
              subtitle={
                query
                  ? 'Farklı bir arama deneyin.'
                  : 'İlk bölümünüzü veya notunuzu oluşturmak için + düğmesine dokunun.'
              }
            />
          }
          renderItem={({ item, index }) => {
            const showSectionHeader = item.kind === 'section' && index === sectionHeaderIndex;
            const showNoteHeader = item.kind === 'note' && index === noteHeaderIndex;

            return (
              <View style={styles.itemGroup}>
                {showSectionHeader && hasSections ? (
                  <Text style={styles.sectionLabel}>Bölümler</Text>
                ) : null}
                {showNoteHeader && hasNotes ? (
                  <Text style={styles.sectionLabel}>Notlar</Text>
                ) : null}
                {item.kind === 'section' ? (
                  <SectionCard
                    section={item.section}
                    onPress={() =>
                      router.push(
                        `/notebook/${notebookId}/${item.section.id}?notebookTitle=${encodeURIComponent(notebookTitle)}&sectionTitle=${encodeURIComponent(item.section.title)}` as Href
                      )
                    }
                    onMenuPress={() => openMenu(item.section)}
                  />
                ) : (
                  <NoteCard
                    note={item.note}
                    onPress={() => router.push(`/note/${item.note.id}` as Href)}
                    onHandwritingPress={() =>
                      router.push(
                        `/note/handwriting/${item.note.id}?sectionId=${item.note.section_id}&notebookId=${notebookId}&notebookTitle=${encodeURIComponent(notebookTitle)}` as Href
                      )
                    }
                    onViewPress={() =>
                      router.push(
                        `/note/view/${item.note.id}?sectionId=${item.note.section_id}&notebookId=${notebookId}&notebookTitle=${encodeURIComponent(notebookTitle)}` as Href
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
        title="Yeni bölüm"
        label="Başlık"
        placeholder="Örn. Toplantılar"
        confirmLabel="Oluştur"
        onCancel={() => setCreateOpen(false)}
        onConfirm={handleCreate}
      />
      <PromptModal
        visible={Boolean(editTarget)}
        title="Bölümü yeniden adlandır"
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
            label: 'Bölüm',
            onPress: () => setCreateOpen(true),
          },
          {
            label: 'Not',
            onPress: () => router.push(`/note/new?notebookId=${notebookId}` as Href),
          },
        ]}
      />
      <ActionMenuModal
        visible={Boolean(menuTarget)}
        title={menuTarget?.title.trim() || 'Bölüm'}
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
            label: 'Not defterine taşı',
            onPress: () => {
              if (menuTarget) setMoveTarget(menuTarget);
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
        title="Bölümü sil"
        message="Bu bölüm ve içindeki tüm notlar kalıcı olarak silinecek."
        confirmLabel="Sil"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
      {session?.token ? (
        <NotebookSectionPicker
          visible={Boolean(moveTarget)}
          mode="notebook"
          token={session.token}
          excludeNotebookId={notebookId}
          onSelectNotebook={handleMove}
          onSelectSection={() => {}}
          onCancel={() => setMoveTarget(null)}
        />
      ) : null}
      </View>
    </NotebookSessionGate>
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
