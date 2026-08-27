import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { HandwritingCanvas } from '@/components/HandwritingCanvas';
import { HeaderBackButton } from '@/components/HeaderBackButton';
import { Button } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { letterFromRouteParam } from '@/constants/turkish-alphabet';
import { getHandwritingGlyph, upsertHandwritingGlyph } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Stroke } from '@/lib/types';

export default function HandwritingLetterScreen() {
  const { letter: letterParam } = useLocalSearchParams<{ letter: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const letter = letterFromRouteParam(letterParam ?? '');

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!letter) {
      Alert.alert('Geçersiz harf', 'Seçilen harf Türkçe alfabede bulunamadı.');
      router.back();
      return;
    }

    if (!session?.token) {
      setLoading(false);
      return;
    }

    getHandwritingGlyph(session.token, letter)
      .then((glyph) => {
        setStrokes(Array.isArray(glyph?.stroke_data) ? glyph.stroke_data : []);
        setLoading(false);
      })
      .catch(() => {
        setStrokes([]);
        setLoading(false);
      });
  }, [letter, router, session?.token]);

  function undoStroke() {
    setStrokes((current) => current.slice(0, -1));
  }

  function clearStrokes() {
    setStrokes([]);
  }

  async function save() {
    if (!session?.token || !letter) return;
    if (strokes.length === 0) {
      Alert.alert('Boş çizim', 'Kaydetmeden önce harfi çizin.');
      return;
    }

    setSaving(true);
    try {
      await upsertHandwritingGlyph(session.token, letter, strokes);
      router.back();
    } catch (err) {
      Alert.alert('Kaydedilemedi', err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setSaving(false);
    }
  }

  if (!letter) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: `${letter} harfi`,
          headerLeft: () => <HeaderBackButton fallbackHref={'/(tabs)/handwriting' as Href} />,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.help}>
          Parmağınız veya kalemle {letter} harfini çizin. Kaydettiğinizde bu harf kişisel fontunuza
          eklenir.
        </Text>

        <HandwritingCanvas letter={letter} strokes={strokes} onChange={setStrokes} />

        <View style={styles.tools}>
          <View style={styles.toolButton}>
            <Button label="Geri al" variant="secondary" onPress={undoStroke} disabled={loading || saving} />
          </View>
          <View style={styles.toolButton}>
            <Button label="Temizle" variant="ghost" onPress={clearStrokes} disabled={loading || saving} />
          </View>
          <View style={styles.toolButton}>
            <Button label="Kaydet" onPress={save} loading={saving} disabled={loading} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  help: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    fontWeight: '600',
  },
  tools: {
    flexDirection: 'row',
    gap: 10,
  },
  toolButton: {
    flex: 1,
  },
});
