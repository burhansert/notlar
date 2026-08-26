import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { NoteCard } from '@/components/NoteCard';
import { EmptyState } from '@/components/ui';
import { colors, radius, shadow, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Note } from '@/lib/types';

export default function NotesScreen() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('notes')
      .select('id, user_id, title, content, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      setNotes([]);
    } else {
      setNotes((data as Note[]) ?? []);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (note) =>
        note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q)
    );
  }, [notes, query]);

  return (
    <View style={styles.container}>
      <View style={styles.search}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Notlarda ara"
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
              icon="file-tray-outline"
              title={query ? 'Sonuç yok' : 'Henüz not yok'}
              subtitle={
                query
                  ? 'Farklı bir arama deneyin.'
                  : 'İlk notunuzu oluşturmak için + düğmesine dokunun.'
              }
            />
          }
          renderItem={({ item }) => (
            <NoteCard note={item} onPress={() => router.push(`/note/${item.id}` as Href)} />
          )}
        />
      )}
      <Pressable
        onPress={() => router.push('/note/new' as Href)}
        style={({ pressed }) => [styles.fab, shadow.card, { opacity: pressed ? 0.85 : 1 }]}>
        <Ionicons name="add" size={28} color={colors.white} />
      </Pressable>
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
