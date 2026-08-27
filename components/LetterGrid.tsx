import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GlyphSvg } from '@/components/GlyphSvg';
import {
  TURKISH_LETTER_PAIRS,
  TURKISH_LETTERS,
  resolveTurkishLetter,
  type TurkishLetter,
} from '@/constants/turkish-alphabet';
import { colors, radius, spacing } from '@/constants/theme';
import type { HandwritingGlyph, Stroke } from '@/lib/types';

const PREVIEW_SIZE = 44;

function hasStrokes(strokes?: Stroke[]) {
  return Boolean(strokes && strokes.length > 0);
}

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

function LetterCaseCell({
  letter,
  strokes,
  onPress,
}: {
  letter: TurkishLetter;
  strokes?: Stroke[];
  onPress: () => void;
}) {
  const completed = hasStrokes(strokes);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.caseCell,
        completed ? styles.caseCellDone : null,
        { opacity: pressed ? 0.85 : 1 },
      ]}>
      <GlyphPreview letter={letter} strokes={strokes} completed={completed} />
      {completed ? <View style={styles.dot} /> : <Text style={styles.caseLabel}>{letter}</Text>}
    </Pressable>
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
    const map = new Map<TurkishLetter, HandwritingGlyph>();
    for (const glyph of glyphs) {
      const letter = resolveTurkishLetter(glyph.letter);
      if (letter) {
        map.set(letter, glyph);
      }
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
          {completedCount} / {TURKISH_LETTERS.length} harf tamamlandı (küçük + büyük)
        </Text>
      </View>
      <View style={styles.grid}>
        {TURKISH_LETTER_PAIRS.map(({ lower, upper }) => {
          const lowerGlyph = glyphMap.get(lower);
          const upperGlyph = glyphMap.get(upper);
          const pairDone = hasStrokes(lowerGlyph?.stroke_data) && hasStrokes(upperGlyph?.stroke_data);

          return (
            <View key={lower} style={[styles.pairCell, pairDone ? styles.pairCellDone : null]}>
              <LetterCaseCell
                letter={lower}
                strokes={lowerGlyph?.stroke_data}
                onPress={() => onPressLetter(lower)}
              />
              <View style={styles.pairDivider} />
              <LetterCaseCell
                letter={upper}
                strokes={upperGlyph?.stroke_data}
                onPress={() => onPressLetter(upper)}
              />
            </View>
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
  pairCell: {
    width: '30%',
    minWidth: 108,
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  pairCellDone: {
    borderColor: colors.forest,
    backgroundColor: colors.forestSoft,
  },
  pairDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  caseCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  caseCellDone: {
    backgroundColor: 'transparent',
  },
  caseLabel: {
    fontSize: 12,
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
    fontSize: 24,
    fontWeight: '800',
    color: colors.muted,
  },
});
