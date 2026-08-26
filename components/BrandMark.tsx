import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/constants/theme';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.stack}>
        <View style={[styles.sheet, styles.sheetBack]} />
        <View style={[styles.sheet, styles.sheetMid]} />
        <View style={styles.sheetFront}>
          <View style={styles.line} />
          <View style={[styles.line, { width: '72%' }]} />
          <View style={[styles.line, { width: '54%' }]} />
        </View>
      </View>
      {compact ? null : (
        <View>
          <Text style={styles.wordmark}>Notlar</Text>
          <Text style={styles.tagline}>Notlarınız, yalnızca sizin.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.md,
  },
  stack: {
    width: 72,
    height: 72,
  },
  sheet: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.paperDark,
  },
  sheetBack: {
    top: 6,
    transform: [{ rotate: '-8deg' }],
  },
  sheetMid: {
    top: 12,
    transform: [{ rotate: '6deg' }],
    backgroundColor: colors.terracottaSoft,
  },
  sheetFront: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 16,
    height: 46,
    borderRadius: radius.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    gap: 5,
  },
  line: {
    height: 4,
    width: '88%',
    borderRadius: 2,
    backgroundColor: colors.paperDark,
  },
  wordmark: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  tagline: {
    marginTop: 4,
    textAlign: 'center',
    color: colors.muted,
    fontSize: 15,
  },
});
