import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { listNotebooks, listSections } from '@/lib/api';
import type { Notebook, Section } from '@/lib/types';

type PickerMode = 'notebook' | 'section';

export function NotebookSectionPicker({
  visible,
  mode,
  token,
  excludeNotebookId,
  selectedNotebookId,
  selectedSectionId,
  onSelectNotebook,
  onSelectSection,
  onCancel,
}: {
  visible: boolean;
  mode: PickerMode;
  token: string;
  excludeNotebookId?: string;
  selectedNotebookId?: string;
  selectedSectionId?: string;
  onSelectNotebook: (notebook: Notebook) => void;
  onSelectSection: (notebook: Notebook, section: Section) => void;
  onCancel: () => void;
}) {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeNotebook, setActiveNotebook] = useState<Notebook | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);

  useEffect(() => {
    if (!visible) {
      setActiveNotebook(null);
      setSections([]);
      return;
    }

    setLoading(true);
    listNotebooks(token)
      .then((data) => {
        const filtered =
          excludeNotebookId != null
            ? data.filter((notebook) => notebook.id !== excludeNotebookId)
            : data;
        setNotebooks(filtered);
      })
      .catch(() => setNotebooks([]))
      .finally(() => setLoading(false));
  }, [visible, token, excludeNotebookId]);

  useEffect(() => {
    if (!visible || mode !== 'section' || !activeNotebook) {
      setSections([]);
      return;
    }

    setLoadingSections(true);
    listSections(token, activeNotebook.id)
      .then((data) => setSections(data))
      .catch(() => setSections([]))
      .finally(() => setLoadingSections(false));
  }, [visible, mode, activeNotebook, token]);

  function handleNotebookPress(notebook: Notebook) {
    if (mode === 'notebook') {
      onSelectNotebook(notebook);
      return;
    }
    setActiveNotebook(notebook);
  }

  function handleSectionPress(section: Section) {
    if (!activeNotebook) return;
    onSelectSection(activeNotebook, section);
  }

  const title =
    mode === 'notebook'
      ? 'Not defteri seç'
      : activeNotebook
        ? 'Bölüm seç'
        : 'Not defteri seç';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}>
            {mode === 'section' && activeNotebook ? (
              <Pressable onPress={() => setActiveNotebook(null)} hitSlop={8} style={styles.back}>
                <Ionicons name="chevron-back" size={22} color={colors.forest} />
              </Pressable>
            ) : null}
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onCancel} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>

          {mode === 'section' && activeNotebook ? (
            <Text style={styles.subtitle}>{activeNotebook.title}</Text>
          ) : null}

          {loading || loadingSections ? (
            <ActivityIndicator color={colors.forest} style={styles.loader} />
          ) : mode === 'section' && activeNotebook ? (
            <FlatList
              data={sections}
              keyExtractor={(item) => item.id}
              style={styles.list}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={<Text style={styles.empty}>Bu not defterinde bölüm yok.</Text>}
              renderItem={({ item }) => {
                const selected = item.id === selectedSectionId;
                return (
                  <Pressable
                    onPress={() => handleSectionPress(item)}
                    style={({ pressed }) => [
                      styles.row,
                      selected ? styles.rowSelected : null,
                      { opacity: pressed ? 0.85 : 1 },
                    ]}>
                    <Ionicons name="layers-outline" size={18} color={colors.forest} />
                    <Text style={styles.rowLabel}>{item.title}</Text>
                    {selected ? (
                      <Ionicons name="checkmark" size={18} color={colors.forest} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          ) : (
            <FlatList
              data={notebooks}
              keyExtractor={(item) => item.id}
              style={styles.list}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={<Text style={styles.empty}>Kullanılabilir not defteri yok.</Text>}
              renderItem={({ item }) => {
                const selected = item.id === selectedNotebookId;
                return (
                  <Pressable
                    onPress={() => handleNotebookPress(item)}
                    style={({ pressed }) => [
                      styles.row,
                      selected ? styles.rowSelected : null,
                      { opacity: pressed ? 0.85 : 1 },
                    ]}>
                    <Ionicons name="book-outline" size={18} color={colors.forest} />
                    <Text style={styles.rowLabel}>{item.title}</Text>
                    {mode === 'section' ? (
                      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                    ) : selected ? (
                      <Ionicons name="checkmark" size={18} color={colors.forest} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    maxHeight: '80%',
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  back: {
    marginRight: 2,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 24,
  },
  list: {
    maxHeight: 360,
  },
  separator: {
    height: 8,
  },
  row: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowSelected: {
    borderColor: colors.forest,
    backgroundColor: colors.forestSoft,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  empty: {
    textAlign: 'center',
    color: colors.muted,
    paddingVertical: 24,
    fontSize: 14,
  },
});
