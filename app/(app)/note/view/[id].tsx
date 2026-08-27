import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { HeaderBackButton } from '@/components/HeaderBackButton';
import { NotePagePager } from '@/components/NotePagePager';
import { colors, spacing } from '@/constants/theme';
import { getNote } from '@/lib/api';
import { useAuth } from '@/lib/auth';
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

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session?.token || !id) {
      setNote(null);
      setLoading(false);
      return;
    }

    try {
      const data = await getNote(session.token, id);
      setNote(data);
    } catch {
      setNote(null);
    }

    setLoading(false);
  }, [id, session?.token]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Sayfa görünümü' }} />
        <ActivityIndicator color={colors.forest} size="large" />
      </View>
    );
  }

  if (!note) {
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
          headerRight: () => (
            <Pressable
              onPress={() => router.push(`/note/${note.id}` as Href)}
              hitSlop={12}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginRight: 4 }]}>
              <Ionicons name="create-outline" size={22} color={colors.forest} />
            </Pressable>
          ),
        }}
      />
      <NotePagePager note={note} />
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
});
