import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { LetterGrid } from '@/components/LetterGrid';
import { colors, radius, spacing } from '@/constants/theme';
import { letterRouteParam, TURKISH_LETTERS, type TurkishLetter } from '@/constants/turkish-alphabet';
import { listHandwritingGlyphs } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { HandwritingGlyph } from '@/lib/types';

export default function HandwritingScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [glyphs, setGlyphs] = useState<HandwritingGlyph[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const glyphMap = useMemo(() => {
    const map = new Map<string, HandwritingGlyph>();
    for (const glyph of glyphs) {
      map.set(glyph.letter, glyph);
    }
    return map;
  }, [glyphs]);

  const previewText = useMemo(() => {
    return TURKISH_LETTERS.map((letter) => {
      const glyph = glyphMap.get(letter);
      return glyph && glyph.stroke_data.length > 0 ? letter : '·';
    }).join('');
  }, [glyphMap]);

  const completedCount = useMemo(
    () =>
      TURKISH_LETTERS.filter((letter) => {
        const glyph = glyphMap.get(letter);
        return glyph && glyph.stroke_data.length > 0;
      }).length,
    [glyphMap]
  );

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
            <Text style={styles.previewValue}>{previewText}</Text>
            <Text style={styles.previewMeta}>
              {completedCount === TURKISH_LETTERS.length
                ? 'Tüm harfler hazır!'
                : 'Tamamlanan harfler büyük, eksik harfler nokta ile gösterilir.'}
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
  previewValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.forestDark,
    letterSpacing: 2,
  },
  previewMeta: {
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
});
