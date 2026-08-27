import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { NoteCard } from '@/components/NoteCard';
import { Badge, EmptyState } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { adminDeleteNote, adminListNotes, adminListUsers, adminSetUser } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime, noteCountLabel, notebookCountLabel } from '@/lib/format';
import { noteAuthor, type Note, type ProfileWithNotes, type Role } from '@/lib/types';

type TabKey = 'users' | 'notes';

export default function AdminScreen() {
  const router = useRouter();
  const { profile, session } = useAuth();
  const [tab, setTab] = useState<TabKey>('users');
  const [users, setUsers] = useState<ProfileWithNotes[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session?.token) return;
    try {
      const [userRows, noteRows] = await Promise.all([
        adminListUsers(session.token),
        adminListNotes(session.token),
      ]);
      setUsers(userRows ?? []);
      setNotes(noteRows ?? []);
    } catch (err) {
      Alert.alert('Yüklenemedi', err instanceof Error ? err.message : 'Bilinmeyen hata');
    }
    setLoading(false);
    setRefreshing(false);
  }, [session?.token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const stats = useMemo(
    () => ({
      users: users.length,
      admins: users.filter((user) => user.role === 'admin').length,
      notebooks: users.reduce((sum, user) => sum + (Number(user.notebook_count) || 0), 0),
      notes: notes.length,
    }),
    [users, notes]
  );

  async function updateUser(user: ProfileWithNotes, patch: { role?: Role; is_active?: boolean }) {
    if (!session?.token) return;
    try {
      await adminSetUser(
        session.token,
        user.id,
        patch.role ?? user.role,
        patch.is_active ?? user.is_active
      );
      load();
    } catch (err) {
      Alert.alert('Güncellenemedi', err instanceof Error ? err.message : 'Bilinmeyen hata');
    }
  }

  async function deleteNote(noteId: string) {
    Alert.alert('Notu sil', 'Bu not kalıcı olarak silinecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          if (!session?.token) return;
          try {
            await adminDeleteNote(session.token, noteId);
            load();
          } catch (err) {
            Alert.alert('Silinemedi', err instanceof Error ? err.message : 'Bilinmeyen hata');
          }
        },
      },
    ]);
  }

  function confirmRole(user: ProfileWithNotes) {
    const nextRole: Role = user.role === 'admin' ? 'user' : 'admin';
    Alert.alert(
      nextRole === 'admin' ? 'Yönetici yap' : 'Yetkiyi kaldır',
      `${user.email} için rolü ${nextRole === 'admin' ? 'yönetici' : 'kullanıcı'} olarak değiştir?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Onayla', onPress: () => updateUser(user, { role: nextRole }) },
      ]
    );
  }

  function confirmActive(user: ProfileWithNotes) {
    Alert.alert(
      user.is_active ? 'Hesabı durdur' : 'Hesabı aç',
      `${user.email} ${user.is_active ? 'giriş yapamaz hale gelecek.' : 'yeniden giriş yapabilecek.'}`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: () => updateUser(user, { is_active: !user.is_active }),
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.stats}>
        <Stat label="Kullanıcı" value={stats.users} />
        <Stat label="Yönetici" value={stats.admins} />
        <Stat label="Defter" value={stats.notebooks} />
        <Stat label="Not" value={stats.notes} />
      </View>

      <View style={styles.tabs}>
        <Segment label="Kullanıcılar" active={tab === 'users'} onPress={() => setTab('users')} />
        <Segment label="Tüm notlar" active={tab === 'notes'} onPress={() => setTab('notes')} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.forest} style={{ marginTop: 32 }} />
      ) : tab === 'users' ? (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={<EmptyState icon="people-outline" title="Kullanıcı yok" subtitle="" />}
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <View style={styles.userTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.username}>{item.email}</Text>
                  <Text style={styles.meta}>
                    {notebookCountLabel(Number(item.notebook_count) || 0)} ·{' '}
                    {noteCountLabel(Number(item.note_count) || 0)} · {formatDateTime(item.created_at)}
                  </Text>
                </View>
                <View style={styles.badges}>
                  <Badge
                    label={item.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
                    tone={item.role === 'admin' ? 'admin' : 'success'}
                  />
                  <Badge
                    label={item.is_active ? 'Aktif' : 'Durduruldu'}
                    tone={item.is_active ? 'neutral' : 'danger'}
                  />
                </View>
              </View>
              {item.id === profile?.id ? null : (
                <View style={styles.actions}>
                  <MiniButton
                    label={item.role === 'admin' ? 'Kullanıcı yap' : 'Yönetici yap'}
                    onPress={() => confirmRole(item)}
                  />
                  <MiniButton
                    label={item.is_active ? 'Durdur' : 'Aktifleştir'}
                    onPress={() => confirmActive(item)}
                  />
                </View>
              )}
            </View>
          )}
        />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <EmptyState icon="documents-outline" title="Not yok" subtitle="Henüz hiç not kaydedilmemiş." />
          }
          renderItem={({ item }) => {
            const author = noteAuthor(item);
            return (
              <View style={styles.noteWrap}>
                <NoteCard
                  note={item}
                  author={author}
                  onPress={() => router.push(`/note/${item.id}` as Href)}
                />
                <Pressable onPress={() => deleteNote(item.id)} style={styles.deleteNote}>
                  <Text style={styles.deleteNoteText}>Notu sil</Text>
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Segment({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.segment, active && styles.segmentActive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function MiniButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.mini, { opacity: pressed ? 0.7 : 1 }]}>
      <Text style={styles.miniText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  stats: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.ink },
  statLabel: { color: colors.muted, fontWeight: '700', marginTop: 2 },
  tabs: {
    flexDirection: 'row',
    margin: spacing.lg,
    backgroundColor: colors.paperDark,
    borderRadius: radius.md,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  segmentActive: { backgroundColor: colors.card },
  segmentText: { color: colors.muted, fontWeight: '700' },
  segmentTextActive: { color: colors.ink },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 40 },
  userCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 12,
  },
  userTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  username: { fontSize: 16, fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, marginTop: 4, fontSize: 12, fontWeight: '600' },
  badges: { gap: 6, alignItems: 'flex-end' },
  actions: { flexDirection: 'row', gap: 8 },
  mini: {
    flex: 1,
    backgroundColor: colors.forestSoft,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  miniText: { color: colors.forestDark, fontWeight: '800', fontSize: 13 },
  noteWrap: { gap: 8 },
  deleteNote: { alignSelf: 'flex-end', paddingHorizontal: 4, paddingVertical: 4 },
  deleteNoteText: { color: colors.danger, fontWeight: '700' },
});
