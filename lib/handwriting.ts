import type { Stroke, StrokePoint } from '@/lib/types';

export const HANDWRITING_CANVAS_PADDING = 24;
export const HANDWRITING_GUIDE_SCALE = 0.62;
export const HANDWRITING_STROKE_SCALE = 0.012;

export function getHandwritingCanvasSize(windowWidth: number) {
  return Math.max(280, Math.floor(windowWidth - HANDWRITING_CANVAS_PADDING * 2));
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

export function handwritingStrokeWidth(canvasSize: number) {
  return Math.max(3, canvasSize * HANDWRITING_STROKE_SCALE);
}

export function handwritingGuideFontSize(canvasSize: number) {
  return Math.round(canvasSize * HANDWRITING_GUIDE_SCALE);
}
