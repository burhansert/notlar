import { Platform, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';
import { NOTE_BODY_FONT_SIZE, NOTE_BODY_LINE_HEIGHT } from '@/lib/notePagination';
import { formatDateTime } from '@/lib/format';
import type { Note } from '@/lib/types';

const WEB_NO_SELECT =
  Platform.OS === 'web'
    ? ({
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      } as object)
    : undefined;

export function NotePageContent({
  note,
  content,
  showHeader,
  width,
  pageHeight,
  bodyMaxHeight,
}: {
  note: Note;
  content: string;
  showHeader: boolean;
  width: number;
  pageHeight: number;
  bodyMaxHeight: number;
}) {
  return (
    <View style={[styles.page, { width, height: pageHeight }]}>
      <View style={styles.inner}>
        {showHeader ? (
          <View style={styles.header}>
            <Text selectable={false} style={styles.title}>
              {note.title.trim() || 'Başlıksız not'}
            </Text>
            <Text selectable={false} style={styles.meta}>
              {formatDateTime(note.updated_at)}
            </Text>
            {note.notebook_title || note.section_title ? (
              <Text selectable={false} style={styles.context}>
                {[note.notebook_title, note.section_title].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </View>
        ) : null}
        <View style={[styles.bodyCard, { height: bodyMaxHeight, maxHeight: bodyMaxHeight }]}>
          <Text selectable={false} style={[styles.body, WEB_NO_SELECT]}>
            {content}
          </Text>
        </View>
      </View>
    </View>
  );
}

export const noteBodyTextStyle = {
  fontSize: NOTE_BODY_FONT_SIZE,
  lineHeight: NOTE_BODY_LINE_HEIGHT,
  color: colors.ink,
};

export function NotePageHeaderMeasure({
  note,
  width,
  onLayout,
}: {
  note: Note;
  width: number;
  onLayout: (height: number) => void;
}) {
  return (
    <View
      style={{ width, paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}
      onLayout={(event) => onLayout(event.nativeEvent.layout.height)}>
      <View style={styles.header}>
        <Text style={styles.title}>{note.title.trim() || 'Başlıksız not'}</Text>
        <Text style={styles.meta}>{formatDateTime(note.updated_at)}</Text>
        {note.notebook_title || note.section_title ? (
          <Text style={styles.context}>
            {[note.notebook_title, note.section_title].filter(Boolean).join(' · ')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.paper,
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.lg,
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
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    overflow: 'hidden',
  },
  body: {
    fontSize: NOTE_BODY_FONT_SIZE,
    lineHeight: NOTE_BODY_LINE_HEIGHT,
    color: colors.ink,
  },
});
