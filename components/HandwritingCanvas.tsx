import { useMemo, useRef } from 'react';
import {
  PanResponder,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import Svg, { Text as SvgText } from 'react-native-svg';

import { GlyphSvg } from '@/components/GlyphSvg';
import { colors, radius } from '@/constants/theme';
import { getHandwritingCanvasSize, normalizePoint } from '@/lib/handwriting';
import type { Stroke } from '@/lib/types';

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
  const { width: windowWidth } = useWindowDimensions();
  const canvasSize = getHandwritingCanvasSize(windowWidth);
  const guideSize = canvasSize * 0.72;
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
        <Svg width={canvasSize} height={canvasSize} style={styles.guideLayer} pointerEvents="none">
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
        </Svg>
        <GlyphSvg
          strokes={strokes}
          size={canvasSize}
          strokeColor={colors.ink}
          normalize={false}
        />
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
  guideLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
