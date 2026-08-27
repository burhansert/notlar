import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/constants/theme';

type Props = {
  fallbackHref: Href;
  label?: string;
};

export function HeaderBackButton({ fallbackHref, label }: Props) {
  const router = useRouter();

  function handlePress() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(fallbackHref);
  }

  return (
    <Pressable
      onPress={handlePress}
      hitSlop={8}
      style={({ pressed }) => [styles.container, { opacity: pressed ? 0.6 : 1 }]}>
      <Ionicons name="chevron-back" size={28} color={colors.ink} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    color: colors.ink,
    fontSize: 17,
    marginLeft: -2,
  },
});
