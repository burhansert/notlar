import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { HandwritingTextPreview } from '@/components/HandwritingTextPreview';
import { LetterGrid } from '@/components/LetterGrid';
import { colors, radius, spacing } from '@/constants/theme';
import { letterRouteParam, TURKISH_LETTERS, type TurkishLetter } from '@/constants/turkish-alphabet';
import { listHandwritingGlyphs } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { buildGlyphMap } from '@/lib/handwriting';
import type { HandwritingGlyph } from '@/lib/types';

export default function HandwritingScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [glyphs, setGlyphs] = useState<HandwritingGlyph[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [previewInput, setPreviewInput] = useState('Merhaba dünya');

  const load = useCallback(async () => {
    if (!session?.token) {
      setGlyphs([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await listHandwritingGlyphs(session.token);
      setGlyphs(data ?? []);
    } catch {
      setGlyphs([]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [session?.token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const glyphMap = useMemo(() => buildGlyphMap(glyphs), [glyphs]);

  const completedCount = useMemo(() => glyphMap.size, [glyphMap]);

  function openLetter(letter: TurkishLetter) {
    router.push(`/handwriting/${letterRouteParam(letter)}` as Href);
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator color={colors.forest} style={styles.loader} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={colors.forest}
            />
          }>
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Kendi el yazın fontunuzu oluşturun</Text>
            <Text style={styles.heroText}>
              Her harfe dokunarak kendi çiziminizi kaydedin. Font yalnızca sizin hesabınıza
              aittir.
            </Text>
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Font önizleme</Text>
            <TextInput
              value={previewInput}
              onChangeText={setPreviewInput}
              placeholder="Metninizi yazın…"
              placeholderTextColor={colors.muted}
              style={styles.previewInput}
              multiline
            />
            <HandwritingTextPreview text={previewInput} glyphMap={glyphMap} />
            <Text style={styles.previewMeta}>
              {completedCount === 0
                ? 'Önce harfleri çizerek fontunuzu oluşturun.'
                : completedCount === TURKISH_LETTERS.length
                  ? 'Tüm harfler hazır. Metniniz tamamen el yazınızla görünür.'
                  : 'Çizilmemiş harfler soluk görünür; tamamladıkça el yazınızla değişir.'}
            </Text>
          </View>

          <LetterGrid glyphs={glyphs} onPressLetter={openLetter} />
        </ScrollView>
      )}
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
    paddingBottom: 120,
    gap: spacing.lg,
  },
  loader: {
    marginTop: 40,
  },
  hero: {
    gap: 8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
  },
  heroText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    fontWeight: '500',
  },
  previewCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 8,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
  previewInput: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
    fontWeight: '600',
  },
  previewMeta: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
});
