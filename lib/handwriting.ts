import { isTurkishLetter, type TurkishLetter } from '@/constants/turkish-alphabet';
import type { HandwritingGlyph, Stroke } from '@/lib/types';

export function strokeToPath(stroke: Stroke, width: number, height: number) {
  if (stroke.length === 0) return '';

  const [first, ...rest] = stroke;
  const start = `${first.x * width},${first.y * height}`;
  const lines = rest.map((point) => `L ${point.x * width},${point.y * height}`).join(' ');
  return `M ${start} ${lines}`;
}

export function glyphLetterForChar(char: string): TurkishLetter | null {
  if (!char.trim()) return null;
  const upper = char.toLocaleUpperCase('tr-TR');
  return isTurkishLetter(upper) ? upper : null;
}

export function buildGlyphMap(glyphs: HandwritingGlyph[]) {
  const map = new Map<TurkishLetter, Stroke[]>();
  for (const glyph of glyphs) {
    if (!isTurkishLetter(glyph.letter)) continue;
    if (Array.isArray(glyph.stroke_data) && glyph.stroke_data.length > 0) {
      map.set(glyph.letter, glyph.stroke_data);
    }
  }
  return map;
}
