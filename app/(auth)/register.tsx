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
import { Button, ErrorBanner, Input, Screen } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt oluşturulamadı.');
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
            <Text style={styles.hint}>
              E-posta ve şifre doğrudan veritabanındaki users tablosuna kaydedilir.
              İlk kayıt olan kullanıcı yönetici olur.
            </Text>
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
              placeholder="En az 6 karakter"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />
            <Input
              label="Şifre tekrar"
              placeholder="Şifrenizi tekrar yazın"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoComplete="new-password"
            />
            <Button label="Kayıt ol" onPress={onSubmit} loading={loading} />
            <Link href="/(auth)" asChild>
              <Pressable style={styles.switch}>
                <Text style={styles.switchText}>Zaten hesabın var mı? Giriş yap</Text>
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
  hint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
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
