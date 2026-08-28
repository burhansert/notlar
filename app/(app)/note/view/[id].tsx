import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { HeaderBackButton } from '@/components/HeaderBackButton';
import { NotebookLockCountdown } from '@/components/NotebookLockCountdown';
import { NotebookSessionGate } from '@/components/NotebookSessionGate';
import { NotePagePager } from '@/components/NotePagePager';
import { colors, spacing } from '@/constants/theme';
import { getNote } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { isNotebookLockedError, useNotebookLock } from '@/lib/notebookLock';
import type { Note } from '@/lib/types';

export default function NotePageViewScreen() {
  const { id, sectionId, notebookId, notebookTitle } = useLocalSearchParams<{
    id: string;
    sectionId?: string;
    notebookId?: string;
    notebookTitle?: string;
  }>();
  const router = useRouter();
  const { session } = useAuth();
  const { markProtected, needsUnlock } = useNotebookLock();
  const locked = needsUnlock(notebookId);

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session?.token || !id || locked) {
      setNote((current) => current);
      setLoading(false);
      return;
    }

    try {
      const data = await getNote(session.token, id);
      setNote(data);
    } catch (err) {
      if (isNotebookLockedError(err) && notebookId) markProtected(notebookId, true);
      else setNote(null);
    }

    setLoading(false);
  }, [id, locked, markProtected, notebookId, session?.token]);

  useEffect(() => {
    load();
  }, [load]);

  const activeNotebookId = notebookId || note?.notebook_id;

  let content;
  if (loading) {
    content = (
      <View style={styles.center}>
        <Stack.Screen
          options={{
            title: 'Sayfa görünümü',
            headerRight: () => <NotebookLockCountdown notebookId={activeNotebookId} />,
          }}
        />
        <ActivityIndicator color={colors.forest} size="large" />
      </View>
    );
  } else if (!note) {
    content = (
      <View style={styles.center}>
        <Stack.Screen
          options={{
            title: 'Sayfa görünümü',
            headerRight: () => <NotebookLockCountdown notebookId={activeNotebookId} />,
          }}
        />
        <Text style={styles.empty}>Not bulunamadı.</Text>
      </View>
    );
  } else {
    content = (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            title: note.title.trim() || 'Başlıksız not',
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
            headerRight: () => {
              const params = new URLSearchParams();
              if (sectionId) params.set('sectionId', sectionId);
              if (activeNotebookId) params.set('notebookId', activeNotebookId);
              if (notebookTitle) params.set('notebookTitle', notebookTitle);
              const query = params.toString();
              return (
                <View style={styles.headerRight}>
                  <NotebookLockCountdown notebookId={activeNotebookId} />
                  <Pressable
                    onPress={() => router.push(`/note/${note.id}${query ? `?${query}` : ''}` as Href)}
                    hitSlop={12}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                    <Ionicons name="create-outline" size={22} color={colors.forest} />
                  </Pressable>
                </View>
              );
            },
          }}
        />
        <NotePagePager note={note} notebookId={activeNotebookId} />
      </View>
    );
  }

  return (
    <NotebookSessionGate
      notebookId={notebookId}
      title={notebookTitle?.trim() || 'Not defteri'}>
      {content}
    </NotebookSessionGate>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 4,
  },
});
