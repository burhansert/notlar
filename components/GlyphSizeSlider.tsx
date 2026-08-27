import { useRef, useState } from 'react';
import {
  PanResponder,
  Platform,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  HANDWRITING_GLYPH_SIZE_STEP,
  MAX_HANDWRITING_GLYPH_SIZE,
  MIN_HANDWRITING_GLYPH_SIZE,
} from '@/constants/handwriting';
import { colors, radius } from '@/constants/theme';

type Props = {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  style?: StyleProp<ViewStyle>;
};

function clampStepped(
  value: number,
  minimumValue: number,
  maximumValue: number,
  step: number
) {
  const clamped = Math.min(maximumValue, Math.max(minimumValue, value));
  const stepped = Math.round((clamped - minimumValue) / step) * step + minimumValue;
  return Math.min(maximumValue, Math.max(minimumValue, stepped));
}

export function GlyphSizeSlider({
  value,
  onValueChange,
  minimumValue = MIN_HANDWRITING_GLYPH_SIZE,
  maximumValue = MAX_HANDWRITING_GLYPH_SIZE,
  step = HANDWRITING_GLYPH_SIZE_STEP,
  style,
}: Props) {
  const trackWidthRef = useRef(0);
  const [trackWidth, setTrackWidth] = useState(0);

  function updateFromOffset(offsetX: number) {
    if (trackWidthRef.current <= 0) return;
    const ratio = Math.max(0, Math.min(1, offsetX / trackWidthRef.current));
    const raw = minimumValue + ratio * (maximumValue - minimumValue);
    onValueChange(clampStepped(raw, minimumValue, maximumValue, step));
  }

  function handleLayout(event: LayoutChangeEvent) {
    const nextWidth = event.nativeEvent.layout.width;
    trackWidthRef.current = nextWidth;
    setTrackWidth(nextWidth);
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => updateFromOffset(event.nativeEvent.locationX),
      onPanResponderMove: (event) => updateFromOffset(event.nativeEvent.locationX),
    })
  ).current;

  const ratio =
    maximumValue === minimumValue ? 0 : (value - minimumValue) / (maximumValue - minimumValue);
  const thumbLeft = Math.max(0, Math.min(trackWidth, ratio * trackWidth));

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webWrap, style]}>
        <input
          type="range"
          min={minimumValue}
          max={maximumValue}
          step={step}
          value={value}
          aria-label="Yazı boyutu"
          onChange={(event) =>
            onValueChange(
              clampStepped(Number(event.target.value), minimumValue, maximumValue, step)
            )
          }
          style={{
            width: '100%',
            accentColor: colors.forest,
            cursor: 'pointer',
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, style]} onLayout={handleLayout} {...panResponder.panHandlers}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
      </View>
      <View style={[styles.thumb, { left: thumbLeft - THUMB_SIZE / 2 }]} />
    </View>
  );
}

const THUMB_SIZE = 16;

const styles = StyleSheet.create({
  webWrap: {
    flex: 1,
    minWidth: 96,
    maxWidth: 140,
    justifyContent: 'center',
    height: 24,
  },
  wrap: {
    flex: 1,
    minWidth: 96,
    maxWidth: 140,
    height: 24,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.forest,
  },
  thumb: {
    position: 'absolute',
    top: 4,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.forest,
    borderWidth: 2,
    borderColor: colors.white,
  },
});
