import Svg, { Path } from 'react-native-svg';

import { colors } from '@/constants/theme';
import { normalizeStrokesToBounds, strokeToPath, strokeWidthForSize } from '@/lib/handwriting';
import type { Stroke } from '@/lib/types';

export function GlyphSvg({
  strokes,
  size,
  strokeColor = colors.handwritingInk,
  strokeWidth,
  normalize = true,
  minBBoxDim = 0.12,
  normalizeAnchor = 'center',
}: {
  strokes: Stroke[];
  size: number;
  strokeColor?: string;
  strokeWidth?: number;
  normalize?: boolean;
  minBBoxDim?: number;
  normalizeAnchor?: 'center' | 'baseline';
}) {
  const paths = normalize
    ? normalizeStrokesToBounds(strokes, 0.1, minBBoxDim, normalizeAnchor)
    : strokes;
  const width = strokeWidth ?? strokeWidthForSize(size);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths.map((stroke, index) => (
        <Path
          key={`glyph-${index}`}
          d={strokeToPath(stroke, size, size)}
          stroke={strokeColor}
          strokeOpacity={1}
          strokeWidth={width}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}
