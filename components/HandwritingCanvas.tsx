import { useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Platform,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from 'react-native';
import Svg, { Text as SvgText } from 'react-native-svg';

import { GlyphSvg } from '@/components/GlyphSvg';
import { colors, radius } from '@/constants/theme';
import type { Stroke, StrokePoint } from '@/lib/types';

function normalizePoint(locationX: number, locationY: number, width: number, height: number): StrokePoint {
  return {
    x: Math.min(1, Math.max(0, locationX / width)),
    y: Math.min(1, Math.max(0, locationY / height)),
  };
}

const webCanvasStyle: ViewStyle | undefined =
  Platform.OS === 'web'
    ? ({
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        touchAction: 'none',
        cursor: 'crosshair',
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
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,
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

  const guideSize = size * 0.72;

  return (
    <View style={styles.wrap}>
      <View
        style={[styles.canvas, webCanvasStyle]}
        onLayout={onLayout}
        {...panResponder.panHandlers}
        {...(Platform.OS === 'web'
          ? {
              onMouseDown: (event: { preventDefault: () => void }) => event.preventDefault(),
              onDragStart: (event: { preventDefault: () => void }) => event.preventDefault(),
            }
          : {})}>
        {size > 0 ? (
          <>
            <Svg
              width={size}
              height={size}
              style={styles.guideLayer}
              pointerEvents="none">
              <SvgText
                x={size / 2}
                y={size * 0.68}
                fontSize={guideSize}
                fontWeight="800"
                fill={colors.paperDark}
                opacity={0.55}
                textAnchor="middle">
                {letter}
              </SvgText>
            </Svg>
            <View style={styles.drawingLayer} pointerEvents="none">
              <GlyphSvg strokes={strokes} size={size} strokeColor={colors.ink} normalize={false} />
            </View>
          </>
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
  guideLayer: {
    ...StyleSheet.absoluteFill,
  },
  drawingLayer: {
    ...StyleSheet.absoluteFill,
  },
});
