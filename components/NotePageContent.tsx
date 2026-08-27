import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { formatDateTime } from '@/lib/format';
import type { Note } from '@/lib/types';

export function NotePageContent({ note }: { note: Note }) {
  const { width, height } = useWindowDimensions();

  return (
    <View style={[styles.page, { width }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { minHeight: height - 120 }]}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{note.title.trim() || 'Başlıksız not'}</Text>
        <Text style={styles.meta}>{formatDateTime(note.updated_at)}</Text>
        {note.notebook_title || note.section_title ? (
          <Text style={styles.context}>
            {[note.notebook_title, note.section_title].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
        <View style={styles.bodyCard}>
          <Text style={styles.body}>
            {note.content.trim() || 'Henüz içerik yok.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.ink,
    lineHeight: 34,
  },
  meta: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
  },
  context: {
    fontSize: 13,
    color: colors.terracotta,
    fontWeight: '700',
  },
  bodyCard: {
    marginTop: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flex: 1,
  },
  body: {
    fontSize: 17,
    lineHeight: 28,
    color: colors.ink,
  },
});
