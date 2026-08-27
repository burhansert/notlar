import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radius } from '@/constants/theme';
import type { TurkishLetter } from '@/constants/turkish-alphabet';
import { glyphLetterForChar, strokeToPath } from '@/lib/handwriting';
import type { Stroke } from '@/lib/types';

const GLYPH_SIZE = 44;

function GlyphChar({
  char,
  strokes,
  missing,
}: {
  char: string;
  strokes?: Stroke[];
  missing: boolean;
}) {
  if (char === ' ') {
    return <View style={styles.space} />;
  }

  if (strokes && strokes.length > 0) {
    return (
      <View style={styles.glyphBox}>
        <Svg width={GLYPH_SIZE} height={GLYPH_SIZE}>
          {strokes.map((stroke, index) => (
            <Path
              key={`${char}-${index}`}
              d={strokeToPath(stroke, GLYPH_SIZE, GLYPH_SIZE)}
              stroke={colors.forestDark}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </Svg>
      </View>
    );
  }

  return (
    <View style={[styles.glyphBox, missing ? styles.glyphBoxMissing : null]}>
      <Text style={[styles.fallback, missing ? styles.fallbackMissing : null]}>{char}</Text>
    </View>
  );
}

export function HandwritingTextPreview({
  text,
  glyphMap,
}: {
  text: string;
  glyphMap: Map<TurkishLetter, Stroke[]>;
}) {
  const value = text.trim();

  if (!value) {
    return (
      <Text style={styles.placeholder}>
        Metin yazdığınızda el yazınızla nasıl görüneceğini burada göreceksiniz.
      </Text>
    );
  }

  return (
    <View style={styles.wrap}>
      {Array.from(value).map((char, index) => {
        const letter = glyphLetterForChar(char);
        const strokes = letter ? glyphMap.get(letter) : undefined;
        const missing = Boolean(letter && !strokes?.length);

        return (
          <GlyphChar
            key={`${char}-${index}`}
            char={char}
            strokes={strokes}
            missing={missing}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: 4,
    minHeight: 52,
  },
  glyphBox: {
    width: GLYPH_SIZE,
    height: GLYPH_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphBoxMissing: {
    borderRadius: radius.sm,
    backgroundColor: colors.paperDark,
  },
  fallback: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.ink,
    includeFontPadding: false,
  },
  fallbackMissing: {
    color: colors.muted,
    opacity: 0.65,
  },
  space: {
    width: 16,
    height: GLYPH_SIZE,
  },
  placeholder: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    fontWeight: '500',
  },
});
