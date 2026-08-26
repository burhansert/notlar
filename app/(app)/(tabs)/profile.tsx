import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, Button } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { formatDateTime, noteCountLabel } from '@/lib/format';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { profile, isAdmin, signOut } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadCount = useCallback(async () => {
    if (!profile) return;
    const { count: nextCount } = await supabase
      .from('notes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id);
    setCount(nextCount ?? 0);
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      loadCount();
    }, [loadCount])
  );

  async function onSignOut() {
    setLoading(true);
    try {
      await signOut();
    } catch (err) {
      Alert.alert('Çıkış yapılamadı', err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile?.username ?? '?').slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>@{profile?.username}</Text>
        <View style={styles.badges}>
          <Badge
            label={isAdmin ? 'Yönetici' : 'Kullanıcı'}
            tone={isAdmin ? 'admin' : 'success'}
          />
          <Badge label={noteCountLabel(count)} />
        </View>
      </View>

      <View style={styles.card}>
        <Row label="Kullanıcı adı" value={profile?.username ?? '—'} />
        <Row label="Rol" value={isAdmin ? 'Yönetici' : 'Kullanıcı'} />
        <Row
          label="Kayıt tarihi"
          value={profile?.created_at ? formatDateTime(profile.created_at) : '—'}
        />
      </View>

      <Button label="Çıkış yap" variant="danger" onPress={onSignOut} loading={loading} />
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    backgroundColor: colors.paper,
  },
  hero: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 34,
    fontWeight: '800',
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.ink,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: {
    color: colors.muted,
    fontWeight: '700',
  },
  rowValue: {
    color: colors.ink,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
});
