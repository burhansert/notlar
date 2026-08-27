import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, shadow, spacing } from '@/constants/theme';
import { formatDateTime, noteCountLabel } from '@/lib/format';
import type { Section } from '@/lib/types';

export function SectionCard({
  section,
  onPress,
  onMenuPress,
}: {
  section: Section;
  onPress: () => void;
  onMenuPress?: () => void;
}) {
  const notes = Number(section.note_count) || 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, shadow.card, { opacity: pressed ? 0.85 : 1 }]}>
      <View style={styles.stripe} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {section.title.trim() || 'Başlıksız bölüm'}
        </Text>
        <Text style={styles.meta}>{noteCountLabel(notes)}</Text>
        <Text style={styles.date}>{formatDateTime(section.updated_at)}</Text>
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
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stripe: {
    width: 6,
    alignSelf: 'stretch',
    backgroundColor: colors.terracotta,
  },
  body: {
    flex: 1,
    padding: spacing.md,
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
