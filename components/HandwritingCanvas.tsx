import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { GlyphSvg } from '@/components/GlyphSvg';
import { colors, radius } from '@/constants/theme';
import type { Stroke, StrokePoint } from '@/lib/types';

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
  const [size, setSize] = useState(0);
  const strokesRef = useRef(strokes);
  strokesRef.current = strokes;

  const onLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setSize(width);
    }
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          if (size === 0) return;
          const point = normalizePoint(
            event.nativeEvent.locationX,
            event.nativeEvent.locationY,
            size,
            size
          );
          onChange([...strokesRef.current, [point]]);
        },
        onPanResponderMove: (event) => {
          if (size === 0) return;
          const current = strokesRef.current;
          if (current.length === 0) return;

          const point = normalizePoint(
            event.nativeEvent.locationX,
            event.nativeEvent.locationY,
            size,
            size
          );
          const next = current.slice();
          const lastStroke = next[next.length - 1];
          next[next.length - 1] = [...lastStroke, point];
          onChange(next);
        },
      }),
    [onChange, size]
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.canvas} onLayout={onLayout} {...panResponder.panHandlers}>
        <Text style={[styles.guide, { fontSize: size * 0.72 }]}>{letter}</Text>
        {size > 0 ? (
          <View style={styles.drawingLayer} pointerEvents="none">
            <GlyphSvg strokes={strokes} size={size} strokeColor={colors.ink} normalize={false} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  canvas: {
    width: '100%',
    maxWidth: 360,
    aspectRatio: 1,
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
    width: '100%',
    textAlign: 'center',
  },
  drawingLayer: {
    ...StyleSheet.absoluteFill,
  },
});
