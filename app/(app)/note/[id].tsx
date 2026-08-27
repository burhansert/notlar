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
import { createNote, deleteNote, getNote, updateNote } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function NoteEditorScreen() {
  const { id, sectionId } = useLocalSearchParams<{
    id: string;
    sectionId?: string;
  }>();
  const router = useRouter();
  const { session } = useAuth();
  const isNew = id === 'new';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew || !id || !session?.token) {
      setLoading(false);
      return;
    }

    getNote(session.token, id)
      .then((data) => {
        setTitle(data.title ?? '');
        setContent(data.content ?? '');
        setLoading(false);
      })
      .catch((err) => {
        Alert.alert('Not bulunamadı', err instanceof Error ? err.message : 'Erişim yok.');
        router.back();
      });
  }, [id, isNew, router, session?.token]);

  async function save() {
    if (!session?.token) return;
    if (!title.trim() && !content.trim()) {
      Alert.alert('Boş not', 'Bir başlık veya içerik yazın.');
      return;
    }

    if (isNew && !sectionId) {
      Alert.alert('Bölüm seçilmedi', 'Not oluşturmak için bir bölüm açın.');
      return;
    }

    setSaving(true);
    try {
      if (isNew && sectionId) {
        await createNote(session.token, sectionId, title.trim(), content.trim());
      } else if (id) {
        await updateNote(session.token, id, title.trim(), content.trim());
      }
      router.back();
    } catch (err) {
      Alert.alert('Kaydedilemedi', err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (isNew || !id || !session?.token) return;
    Alert.alert('Notu sil', 'Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteNote(session.token, id);
            router.back();
          } catch (err) {
            Alert.alert('Silinemedi', err instanceof Error ? err.message : 'Bilinmeyen hata');
          }
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
          <View style={styles.action}>
            <Button label={isNew ? 'Kaydet' : 'Güncelle'} onPress={save} loading={saving} />
          </View>
          {isNew ? null : (
            <View style={styles.action}>
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
  action: { flex: 1 },
});
