import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadow, spacing } from '@/constants/theme';
import { formatDateTime, noteCountLabel, sectionCountLabel } from '@/lib/format';
import type { Notebook } from '@/lib/types';

export function NotebookCard({
  notebook,
  onPress,
  onMenuPress,
}: {
  notebook: Notebook;
  onPress: () => void;
  onMenuPress?: () => void;
}) {
  const sections = Number(notebook.section_count) || 0;
  const notes = Number(notebook.note_count) || 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, shadow.card, { opacity: pressed ? 0.85 : 1 }]}>
      <View style={styles.iconWrap}>
        <Ionicons name="book-outline" size={22} color={colors.forest} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {notebook.title.trim() || 'Başlıksız not defteri'}
        </Text>
        <Text style={styles.meta}>
          {sectionCountLabel(sections)} · {noteCountLabel(notes)}
        </Text>
        <Text style={styles.date}>{formatDateTime(notebook.updated_at)}</Text>
      </View>
      {onMenuPress ? (
        <Pressable onPress={onMenuPress} hitSlop={12} style={styles.menu}>
          <Ionicons name="ellipsis-vertical" size={18} color={colors.muted} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.forestSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
  },
  meta: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  menu: {
    padding: 4,
  },
});
