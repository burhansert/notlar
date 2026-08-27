import { resolveHandwritingCharacter, type HandwritingCharacter } from '@/constants/turkish-alphabet';
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

export function normalizeStrokesToBounds(strokes: Stroke[], padding = 0.1): Stroke[] {
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

  const bboxWidth = maxX - minX || 1;
  const bboxHeight = maxY - minY || 1;
  const maxDim = Math.max(bboxWidth, bboxHeight);
  const inner = 1 - padding * 2;
  const scale = inner / maxDim;
  const offsetX = padding + (inner - bboxWidth * scale) / 2;
  const offsetY = padding + (inner - bboxHeight * scale) / 2;

  return strokes.map((stroke) =>
    stroke.map((point) => ({
      x: offsetX + (point.x - minX) * scale,
      y: offsetY + (point.y - minY) * scale,
    }))
  );
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
