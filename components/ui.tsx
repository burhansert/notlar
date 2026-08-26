import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/constants/theme';

export function Screen({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <SafeAreaView style={[styles.screen, style]} edges={['top', 'left', 'right']}>
      {children}
    </SafeAreaView>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
}) {
  const palette = {
    primary: { bg: colors.forest, text: colors.white },
    secondary: { bg: colors.forestSoft, text: colors.forestDark },
    danger: { bg: colors.dangerSoft, text: colors.danger },
    ghost: { bg: 'transparent', text: colors.ink },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, opacity: pressed || disabled ? 0.7 : 1 },
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <Text style={[styles.buttonLabel, { color: palette.text }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Input({
  label,
  error,
  secureTextEntry,
  ...props
}: TextInputProps & { label: string; error?: string | null }) {
  const [hidden, setHidden] = useState(Boolean(secureTextEntry));

  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
        <TextInput
          placeholderTextColor={colors.muted}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={secureTextEntry ? hidden : false}
          {...props}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((value) => !value)} hitSlop={8}>
            <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.inputError}>{error}</Text> : null}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.forest} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
  );
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'admin' | 'success' | 'danger';
}) {
  const palette = {
    neutral: { bg: colors.paperDark, text: colors.ink },
    admin: { bg: colors.adminSoft, text: colors.admin },
    success: { bg: colors.forestSoft, text: colors.forestDark },
    danger: { bg: colors.dangerSoft, text: colors.danger },
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <View style={styles.errorBanner}>
      <Ionicons name="alert-circle" size={18} color={colors.danger} />
      <Text style={styles.errorBannerText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  inputWrap: {
    gap: 8,
  },
  inputLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  inputRow: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputRowError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    color: colors.ink,
    fontSize: 16,
    paddingVertical: 12,
  },
  inputError: {
    color: colors.danger,
    fontSize: 12,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: spacing.lg,
    gap: 8,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.forestSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  errorBannerText: {
    flex: 1,
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
});
