import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type TextLayoutEvent,
} from 'react-native';

import { NotePageContent, notePageMeasureStyles } from '@/components/NotePageContent';
import { colors, spacing } from '@/constants/theme';
import { formatDateTime } from '@/lib/format';
import { groupLinesIntoPages, linesPerPage } from '@/lib/notePagination';
import type { Note } from '@/lib/types';

const INDICATOR_HEIGHT = 44;

type Props = {
  note: Note;
  onPageChange?: (page: number, total: number) => void;
};

export function NotePagePager({ note, onPageChange }: Props) {
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<string>>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [pages, setPages] = useState<string[] | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const content = note.content.trim() || 'Henüz içerik yok.';
  const bodyWidth = width - spacing.lg * 2 - spacing.md * 2;

  const capacities = useMemo(() => {
    const firstPageBodyHeight =
      height -
      INDICATOR_HEIGHT -
      headerHeight -
      spacing.lg * 2 -
      spacing.md * 2 -
      spacing.sm;
    const nextPageBodyHeight = height - INDICATOR_HEIGHT - spacing.lg * 2 - spacing.md * 2;

    return {
      firstPageCapacity: linesPerPage(firstPageBodyHeight),
      nextPageCapacity: linesPerPage(nextPageBodyHeight),
    };
  }, [headerHeight, height]);

  useEffect(() => {
    setPages(null);
    setCurrentPage(0);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [note.id, width, height, headerHeight, capacities.firstPageCapacity, capacities.nextPageCapacity]);

  function handleMeasure(event: TextLayoutEvent) {
    const lineTexts = event.nativeEvent.lines.map((line) => line.text);
    const grouped = groupLinesIntoPages(lineTexts, capacities);
    setPages(grouped);
    onPageChange?.(0, grouped.length);
  }

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextPage = Math.round(event.nativeEvent.contentOffset.x / width);
    if (!pages || nextPage < 0 || nextPage >= pages.length) return;
    setCurrentPage(nextPage);
    onPageChange?.(nextPage, pages.length);
  }

  const measuring = pages === null;

  return (
    <View style={styles.container}>
      {measuring ? (
        <View style={styles.measureLayer} pointerEvents="none">
          <View
            style={[styles.measureHeader, { width }]}
            onLayout={(event) => {
              const nextHeight = event.nativeEvent.layout.height;
              if (nextHeight !== headerHeight) {
                setHeaderHeight(nextHeight);
              }
            }}>
            <View style={styles.measureInner}>
              <Text style={styles.measureTitle}>{note.title.trim() || 'Başlıksız not'}</Text>
              <Text style={styles.measureMeta}>{formatDateTime(note.updated_at)}</Text>
              {note.notebook_title || note.section_title ? (
                <Text style={styles.measureContext}>
                  {[note.notebook_title, note.section_title].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
            </View>
          </View>
          <Text
            style={[notePageMeasureStyles.body, { width: bodyWidth }]}
            onTextLayout={headerHeight > 0 ? handleMeasure : undefined}>
            {content}
          </Text>
        </View>
      ) : null}

      {pages && pages.length > 1 ? (
        <View style={styles.indicator}>
          <Text style={styles.indicatorText}>
            {currentPage + 1} / {pages.length}
          </Text>
          <Text style={styles.hint}>Yatay kaydırarak devamını okuyun</Text>
        </View>
      ) : null}

      {pages ? (
        <FlatList
          ref={listRef}
          data={pages}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => `${note.id}-${index}`}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
          onMomentumScrollEnd={handleScrollEnd}
          renderItem={({ item, index }) => (
            <NotePageContent
              note={note}
              content={item}
              showHeader={index === 0}
              width={width}
            />
          )}
        />
      ) : (
        <View style={styles.loadingPage}>
          <ActivityIndicator color={colors.forest} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  measureLayer: {
    position: 'absolute',
    opacity: 0,
    left: 0,
    right: 0,
    top: 0,
  },
  measureHeader: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  measureInner: {
    gap: spacing.sm,
  },
  measureTitle: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  measureMeta: {
    fontSize: 13,
    fontWeight: '600',
  },
  measureContext: {
    fontSize: 13,
    fontWeight: '700',
  },
  indicator: {
    height: INDICATOR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  indicatorText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.forest,
  },
  hint: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  loadingPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
