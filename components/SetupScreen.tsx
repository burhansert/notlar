import { useAuth } from '@/lib/auth';
import { BrandMark } from '@/components/BrandMark';
import { Screen } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { StyleSheet, Text, View } from 'react-native';

export function SetupScreen() {
  const { isConfigured } = useAuth();
  if (isConfigured) return null;

  return (
    <Screen style={styles.center}>
      <BrandMark />
      <View style={styles.card}>
        <Text style={styles.title}>Supabase ayarı gerekli</Text>
        <Text style={styles.body}>
          `.env` dosyasına `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY`
          değerlerini ekleyin. Ardından `supabase/schema.sql` dosyasını SQL Editor’de çalıştırın
          ve uygulamayı yeniden başlatın.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
  },
});
