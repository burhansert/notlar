import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
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
  const scrollRef = useRef<ScrollView>(null);
  const scrollXRef = useRef(0);
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

  useEffect(() => {
    setCurrentPage(0);
    scrollXRef.current = 0;
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [note.id, pages.length, width]);

  useEffect(() => {
    if (Platform.OS !== 'web' || pages.length <= 1) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') {
        goToPage(currentPage - 1);
      }
      if (event.key === 'ArrowRight') {
        goToPage(currentPage + 1);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentPage, pages.length, width]);

  function syncPageFromOffset(offsetX: number) {
    const nextPage = Math.min(
      pages.length - 1,
      Math.max(0, Math.round(offsetX / width))
    );
    scrollXRef.current = offsetX;
    setCurrentPage((prev) => (prev === nextPage ? prev : nextPage));
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    syncPageFromOffset(event.nativeEvent.contentOffset.x);
  }

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    syncPageFromOffset(event.nativeEvent.contentOffset.x);
  }

  function goToPage(page: number) {
    const nextPage = Math.min(pages.length - 1, Math.max(0, page));
    const offsetX = nextPage * width;
    scrollRef.current?.scrollTo({ x: offsetX, animated: true });
    scrollXRef.current = offsetX;
    setCurrentPage(nextPage);
  }

  function handleWheel(event: NativeSyntheticEvent<WheelEvent>) {
    if (Platform.OS !== 'web' || pages.length <= 1) return;

    const nativeEvent = event.nativeEvent as unknown as WheelEvent;
    nativeEvent.preventDefault();

    const delta =
      Math.abs(nativeEvent.deltaX) > Math.abs(nativeEvent.deltaY)
        ? nativeEvent.deltaX
        : nativeEvent.deltaY;
    const maxOffset = (pages.length - 1) * width;
    const nextX = Math.max(0, Math.min(scrollXRef.current + delta, maxOffset));

    scrollRef.current?.scrollTo({ x: nextX, animated: false });
    syncPageFromOffset(nextX);
  }

  return (
    <View style={styles.container}>
      {pages.length > 1 ? (
        <View style={styles.indicator}>
          <Text style={styles.indicatorText}>
            {currentPage + 1} / {pages.length}
          </Text>
          <Text style={styles.hint}>
            {Platform.OS === 'web'
              ? 'Fare tekerleği, ok tuşları veya ok düğmeleriyle gezinin'
              : 'Yatay kaydırarak devamını okuyun'}
          </Text>
        </View>
      ) : null}

      <View style={styles.pagerWrap} {...(Platform.OS === 'web' ? { onWheel: handleWheel } : {})}>
        {Platform.OS === 'web' && pages.length > 1 && currentPage > 0 ? (
          <Pressable
            onPress={() => goToPage(currentPage - 1)}
            style={({ pressed }) => [styles.navButton, styles.navLeft, { opacity: pressed ? 0.7 : 1 }]}>
            <Ionicons name="chevron-back" size={22} color={colors.forest} />
          </Pressable>
        ) : null}

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          decelerationRate="fast"
          snapToInterval={width}
          snapToAlignment="start"
          disableIntervalMomentum
          showsHorizontalScrollIndicator={Platform.OS === 'web'}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onScrollEndDrag={handleScrollEnd}
          onMomentumScrollEnd={handleScrollEnd}
          style={[styles.pager, Platform.OS === 'web' && styles.pagerWeb]}
          contentContainerStyle={styles.pagerContent}>
          {pages.map((page, index) => (
            <NotePageContent
              key={`${note.id}-${index}`}
              note={note}
              content={page}
              showHeader={index === 0}
              width={width}
            />
          ))}
        </ScrollView>

        {Platform.OS === 'web' && pages.length > 1 && currentPage < pages.length - 1 ? (
          <Pressable
            onPress={() => goToPage(currentPage + 1)}
            style={({ pressed }) => [styles.navButton, styles.navRight, { opacity: pressed ? 0.7 : 1 }]}>
            <Ionicons name="chevron-forward" size={22} color={colors.forest} />
          </Pressable>
        ) : null}
      </View>
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
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  pagerWrap: {
    flex: 1,
    position: 'relative',
  },
  pager: {
    flex: 1,
  },
  pagerWeb: {
    overflow: 'auto',
    cursor: 'grab',
    overscrollBehavior: 'contain',
  } as object,
  pagerContent: {
    flexGrow: 1,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(28, 25, 22, 0.12)',
      },
      default: {
        shadowColor: '#1C1916',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  navLeft: {
    left: spacing.sm,
  },
  navRight: {
    right: spacing.sm,
  },
});
