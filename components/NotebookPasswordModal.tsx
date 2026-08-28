import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Input } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { validatePassword } from '@/lib/credentials';

const DISMISS_BLOCK_MS = 120;

const passwordFieldProps = {
  preventPasswordManager: true,
} as const;

export type NotebookPasswordMode = 'unlock' | 'set' | 'change' | 'remove';

export function NotebookPasswordModal({
  visible,
  mode,
  title,
  loading = false,
  error,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  mode: NotebookPasswordMode;
  title?: string;
  loading?: boolean;
  error?: string | null;
  onConfirm: (password: string, currentPassword?: string) => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [current, setCurrent] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const dismissingRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    dismissingRef.current = false;
    setPassword('');
    setConfirm('');
    setCurrent('');
    setLocalError(null);
  }, [visible, mode]);

  const heading =
    mode === 'unlock'
      ? 'Not defteri kilitli'
      : mode === 'set'
        ? 'Şifre koy'
        : mode === 'change'
          ? 'Şifreyi değiştir'
          : 'Kilidi kaldır';

  const confirmLabel =
    mode === 'unlock' ? 'Aç' : mode === 'remove' ? 'Kaldır' : 'Kaydet';

  function dismiss() {
    if (dismissingRef.current) return;
    dismissingRef.current = true;
    // Modal açık kalsın; web'de kapanırken tıklama alttaki karta geçmesin.
    setTimeout(() => {
      dismissingRef.current = false;
      onCancel();
    }, DISMISS_BLOCK_MS);
  }

  function submit() {
    if (mode === 'unlock') {
      const message = validatePassword(password);
      if (message) {
        setLocalError(message);
        return;
      }
      const next = password;
      setPassword('');
      onConfirm(next);
      return;
    }

    if (mode === 'remove') {
      const message = validatePassword(current);
      if (message) {
        setLocalError(message);
        return;
      }
      const next = current;
      setCurrent('');
      onConfirm('', next);
      return;
    }

    if (mode === 'change') {
      const currentError = validatePassword(current);
      if (currentError) {
        setLocalError(currentError);
        return;
      }
    }

    const nextError = validatePassword(password);
    if (nextError) {
      setLocalError(nextError);
      return;
    }
    if (password !== confirm) {
      setLocalError('Şifreler eşleşmiyor.');
      return;
    }
    const nextPassword = password;
    const nextCurrent = mode === 'change' ? current : undefined;
    setPassword('');
    setConfirm('');
    setCurrent('');
    onConfirm(nextPassword, nextCurrent);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <View style={styles.iconWrap}>
            <Ionicons
              name={mode === 'remove' ? 'lock-open-outline' : 'lock-closed-outline'}
              size={26}
              color={colors.forest}
            />
          </View>
          <Text style={styles.title}>{heading}</Text>
          {title ? <Text style={styles.subtitle}>{title}</Text> : null}
          <Text style={styles.message}>
            {mode === 'unlock'
              ? 'İçeriği görmek için bu not defterinin şifresini girin. 2 dakika hareket olmazsa yeniden kilitlenir.'
              : mode === 'set'
                ? 'Bu not defterine özel bir şifre koyun. 2 dakika hareketsizlikte kilit otomatik kapanır.'
                : mode === 'change'
                  ? 'Yeni şifre yalnızca bu not defteri için geçerlidir.'
                  : 'Kilidi kaldırmak için mevcut şifreyi girin.'}
          </Text>
          {mode === 'change' || mode === 'remove' ? (
            <Input
              label="Mevcut şifre"
              value={current}
              onChangeText={(value) => {
                setCurrent(value);
                setLocalError(null);
              }}
              placeholder="Mevcut şifre"
              secureTextEntry
              {...passwordFieldProps}
            />
          ) : null}
          {mode === 'remove' ? null : (
            <Input
              label={mode === 'unlock' ? 'Şifre' : 'Yeni şifre'}
              value={password}
              onChangeText={(value) => {
                setPassword(value);
                setLocalError(null);
              }}
              placeholder="En az 6 karakter"
              secureTextEntry
              {...passwordFieldProps}
            />
          )}
          {mode === 'set' || mode === 'change' ? (
            <Input
              label="Şifre tekrar"
              value={confirm}
              onChangeText={(value) => {
                setConfirm(value);
                setLocalError(null);
              }}
              placeholder="Şifreyi tekrar yazın"
              secureTextEntry
              {...passwordFieldProps}
            />
          ) : null}
          {localError || error ? <Text style={styles.error}>{localError || error}</Text> : null}
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button label="Vazgeç" variant="ghost" onPress={dismiss} disabled={loading} />
            </View>
            <View style={styles.action}>
              {loading ? (
                <View style={styles.loading}>
                  <ActivityIndicator color={colors.forest} />
                </View>
              ) : (
                <Button
                  label={confirmLabel}
                  variant={mode === 'remove' ? 'danger' : 'primary'}
                  onPress={submit}
                />
              )}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.forestSoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.forest,
    textAlign: 'center',
    marginTop: -8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    fontWeight: '600',
    textAlign: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
  },
  loading: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
