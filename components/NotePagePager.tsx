import { useMemo, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { NotePageContent } from '@/components/NotePageContent';
import { colors, spacing } from '@/constants/theme';
import { charsPerPage, paginateText } from '@/lib/notePagination';
import type { Note } from '@/lib/types';

const INDICATOR_HEIGHT = 44;
const STACK_HEADER_HEIGHT = 96;

type Props = {
  note: Note;
};

export function NotePagePager({ note }: Props) {
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<string>>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const content = note.content.trim() || 'Henüz içerik yok.';
  const bodyWidth = width - spacing.lg * 2 - spacing.md * 2;

  const pages = useMemo(() => {
    const headerBlock =
      34 + spacing.sm + 20 + spacing.sm + spacing.md * 2 + spacing.sm;
    const pagePadding = spacing.lg * 2;

    const firstBodyHeight =
      height - STACK_HEADER_HEIGHT - INDICATOR_HEIGHT - headerBlock - pagePadding;
    const nextBodyHeight =
      height - STACK_HEADER_HEIGHT - INDICATOR_HEIGHT - pagePadding - spacing.md * 2;

    return paginateText(content, {
      firstPageChars: charsPerPage(firstBodyHeight, bodyWidth),
      nextPageChars: charsPerPage(nextBodyHeight, bodyWidth),
    });
  }, [bodyWidth, content, height]);

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const nextPage = Math.round(event.nativeEvent.contentOffset.x / width);
    if (nextPage >= 0 && nextPage < pages.length) {
      setCurrentPage(nextPage);
    }
  }

  return (
    <View style={styles.container}>
      {pages.length > 1 ? (
        <View style={styles.indicator}>
          <Text style={styles.indicatorText}>
            {currentPage + 1} / {pages.length}
          </Text>
          <Text style={styles.hint}>Yatay kaydırarak devamını okuyun</Text>
        </View>
      ) : null}

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
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
});
