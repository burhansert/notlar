import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HandwritingIcon } from '@/components/HandwritingIcon';
import { colors, radius, shadow, spacing } from '@/constants/theme';
import { formatDateTime, previewText } from '@/lib/format';
import type { Note } from '@/lib/types';

export function NoteCard({
  note,
  onPress,
  onViewPress,
  onHandwritingPress,
  author,
}: {
  note: Note;
  onPress: () => void;
  onViewPress?: () => void;
  onHandwritingPress?: () => void;
  author?: string;
}) {
  return (
    <View style={[styles.card, shadow.card]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.main, { opacity: pressed ? 0.85 : 1 }]}>
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
          {note.notebook_title || note.section_title ? (
            <Text style={styles.context} numberOfLines={1}>
              {[note.notebook_title, note.section_title].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {onHandwritingPress || onViewPress ? (
        <View style={styles.actions}>
          {onHandwritingPress ? (
            <Pressable
              onPress={onHandwritingPress}
              hitSlop={12}
              style={({ pressed }) => [styles.actionButton, { opacity: pressed ? 0.7 : 1 }]}>
              <HandwritingIcon size={22} />
            </Pressable>
          ) : null}
          {onViewPress ? (
            <Pressable
              onPress={onViewPress}
              hitSlop={12}
              style={({ pressed }) => [styles.actionButton, { opacity: pressed ? 0.7 : 1 }]}>
              <Ionicons name="eye" size={22} color={colors.ink} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  stripe: {
    width: 6,
    backgroundColor: colors.forest,
    alignSelf: 'stretch',
  },
  body: {
    flex: 1,
    padding: spacing.md,
    gap: 6,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: spacing.md,
    justifyContent: 'center',
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
  context: {
    fontSize: 12,
    color: colors.terracotta,
    fontWeight: '700',
    marginTop: 2,
  },
});
