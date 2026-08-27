import { Platform, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { NOTE_BODY_FONT_SIZE, NOTE_BODY_LINE_HEIGHT } from '@/lib/notePagination';
import { formatDateTime } from '@/lib/format';
import type { Note } from '@/lib/types';

export function NotePageContent({
  note,
  content,
  showHeader,
  width,
}: {
  note: Note;
  content: string;
  showHeader: boolean;
  width: number;
}) {
  return (
    <View style={[styles.page, { width }]}>
      <View style={styles.inner}>
        {showHeader ? (
          <View style={styles.header}>
            <Text selectable={false} style={styles.title}>{note.title.trim() || 'Başlıksız not'}</Text>
            <Text selectable={false} style={styles.meta}>{formatDateTime(note.updated_at)}</Text>
            {note.notebook_title || note.section_title ? (
              <Text selectable={false} style={styles.context}>
                {[note.notebook_title, note.section_title].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </View>
        ) : null}
        <View style={[styles.bodyCard, !showHeader && styles.bodyCardFull]}>
          <Text selectable={false} style={[styles.body, Platform.OS === 'web' && styles.bodyWeb]}>
            {content}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  inner: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: {
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
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  bodyCardFull: {
    marginTop: 0,
  },
  body: {
    fontSize: NOTE_BODY_FONT_SIZE,
    lineHeight: NOTE_BODY_LINE_HEIGHT,
    color: colors.ink,
  },
  bodyWeb: {
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
  } as object,
});
