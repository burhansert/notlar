import { Stack, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HandwritingTextPreview } from '@/components/HandwritingTextPreview';
import { HeaderBackButton } from '@/components/HeaderBackButton';
import { colors, radius, spacing } from '@/constants/theme';
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

  const title = note.title.trim() || 'Başlıksız not';
  const content = note.content.trim() || 'Henüz içerik yok.';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'El yazısı',
          headerLeft: () => <HeaderBackButton fallbackHref={backHref} />,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.bodyCard}>
          <HandwritingTextPreview text={content} glyphMap={glyphMap} />
        </View>
      </ScrollView>
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
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: 120,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.ink,
    lineHeight: 34,
  },
  bodyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 120,
  },
});
