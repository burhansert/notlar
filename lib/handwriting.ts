import {
  isHandwritingSymbol,
  resolveHandwritingCharacter,
  type HandwritingCharacter,
} from '@/constants/turkish-alphabet';
import type { HandwritingGlyph, Stroke, StrokePoint } from '@/lib/types';

export const HANDWRITING_CANVAS_PADDING = 24;
export const HANDWRITING_CANVAS_MAX_SIZE = 360;

export function getHandwritingCanvasSize(windowWidth: number) {
  return Math.min(
    HANDWRITING_CANVAS_MAX_SIZE,
    Math.max(280, Math.floor(windowWidth - HANDWRITING_CANVAS_PADDING * 2))
  );
}

export function normalizePoint(
  locationX: number,
  locationY: number,
  width: number,
  height: number
): StrokePoint {
  return {
    x: Math.min(1, Math.max(0, locationX / width)),
    y: Math.min(1, Math.max(0, locationY / height)),
  };
}

export function strokeToPath(stroke: Stroke, width: number, height: number) {
  if (stroke.length === 0) return '';

  const [first, ...rest] = stroke;
  const start = `${first.x * width},${first.y * height}`;
  const lines = rest.map((point) => `L ${point.x * width},${point.y * height}`).join(' ');
  return `M ${start} ${lines}`;
}

export function strokeWidthForSize(size: number) {
  return Math.max(1.5, size * 0.0125);
}

function collectPoints(strokes: Stroke[]): StrokePoint[] {
  return strokes.flat();
}

export function normalizeStrokesToBounds(
  strokes: Stroke[],
  padding = 0.1,
  minBBoxDim = 0.12,
  anchor: 'center' | 'baseline' = 'center'
): Stroke[] {
  const points = collectPoints(strokes);
  if (points.length === 0) return strokes;

  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  const bboxWidth = maxX - minX;
  const bboxHeight = maxY - minY;
  const maxDim = Math.max(bboxWidth, bboxHeight, minBBoxDim);
  const paddingTop = anchor === 'baseline' ? padding * 0.35 : padding;
  const paddingBottom = anchor === 'baseline' ? padding * 1.15 : padding;
  const innerWidth = 1 - padding * 2;
  const innerHeight = 1 - paddingTop - paddingBottom;
  const scale = Math.min(innerWidth / Math.max(bboxWidth, minBBoxDim), innerHeight / Math.max(bboxHeight, minBBoxDim));
  const offsetX = padding + (innerWidth - bboxWidth * scale) / 2;
  const offsetY = paddingTop + (innerHeight - bboxHeight * scale) / 2;

  return strokes.map((stroke) =>
    stroke.map((point) => ({
      x: offsetX + (point.x - minX) * scale,
      y: offsetY + (point.y - minY) * scale,
    }))
  );
}

export type GlyphDisplayMetrics = {
  width: number;
  height: number;
  strokeWidth?: number;
  minBBoxDim: number;
  baselineAlign: boolean;
  normalizeAnchor: 'center' | 'baseline';
};

const TINY_PUNCTUATION = new Set<HandwritingCharacter>(['.', ',']);
const BASELINE_PUNCTUATION = new Set<HandwritingCharacter>(['.', ',', ';', ':']);
const COMPACT_PUNCTUATION = new Set<HandwritingCharacter>([
  '!',
  '?',
  '"',
  "'",
  '+',
  '-',
  '*',
  '/',
  '%',
]);

export function glyphDisplayMetrics(
  character: HandwritingCharacter,
  glyphSize: number
): GlyphDisplayMetrics {
  if (TINY_PUNCTUATION.has(character)) {
    return {
      width: Math.round(glyphSize * 0.26),
      height: Math.round(glyphSize * 0.3),
      strokeWidth: Math.max(1, glyphSize * 0.055),
      minBBoxDim: 0.22,
      baselineAlign: true,
      normalizeAnchor: 'baseline',
    };
  }

  if (BASELINE_PUNCTUATION.has(character)) {
    return {
      width: Math.round(glyphSize * 0.3),
      height: Math.round(glyphSize * 0.36),
      strokeWidth: Math.max(1, glyphSize * 0.065),
      minBBoxDim: 0.18,
      baselineAlign: true,
      normalizeAnchor: 'baseline',
    };
  }

  if (COMPACT_PUNCTUATION.has(character)) {
    return {
      width: Math.round(glyphSize * 0.42),
      height: Math.round(glyphSize * 0.52),
      strokeWidth: Math.max(1, glyphSize * 0.075),
      minBBoxDim: 0.16,
      baselineAlign: character === '-' || character === '+' || character === '*' || character === '/',
      normalizeAnchor:
        character === '-' || character === '+' || character === '*' || character === '/'
          ? 'baseline'
          : 'center',
    };
  }

  if (isHandwritingSymbol(character)) {
    return {
      width: glyphSize,
      height: glyphSize,
      minBBoxDim: 0.14,
      baselineAlign: false,
      normalizeAnchor: 'center',
    };
  }

  return {
    width: glyphSize,
    height: glyphSize,
    minBBoxDim: 0.1,
    baselineAlign: false,
    normalizeAnchor: 'center',
  };
}

export function glyphLetterForChar(char: string): HandwritingCharacter | null {
  if (!char.trim()) return null;
  return resolveHandwritingCharacter(char);
}

export function buildGlyphMap(glyphs: HandwritingGlyph[]) {
  const map = new Map<HandwritingCharacter, Stroke[]>();
  for (const glyph of glyphs) {
    const character = resolveHandwritingCharacter(glyph.letter);
    if (!character) continue;
    if (Array.isArray(glyph.stroke_data) && glyph.stroke_data.length > 0) {
      map.set(character, glyph.stroke_data);
    }
  }
  return map;
}
