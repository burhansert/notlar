import { Image, type ImageStyle, type StyleProp } from 'react-native';

const source = require('@/assets/images/handwriting-icon.png');

export function HandwritingIcon({
  size = 22,
  style,
}: {
  size?: number;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={source}
      style={[{ width: size, height: size, resizeMode: 'contain' }, style]}
      accessibilityLabel="El yazısı"
    />
  );
}
