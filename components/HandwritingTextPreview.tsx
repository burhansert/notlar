import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { GlyphSvg } from '@/components/GlyphSvg';
import {
  DEFAULT_HANDWRITING_GLYPH_SIZE,
  handwritingLayoutMetrics,
} from '@/constants/handwriting';
import { colors, radius } from '@/constants/theme';
import type { HandwritingCharacter } from '@/constants/turkish-alphabet';
import { glyphLetterForChar, glyphDisplayMetrics } from '@/lib/handwriting';
import { splitIntoParagraphs } from '@/lib/handwritingPagination';
import type { Stroke } from '@/lib/types';

function GlyphChar({
  char,
  strokes,
  missing,
  glyphSize,
  fallbackFontSize,
}: {
  char: string;
  strokes?: Stroke[];
  missing: boolean;
  glyphSize: number;
  fallbackFontSize: number;
}) {
  const letter = glyphLetterForChar(char);
  const display = letter ? glyphDisplayMetrics(letter, glyphSize) : null;

  if (strokes && strokes.length > 0 && display) {
    return (
      <View
        style={[
          styles.glyphBox,
          {
            width: display.width,
            height: glyphSize,
          },
          display.baselineAlign ? styles.glyphBoxBaseline : null,
        ]}>
        <GlyphSvg
          strokes={strokes}
          size={display.height}
          strokeWidth={display.strokeWidth}
          minBBoxDim={display.minBBoxDim}
          normalizeAnchor={display.normalizeAnchor}
        />
      </View>
    );
  }

  const boxWidth = display?.width ?? glyphSize;
  const boxHeight = glyphSize;

  return (
    <View
      style={[
        styles.glyphBox,
        { width: boxWidth, height: boxHeight },
        display?.baselineAlign ? styles.glyphBoxBaseline : null,
        missing ? styles.glyphBoxMissing : null,
      ]}>
      <Text
        style={[
          styles.fallback,
          { fontSize: fallbackFontSize },
          missing ? styles.fallbackMissing : null,
        ]}>
        {char}
      </Text>
    </View>
  );
}

function HandwritingWord({
  word,
  glyphMap,
  keyPrefix,
  glyphSize,
  letterGap,
  fallbackFontSize,
}: {
  word: string;
  glyphMap: Map<HandwritingCharacter, Stroke[]>;
  keyPrefix: string;
  glyphSize: number;
  letterGap: number;
  fallbackFontSize: number;
}) {
  return (
    <View style={[styles.word, { gap: letterGap }]}>
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
            glyphSize={glyphSize}
            fallbackFontSize={fallbackFontSize}
          />
        );
      })}
    </View>
  );
}

export function HandwritingTextPreview({
  text,
  glyphMap,
  glyphSize = DEFAULT_HANDWRITING_GLYPH_SIZE,
}: {
  text: string;
  glyphMap: Map<HandwritingCharacter, Stroke[]>;
  glyphSize?: number;
}) {
  const value = text.trim();
  const paragraphs = splitIntoParagraphs(value);
  const metrics = useMemo(() => handwritingLayoutMetrics(glyphSize), [glyphSize]);

  if (!value || paragraphs.length === 0) {
    return (
      <Text style={styles.placeholder}>
        Metin yazdığınızda el yazınızla nasıl görüneceğini burada göreceksiniz.
      </Text>
    );
  }

  return (
    <View style={[styles.container, { gap: metrics.paragraphGap }]}>
      {paragraphs.map((words, paragraphIndex) => (
        <View
          key={`paragraph-${paragraphIndex}`}
          style={[
            styles.paragraph,
            { columnGap: metrics.wordGap, rowGap: metrics.rowGap },
          ]}>
          {words.map((word, wordIndex) => (
            <HandwritingWord
              key={`word-${paragraphIndex}-${wordIndex}`}
              keyPrefix={`word-${paragraphIndex}-${wordIndex}`}
              word={word}
              glyphMap={glyphMap}
              glyphSize={metrics.glyphSize}
              letterGap={metrics.letterGap}
              fallbackFontSize={metrics.fallbackFontSize}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 56,
  },
  paragraph: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  word: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'flex-end',
  },
  glyphBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphBoxBaseline: {
    justifyContent: 'flex-end',
  },
  glyphBoxMissing: {
    borderRadius: radius.sm,
    backgroundColor: colors.paperDark,
  },
  fallback: {
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
