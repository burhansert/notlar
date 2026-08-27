import { StyleSheet, Text, View } from 'react-native';

import { GlyphSvg } from '@/components/GlyphSvg';
import { colors, radius } from '@/constants/theme';
import type { HandwritingCharacter } from '@/constants/turkish-alphabet';
import { glyphLetterForChar } from '@/lib/handwriting';
import type { Stroke } from '@/lib/types';

const GLYPH_SIZE = 52;
const LETTER_GAP = 1;
const WORD_GAP = 12;
const PARAGRAPH_GAP = 14;

function splitIntoParagraphs(text: string): string[][] {
  return text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim().split(/\s+/).filter(Boolean))
    .filter((words) => words.length > 0);
}

function GlyphChar({
  char,
  strokes,
  missing,
}: {
  char: string;
  strokes?: Stroke[];
  missing: boolean;
}) {
  if (strokes && strokes.length > 0) {
    return (
      <View style={styles.glyphBox}>
        <GlyphSvg strokes={strokes} size={GLYPH_SIZE} />
      </View>
    );
  }

  return (
    <View style={[styles.glyphBox, missing ? styles.glyphBoxMissing : null]}>
      <Text style={[styles.fallback, missing ? styles.fallbackMissing : null]}>{char}</Text>
    </View>
  );
}

function HandwritingWord({
  word,
  glyphMap,
  keyPrefix,
}: {
  word: string;
  glyphMap: Map<HandwritingCharacter, Stroke[]>;
  keyPrefix: string;
}) {
  return (
    <View style={styles.word}>
      {Array.from(word).map((char, index) => {
        const letter = glyphLetterForChar(char);
        const strokes = letter ? glyphMap.get(letter) : undefined;
        const missing = Boolean(letter && !strokes?.length);

        return (
          <GlyphChar
            key={`${keyPrefix}-${index}`}
            char={char}
            strokes={strokes}
            missing={missing}
          />
        );
      })}
    </View>
  );
}

export function HandwritingTextPreview({
  text,
  glyphMap,
}: {
  text: string;
  glyphMap: Map<HandwritingCharacter, Stroke[]>;
}) {
  const value = text.trim();
  const paragraphs = splitIntoParagraphs(value);

  if (!value || paragraphs.length === 0) {
    return (
      <Text style={styles.placeholder}>
        Metin yazdığınızda el yazınızla nasıl görüneceğini burada göreceksiniz.
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      {paragraphs.map((words, paragraphIndex) => (
        <View key={`paragraph-${paragraphIndex}`} style={styles.paragraph}>
          {words.map((word, wordIndex) => (
            <HandwritingWord
              key={`word-${paragraphIndex}-${wordIndex}`}
              keyPrefix={`word-${paragraphIndex}-${wordIndex}`}
              word={word}
              glyphMap={glyphMap}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: PARAGRAPH_GAP,
    minHeight: 56,
  },
  paragraph: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    columnGap: WORD_GAP,
    rowGap: 8,
  },
  word: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'flex-end',
    gap: LETTER_GAP,
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
    fontSize: 30,
    fontWeight: '800',
    color: colors.ink,
    includeFontPadding: false,
  },
  fallbackMissing: {
    color: colors.muted,
    opacity: 0.65,
  },
  placeholder: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    fontWeight: '500',
  },
});
