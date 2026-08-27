import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { HeaderBackButton } from '@/components/HeaderBackButton';
import { NotePageContent } from '@/components/NotePageContent';
import { colors, spacing } from '@/constants/theme';
import { adminListNotes, getNote, listNotes } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Note } from '@/lib/types';

function orderNotes(notes: Note[], noteIds?: string[]) {
  if (!noteIds?.length) return notes;
  const map = new Map(notes.map((note) => [note.id, note]));
  return noteIds.map((noteId) => map.get(noteId)).filter((note): note is Note => Boolean(note));
}

export default function NotePageViewScreen() {
  const { id, sectionId, notebookId, notebookTitle, noteIds: noteIdsParam, scope } = useLocalSearchParams<{
    id: string;
    sectionId?: string;
    notebookId?: string;
    notebookTitle?: string;
    noteIds?: string;
    scope?: string;
  }>();
  const router = useRouter();
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Note>>(null);

  const noteIds = useMemo(
    () => (noteIdsParam ? noteIdsParam.split(',').filter(Boolean) : undefined),
    [noteIdsParam]
  );

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  const load = useCallback(async () => {
    if (!session?.token || !id) {
      setNotes([]);
      setLoading(false);
      return;
    }

    try {
      let loaded: Note[] = [];
      if (sectionId) {
        loaded = await listNotes(session.token, sectionId);
      } else if (scope === 'admin') {
        loaded = await adminListNotes(session.token);
      } else {
        loaded = [await getNote(session.token, id)];
      }

      const ordered = orderNotes(loaded, noteIds);
      setNotes(ordered.length ? ordered : loaded);
    } catch {
      try {
        const note = await getNote(session.token, id);
        setNotes([note]);
      } catch {
        setNotes([]);
      }
    }

    setLoading(false);
  }, [id, noteIds, scope, sectionId, session?.token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notes.length || !id) return;
    const index = notes.findIndex((note) => note.id === id);
    if (index >= 0) {
      setCurrentIndex(index);
      if (index > 0) {
        requestAnimationFrame(() => {
          listRef.current?.scrollToIndex({ index, animated: false });
        });
      }
    }
  }, [id, notes]);

  const currentNote = notes[currentIndex];

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    if (nextIndex >= 0 && nextIndex < notes.length) {
      setCurrentIndex(nextIndex);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Sayfa görünümü' }} />
        <ActivityIndicator color={colors.forest} size="large" />
      </View>
    );
  }

  if (!notes.length) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Sayfa görünümü' }} />
        <Text style={styles.empty}>Not bulunamadı.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: currentNote?.title.trim() || 'Başlıksız not',
          headerLeft: () => (
            <HeaderBackButton
              fallbackHref={
                sectionId && notebookId
                  ? (`/notebook/${notebookId}/${sectionId}?notebookTitle=${encodeURIComponent(
                      notebookTitle?.trim() || 'Not defteri'
                    )}` as Href)
                  : ('/(app)/(tabs)' as Href)
              }
            />
          ),
          headerRight: () =>
            currentNote ? (
              <Pressable
                onPress={() => router.push(`/note/${currentNote.id}` as Href)}
                hitSlop={12}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginRight: 4 }]}>
                <Ionicons name="create-outline" size={22} color={colors.forest} />
              </Pressable>
            ) : null,
        }}
      />

      {notes.length > 1 ? (
        <View style={styles.indicator}>
          <Text style={styles.indicatorText}>
            {currentIndex + 1} / {notes.length}
          </Text>
          <Text style={styles.hint}>Yatay kaydırarak diğer notları okuyun</Text>
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        data={notes}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        initialScrollIndex={Math.max(0, notes.findIndex((note) => note.id === id))}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollToIndexFailed={(info) => {
          requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({
              offset: info.averageItemLength * info.index,
              animated: false,
            });
          });
        }}
        renderItem={({ item }) => <NotePageContent note={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
    padding: spacing.lg,
  },
  empty: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '600',
  },
  indicator: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    gap: 2,
  },
  indicatorText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.forest,
  },
  hint: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
});
