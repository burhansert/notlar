import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { NotebookSectionPicker } from '@/components/NotebookSectionPicker';
import { NotebookSessionGate } from '@/components/NotebookSessionGate';
import { Button } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { createNote, deleteNote, getNote, updateNote } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { isNotebookLockedError, useNotebookLock } from '@/lib/notebookLock';
import type { Notebook, Section } from '@/lib/types';

export default function NoteEditorScreen() {
  const {
    id,
    sectionId: routeSectionId,
    notebookId: routeNotebookId,
    notebookTitle: routeNotebookTitle,
    sectionTitle: routeSectionTitle,
  } = useLocalSearchParams<{
    id: string;
    sectionId?: string;
    notebookId?: string;
    notebookTitle?: string;
    sectionTitle?: string;
  }>();
  const router = useRouter();
  const { session } = useAuth();
  const { markProtected, needsUnlock } = useNotebookLock();
  const isNew = id === 'new';

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string | undefined>(routeSectionId);
  const [activeNotebookId, setActiveNotebookId] = useState(routeNotebookId);
  const [notebookTitle, setNotebookTitle] = useState(routeNotebookTitle?.trim() ?? '');
  const [sectionTitle, setSectionTitle] = useState(routeSectionTitle?.trim() ?? '');

  const locked = needsUnlock(activeNotebookId);

  useEffect(() => {
    if (isNew || !id || !session?.token || locked) {
      if (isNew || locked) setLoading(false);
      return;
    }

    getNote(session.token, id)
      .then((data) => {
        setTitle(data.title ?? '');
        setContent(data.content ?? '');
        setSelectedSectionId(data.section_id);
        if (data.notebook_id) {
          setActiveNotebookId(data.notebook_id);
        }
        setNotebookTitle(data.notebook_title ?? '');
        setSectionTitle(data.section_title ?? '');
        setLoading(false);
      })
      .catch((err) => {
        if (isNotebookLockedError(err) && (activeNotebookId || routeNotebookId)) {
          markProtected(activeNotebookId || routeNotebookId || '', true);
          setLoading(false);
          return;
        }
        Alert.alert('Not bulunamadı', err instanceof Error ? err.message : 'Erişim yok.');
        router.back();
      });
  }, [activeNotebookId, id, isNew, locked, markProtected, routeNotebookId, router, session?.token]);

  function handleLocationSelect(notebook: Notebook, section: Section) {
    setSelectedSectionId(section.id);
    setActiveNotebookId(notebook.id);
    setNotebookTitle(notebook.title);
    setSectionTitle(section.title);
    setPickerOpen(false);
  }

  async function save() {
    if (!session?.token) return;
    if (!title.trim() && !content.trim()) {
      Alert.alert('Boş not', 'Bir başlık veya içerik yazın.');
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        const listContext =
          selectedSectionId || routeSectionId
            ? undefined
            : routeNotebookId
              ? 'sections'
              : 'notebooks';

        await createNote(session.token, title.trim(), content.trim(), {
          sectionId: selectedSectionId ?? routeSectionId,
          notebookId: activeNotebookId,
          listContext,
        });
      } else if (id) {
        await updateNote(session.token, id, title.trim(), content.trim(), selectedSectionId);
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

  const locationLabel =
    notebookTitle && sectionTitle
      ? `${notebookTitle} · ${sectionTitle}`
      : selectedSectionId
        ? 'Bölüm seçildi'
        : 'Otomatik yerleştirilecek';

  return (
    <NotebookSessionGate
      notebookId={activeNotebookId}
      title={notebookTitle || 'Not defteri'}>
    <View style={styles.container}>
      <Stack.Screen options={{ title: isNew ? 'Yeni not' : 'Notu düzenle' }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => [styles.location, { opacity: pressed ? 0.85 : 1 }]}>
            <Ionicons name="folder-open-outline" size={18} color={colors.forest} />
            <View style={styles.locationText}>
              <Text style={styles.locationLabel}>Konum</Text>
              <Text style={styles.locationValue} numberOfLines={1}>
                {locationLabel}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
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
      {session?.token ? (
        <NotebookSectionPicker
          visible={pickerOpen}
          mode="section"
          token={session.token}
          selectedSectionId={selectedSectionId}
          onSelectNotebook={() => {}}
          onSelectSection={handleLocationSelect}
          onCancel={() => setPickerOpen(false)}
        />
      ) : null}
    </View>
    </NotebookSessionGate>
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
  location: {
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationText: {
    flex: 1,
    gap: 2,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  locationValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
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
