import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
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

import { HeaderBackButton } from '@/components/HeaderBackButton';
import { SectionCard } from '@/components/SectionCard';
import { EmptyState, PromptModal } from '@/components/ui';
import { colors, radius, shadow, spacing } from '@/constants/theme';
import { createSection, deleteSection, listSections, updateSection } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Section } from '@/lib/types';

export default function SectionsScreen() {
  const { notebookId, title } = useLocalSearchParams<{ notebookId: string; title?: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Section | null>(null);

  const notebookTitle = title?.trim() || 'Not defteri';

  const load = useCallback(async () => {
    if (!session?.token || !notebookId) {
      setSections([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await listSections(session.token, notebookId);
      setSections(data ?? []);
    } catch {
      setSections([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [notebookId, session?.token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter((section) => section.title.toLowerCase().includes(q));
  }, [query, sections]);

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

  function openMenu(section: Section) {
    Alert.alert(section.title.trim() || 'Bölüm', 'Ne yapmak istersiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Yeniden adlandır', onPress: () => setEditTarget(section) },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => confirmDelete(section),
      },
    ]);
  }

  function confirmDelete(section: Section) {
    Alert.alert(
      'Bölümü sil',
      'Bu bölüm ve içindeki tüm notlar kalıcı olarak silinecek.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            if (!session?.token) return;
            try {
              await deleteSection(session.token, section.id);
              load();
            } catch (err) {
              Alert.alert('Silinemedi', err instanceof Error ? err.message : 'Bilinmeyen hata');
            }
          },
        },
      ]
    );
  }

  return (
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
          placeholder="Bölümlerde ara"
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
              icon="layers-outline"
              title={query ? 'Sonuç yok' : 'Henüz bölüm yok'}
              subtitle={
                query
                  ? 'Farklı bir arama deneyin.'
                  : 'İlk bölümünüzü oluşturmak için + düğmesine dokunun.'
              }
            />
          }
          renderItem={({ item }) => (
            <SectionCard
              section={item}
              onPress={() =>
                router.push(
                  `/notebook/${notebookId}/${item.id}?notebookTitle=${encodeURIComponent(notebookTitle)}&sectionTitle=${encodeURIComponent(item.title)}` as Href
                )
              }
              onMenuPress={() => openMenu(item)}
            />
          )}
        />
      )}
      <Pressable
        onPress={() => setCreateOpen(true)}
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
