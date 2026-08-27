import { useMemo, useRef } from 'react';
import {
  PanResponder,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';

import { colors, radius } from '@/constants/theme';
import {
  getHandwritingCanvasSize,
  normalizePoint,
  strokeToPath,
  strokeWidthForSize,
} from '@/lib/handwriting';
import type { Stroke } from '@/lib/types';

const PENCIL_CURSOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path d="M3 5 L6 8 L22 24 L25 21 L9 5 Z" fill="white" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/><path d="M3 5 L1 3 L3 1 L5 3 Z" fill="white" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

const webCanvasStyle: ViewStyle | undefined =
  Platform.OS === 'web'
    ? ({
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        touchAction: 'none',
        cursor: `url("data:image/svg+xml,${encodeURIComponent(PENCIL_CURSOR_SVG)}") 3 3, crosshair`,
      } as unknown as ViewStyle)
    : undefined;

export function HandwritingCanvas({
  letter,
  strokes,
  onChange,
}: {
  letter: string;
  strokes: Stroke[];
  onChange: (next: Stroke[]) => void;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const canvasSize = getHandwritingCanvasSize(windowWidth);
  const guideSize = canvasSize * 0.72;
  const strokeWidth = strokeWidthForSize(canvasSize);
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          const point = normalizePoint(
            event.nativeEvent.locationX,
            event.nativeEvent.locationY,
            canvasSize,
            canvasSize
          );
          onChange([...strokesRef.current, [point]]);
        },
        onPanResponderMove: (event) => {
          const current = strokesRef.current;
          if (current.length === 0) return;

          const point = normalizePoint(
            event.nativeEvent.locationX,
            event.nativeEvent.locationY,
            canvasSize,
            canvasSize
          );
          const next = current.slice();
          const lastStroke = next[next.length - 1];
          next[next.length - 1] = [...lastStroke, point];
          onChange(next);
        },
      }),
    [canvasSize, onChange]
  );

  return (
    <View style={styles.wrap}>
      <View
        style={[styles.canvas, { width: canvasSize, height: canvasSize }, webCanvasStyle]}
        {...panResponder.panHandlers}
        {...(Platform.OS === 'web'
          ? {
              onMouseDown: (event: { preventDefault: () => void }) => event.preventDefault(),
              onDragStart: (event: { preventDefault: () => void }) => event.preventDefault(),
            }
          : {})}>
        <Svg width={canvasSize} height={canvasSize} pointerEvents="none">
          <SvgText
            x={canvasSize / 2}
            y={canvasSize * 0.68}
            fontSize={guideSize}
            fontWeight="800"
            fill={colors.paperDark}
            opacity={0.55}
            textAnchor="middle">
            {letter}
          </SvgText>
          {strokes.map((stroke, index) => (
            <Path
              key={`stroke-${index}`}
              d={strokeToPath(stroke, canvasSize, canvasSize)}
              stroke={colors.handwritingInk}
              strokeOpacity={1}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  canvas: {
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
