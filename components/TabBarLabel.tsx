import { StyleSheet, Text, type ColorValue } from 'react-native';

type Props = {
  label: string;
  color: ColorValue;
};

export function TabBarLabel({ label, color }: Props) {
  return (
    <Text numberOfLines={2} style={[styles.label, { color }]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 13,
    textAlign: 'center',
  },
});
