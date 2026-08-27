import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radius } from '@/constants/theme';
import type { Stroke, StrokePoint } from '@/lib/types';

const STROKE_WIDTH = 4;

function strokeToPath(stroke: Stroke, width: number, height: number) {
  if (stroke.length === 0) return '';

  const [first, ...rest] = stroke;
  const start = `${first.x * width},${first.y * height}`;
  const lines = rest.map((point) => `L ${point.x * width},${point.y * height}`).join(' ');
  return `M ${start} ${lines}`;
}

function normalizePoint(locationX: number, locationY: number, width: number, height: number): StrokePoint {
  return {
    x: Math.min(1, Math.max(0, locationX / width)),
    y: Math.min(1, Math.max(0, locationY / height)),
  };
}

export function HandwritingCanvas({
  letter,
  strokes,
  onChange,
}: {
  letter: string;
  strokes: Stroke[];
  onChange: (next: Stroke[]) => void;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setSize({ width, height });
    }
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          if (size.width === 0 || size.height === 0) return;
          const point = normalizePoint(
            event.nativeEvent.locationX,
            event.nativeEvent.locationY,
            size.width,
            size.height
          );
          onChange([...strokesRef.current, [point]]);
        },
        onPanResponderMove: (event) => {
          if (size.width === 0 || size.height === 0) return;
          const current = strokesRef.current;
          if (current.length === 0) return;

          const point = normalizePoint(
            event.nativeEvent.locationX,
            event.nativeEvent.locationY,
            size.width,
            size.height
          );
          const next = current.slice();
          const lastStroke = next[next.length - 1];
          next[next.length - 1] = [...lastStroke, point];
          onChange(next);
        },
      }),
    [onChange, size.height, size.width]
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.canvas} onLayout={onLayout} {...panResponder.panHandlers}>
        <Text style={styles.guide}>{letter}</Text>
        {size.width > 0 && size.height > 0 ? (
          <Svg width={size.width} height={size.height} style={styles.svg}>
            {strokes.map((stroke, index) => (
              <Path
                key={`stroke-${index}`}
                d={strokeToPath(stroke, size.width, size.height)}
                stroke={colors.ink}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
          </Svg>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 320,
  },
  canvas: {
    flex: 1,
    minHeight: 320,
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
    fontSize: 220,
    fontWeight: '800',
    color: colors.paperDark,
    opacity: 0.55,
    includeFontPadding: false,
  },
  svg: {
    ...StyleSheet.absoluteFill,
  },
});
