import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Sayfa yok', headerShown: true }} />
      <View style={styles.container}>
        <Text style={styles.title}>Bu ekran bulunamadı.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Notlara dön</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.paper,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
  },
  link: {
    marginTop: spacing.md,
  },
  linkText: {
    color: colors.forest,
    fontWeight: '700',
  },
});
