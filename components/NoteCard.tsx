import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadow, spacing } from '@/constants/theme';
import { formatDateTime, previewText } from '@/lib/format';
import type { Note } from '@/lib/types';

export function NoteCard({
  note,
  onPress,
  author,
}: {
  note: Note;
  onPress: () => void;
  author?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, shadow.card, { opacity: pressed ? 0.85 : 1 }]}>
      <View style={styles.stripe} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {note.title.trim() || 'Başlıksız not'}
        </Text>
        <Text style={styles.preview} numberOfLines={3}>
          {previewText(note.content) || 'Henüz içerik yok.'}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.date}>{formatDateTime(note.updated_at)}</Text>
          {author ? <Text style={styles.author}>{author}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stripe: {
    width: 6,
    backgroundColor: colors.forest,
  },
  body: {
    flex: 1,
    padding: spacing.md,
    gap: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
  },
  preview: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  meta: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  date: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  author: {
    fontSize: 12,
    color: colors.forest,
    fontWeight: '700',
  },
});
