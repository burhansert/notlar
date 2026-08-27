import { Stack, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { HandwritingNotePager } from '@/components/HandwritingNotePager';
import { HeaderBackButton } from '@/components/HeaderBackButton';
import { colors, spacing } from '@/constants/theme';
import { getNote, listHandwritingGlyphs } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { buildGlyphMap } from '@/lib/handwriting';
import type { Note } from '@/lib/types';

export default function NoteHandwritingViewScreen() {
  const { id, sectionId, notebookId, notebookTitle } = useLocalSearchParams<{
    id: string;
    sectionId?: string;
    notebookId?: string;
    notebookTitle?: string;
  }>();
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

  const [glyphs, setGlyphs] = useState<Awaited<ReturnType<typeof listHandwritingGlyphs>>>([]);

  useEffect(() => {
    if (!session?.token) {
      setGlyphs([]);
      return;
    }

    listHandwritingGlyphs(session.token)
      .then((data) => setGlyphs(data ?? []))
      .catch(() => setGlyphs([]));
  }, [session?.token]);

  const glyphMap = useMemo(() => buildGlyphMap(glyphs), [glyphs]);

  const backHref: Href =
    sectionId && notebookId
      ? (`/notebook/${notebookId}/${sectionId}?notebookTitle=${encodeURIComponent(
          notebookTitle?.trim() || 'Not defteri'
        )}` as Href)
      : ('/(app)/(tabs)' as Href);

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'El yazısı' }} />
        <ActivityIndicator color={colors.forest} size="large" />
      </View>
    );
  }

  if (!note) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'El yazısı' }} />
        <Text style={styles.empty}>Not bulunamadı.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'El yazısı',
          headerLeft: () => <HeaderBackButton fallbackHref={backHref} />,
        }}
      />
      <HandwritingNotePager note={note} glyphMap={glyphMap} />
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
