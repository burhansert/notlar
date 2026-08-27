import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GlyphSvg } from '@/components/GlyphSvg';
import { TURKISH_LETTERS, type TurkishLetter } from '@/constants/turkish-alphabet';
import { colors, radius, spacing } from '@/constants/theme';
import type { HandwritingGlyph, Stroke } from '@/lib/types';

const PREVIEW_SIZE = 64;

function GlyphPreview({
  letter,
  strokes,
  completed,
}: {
  letter: TurkishLetter;
  strokes?: Stroke[];
  completed: boolean;
}) {
  return (
    <View style={[styles.previewCell, completed ? styles.previewCellDone : null]}>
      {strokes && strokes.length > 0 ? (
        <GlyphSvg strokes={strokes} size={PREVIEW_SIZE} />
      ) : (
        <Text style={styles.previewLetter}>{letter}</Text>
      )}
    </View>
  );
}

export function LetterGrid({
  glyphs,
  onPressLetter,
}: {
  glyphs: HandwritingGlyph[];
  onPressLetter: (letter: TurkishLetter) => void;
}) {
  const glyphMap = useMemo(() => {
    const map = new Map<string, HandwritingGlyph>();
    for (const glyph of glyphs) {
      map.set(glyph.letter, glyph);
    }
    return map;
  }, [glyphs]);

  const completedCount = useMemo(
    () =>
      TURKISH_LETTERS.filter((letter) => {
        const glyph = glyphMap.get(letter);
        return glyph && Array.isArray(glyph.stroke_data) && glyph.stroke_data.length > 0;
      }).length,
    [glyphMap]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Türkçe Alfabe</Text>
        <Text style={styles.subtitle}>
          {completedCount} / {TURKISH_LETTERS.length} harf tamamlandı
        </Text>
      </View>
      <View style={styles.grid}>
        {TURKISH_LETTERS.map((letter) => {
          const glyph = glyphMap.get(letter);
          const strokes = glyph?.stroke_data ?? [];
          const completed = strokes.length > 0;

          return (
            <Pressable
              key={letter}
              onPress={() => onPressLetter(letter)}
              style={({ pressed }) => [
                styles.cell,
                completed ? styles.cellDone : null,
                { opacity: pressed ? 0.85 : 1 },
              ]}>
              <GlyphPreview letter={letter} strokes={strokes} completed={completed} />
              {completed ? null : <Text style={styles.cellLabel}>{letter}</Text>}
              {completed ? <View style={styles.dot} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cell: {
    width: '18%',
    minWidth: 72,
    aspectRatio: 0.9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  cellDone: {
    borderColor: colors.forest,
    backgroundColor: colors.forestSoft,
  },
  cellLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.forest,
  },
  previewCell: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCellDone: {
    opacity: 1,
  },
  previewLetter: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.muted,
  },
});
