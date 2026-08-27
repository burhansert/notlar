import { useMemo, useRef } from 'react';
import { PanResponder, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radius } from '@/constants/theme';
import {
  getHandwritingCanvasSize,
  handwritingGuideFontSize,
  handwritingStrokeWidth,
  normalizePoint,
  strokeToPath,
} from '@/lib/handwriting';
import type { Stroke } from '@/lib/types';

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
  const guideFontSize = handwritingGuideFontSize(canvasSize);
  const strokeWidth = handwritingStrokeWidth(canvasSize);
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
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
        style={[styles.canvas, { width: canvasSize, height: canvasSize }]}
        {...panResponder.panHandlers}>
        <Text style={[styles.guide, { fontSize: guideFontSize }]}>{letter}</Text>
        <Svg width={canvasSize} height={canvasSize}>
          {strokes.map((stroke, index) => (
            <Path
              key={`stroke-${index}`}
              d={strokeToPath(stroke, canvasSize, canvasSize)}
              stroke={colors.ink}
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
  guide: {
    position: 'absolute',
    fontWeight: '800',
    color: colors.paperDark,
    opacity: 0.55,
    includeFontPadding: false,
  },
});
