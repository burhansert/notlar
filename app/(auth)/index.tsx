import { Link } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BrandMark } from '@/components/BrandMark';
import { SetupScreen } from '@/components/SetupScreen';
import { Button, ErrorBanner, Input, Screen } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const { signIn, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isConfigured) {
    return <SetupScreen />;
  }

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş yapılamadı.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <BrandMark />
          <View style={styles.form}>
            <ErrorBanner message={error} />
            <Input
              label="E-posta"
              placeholder="ornek@mail.com"
              value={email}
              onChangeText={setEmail}
              autoComplete="email"
              keyboardType="email-address"
            />
            <Input
              label="Şifre"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />
            <Button label="Giriş yap" onPress={onSubmit} loading={loading} />
            <Link href="/(auth)/register" asChild>
              <Pressable style={styles.switch}>
                <Text style={styles.switchText}>Hesabın yok mu? Kayıt ol</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.xl,
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
  },
  form: {
    gap: spacing.md,
  },
  switch: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchText: {
    color: colors.forest,
    fontWeight: '700',
    fontSize: 15,
  },
});
