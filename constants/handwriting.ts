export const DEFAULT_HANDWRITING_GLYPH_SIZE = 40;
export const MIN_HANDWRITING_GLYPH_SIZE = 28;
export const MAX_HANDWRITING_GLYPH_SIZE = 56;
export const HANDWRITING_GLYPH_SIZE_STEP = 2;

export function handwritingLayoutMetrics(glyphSize: number) {
  return {
    glyphSize,
    letterGap: Math.max(0, Math.round(glyphSize * 0.025)),
    wordGap: Math.max(6, Math.round(glyphSize * 0.28)),
    paragraphGap: Math.max(8, Math.round(glyphSize * 0.3)),
    rowGap: Math.max(4, Math.round(glyphSize * 0.15)),
    fallbackFontSize: Math.round(glyphSize * 0.58),
  };
}
