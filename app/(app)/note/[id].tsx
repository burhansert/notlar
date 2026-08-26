import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isNew = id === 'new';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew || !id) {
      setLoading(false);
      return;
    }

    supabase
      .from('notes')
      .select('id, title, content')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          Alert.alert('Not bulunamadı', 'Bu not silinmiş veya erişim yok.');
          router.back();
          return;
        }
        setTitle(data.title ?? '');
        setContent(data.content ?? '');
        setLoading(false);
      });
  }, [id, isNew, router]);

  async function save() {
    if (!user) return;
    if (!title.trim() && !content.trim()) {
      Alert.alert('Boş not', 'Bir başlık veya içerik yazın.');
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        const { error } = await supabase.from('notes').insert({
          user_id: user.id,
          title: title.trim(),
          content: content.trim(),
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notes')
          .update({ title: title.trim(), content: content.trim() })
          .eq('id', id);
        if (error) throw error;
      }
      router.back();
    } catch (err) {
      Alert.alert('Kaydedilemedi', err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (isNew || !id) return;
    Alert.alert('Notu sil', 'Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('notes').delete().eq('id', id);
          if (error) {
            Alert.alert('Silinemedi', error.message);
            return;
          }
          router.back();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: isNew ? 'Yeni not' : 'Notu düzenle' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Başlık"
            placeholderTextColor={colors.muted}
            style={styles.title}
            editable={!loading}
          />
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Notunuzu buraya yazın…"
            placeholderTextColor={colors.muted}
            style={styles.body}
            multiline
            textAlignVertical="top"
            editable={!loading}
          />
        </ScrollView>
        <View style={styles.actions}>
          <View style={styles.save}>
            <Button label={isNew ? 'Kaydet' : 'Güncelle'} onPress={save} loading={saving} />
          </View>
          {isNew ? null : (
            <View style={styles.delete}>
              <Button label="Sil" variant="danger" onPress={remove} />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    flexGrow: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.ink,
    paddingVertical: 8,
  },
  body: {
    flexGrow: 1,
    minHeight: 280,
    fontSize: 17,
    lineHeight: 26,
    color: colors.ink,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: spacing.lg,
    paddingTop: 8,
  },
  save: { flex: 2 },
  delete: { flex: 1 },
});
