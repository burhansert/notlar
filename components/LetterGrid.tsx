import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GlyphSvg } from '@/components/GlyphSvg';
import {
  HANDWRITING_CHARACTERS,
  HANDWRITING_DIGITS,
  HANDWRITING_SYMBOLS,
  TURKISH_LETTER_PAIRS,
  resolveHandwritingCharacter,
  type HandwritingCharacter,
  type TurkishLetter,
} from '@/constants/turkish-alphabet';
import { colors, radius, spacing } from '@/constants/theme';
import type { HandwritingGlyph, Stroke } from '@/lib/types';

const PREVIEW_SIZE = 44;

function hasStrokes(strokes?: Stroke[]) {
  return Boolean(strokes && strokes.length > 0);
}

function GlyphPreview({
  character,
  strokes,
  completed,
}: {
  character: HandwritingCharacter;
  strokes?: Stroke[];
  completed: boolean;
}) {
  return (
    <View style={[styles.previewCell, completed ? styles.previewCellDone : null]}>
      {strokes && strokes.length > 0 ? (
        <GlyphSvg strokes={strokes} size={PREVIEW_SIZE} />
      ) : (
        <Text style={styles.previewCharacter}>{character}</Text>
      )}
    </View>
  );
}

function CharacterCell({
  character,
  strokes,
  onPress,
  compact,
}: {
  character: HandwritingCharacter;
  strokes?: Stroke[];
  onPress: () => void;
  compact?: boolean;
}) {
  const completed = hasStrokes(strokes);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        compact ? styles.compactCell : styles.singleCell,
        completed ? styles.cellDone : null,
        { opacity: pressed ? 0.85 : 1 },
      ]}>
      <GlyphPreview character={character} strokes={strokes} completed={completed} />
      {completed ? <View style={styles.dot} /> : <Text style={styles.cellLabel}>{character}</Text>}
    </Pressable>
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
      <GlyphPreview character={letter} strokes={strokes} completed={completed} />
      {completed ? <View style={styles.dot} /> : <Text style={styles.caseLabel}>{letter}</Text>}
    </Pressable>
  );
}

export function LetterGrid({
  glyphs,
  onPressCharacter,
}: {
  glyphs: HandwritingGlyph[];
  onPressCharacter: (character: HandwritingCharacter) => void;
}) {
  const glyphMap = useMemo(() => {
    const map = new Map<HandwritingCharacter, HandwritingGlyph>();
    for (const glyph of glyphs) {
      const character = resolveHandwritingCharacter(glyph.letter);
      if (character) {
        map.set(character, glyph);
      }
    }
    return map;
  }, [glyphs]);

  const completedCount = useMemo(
    () =>
      HANDWRITING_CHARACTERS.filter((character) => {
        const glyph = glyphMap.get(character);
        return glyph && Array.isArray(glyph.stroke_data) && glyph.stroke_data.length > 0;
      }).length,
    [glyphMap]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Karakterler</Text>
        <Text style={styles.subtitle}>
          {completedCount} / {HANDWRITING_CHARACTERS.length} karakter tamamlandı
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Türkçe Alfabe</Text>
        <View style={styles.grid}>
          {TURKISH_LETTER_PAIRS.map(({ lower, upper }) => {
            const lowerGlyph = glyphMap.get(lower);
            const upperGlyph = glyphMap.get(upper);
            const pairDone =
              hasStrokes(lowerGlyph?.stroke_data) && hasStrokes(upperGlyph?.stroke_data);

            return (
              <View key={lower} style={[styles.pairCell, pairDone ? styles.pairCellDone : null]}>
                <LetterCaseCell
                  letter={lower}
                  strokes={lowerGlyph?.stroke_data}
                  onPress={() => onPressCharacter(lower)}
                />
                <View style={styles.pairDivider} />
                <LetterCaseCell
                  letter={upper}
                  strokes={upperGlyph?.stroke_data}
                  onPress={() => onPressCharacter(upper)}
                />
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rakamlar</Text>
        <View style={styles.grid}>
          {HANDWRITING_DIGITS.map((digit) => {
            const glyph = glyphMap.get(digit);
            return (
              <CharacterCell
                key={digit}
                character={digit}
                strokes={glyph?.stroke_data}
                onPress={() => onPressCharacter(digit)}
                compact
              />
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Semboller</Text>
        <View style={styles.grid}>
          {HANDWRITING_SYMBOLS.map((symbol) => {
            const glyph = glyphMap.get(symbol);
            return (
              <CharacterCell
                key={symbol}
                character={symbol}
                strokes={glyph?.stroke_data}
                onPress={() => onPressCharacter(symbol)}
                compact
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
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
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
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
  singleCell: {
    width: '18%',
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  compactCell: {
    width: '16%',
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  cellDone: {
    borderColor: colors.forest,
    backgroundColor: colors.forestSoft,
  },
  caseLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
  },
  cellLabel: {
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
  previewCharacter: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.muted,
  },
});
