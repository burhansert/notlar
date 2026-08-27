import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
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

const WEB_NO_SELECT = Platform.OS === 'web'
  ? ({
      userSelect: 'none',
      WebkitUserSelect: 'none',
      WebkitTouchCallout: 'none',
    } as object)
  : undefined;

type Props = {
  note: Note;
};

type DragState = {
  active: boolean;
  startX: number;
  startScrollX: number;
};

export function NotePagePager({ note }: Props) {
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const scrollXRef = useRef(0);
  const dragRef = useRef<DragState>({ active: false, startX: 0, startScrollX: 0 });
  const [currentPage, setCurrentPage] = useState(0);
  const [dragging, setDragging] = useState(false);

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

  const maxOffset = Math.max(0, (pages.length - 1) * width);

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

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    function endDrag() {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      setDragging(false);
      goToPage(Math.round(scrollXRef.current / width));
    }

    function onMouseMove(event: MouseEvent) {
      if (!dragRef.current.active) return;
      event.preventDefault();
      const deltaX = event.clientX - dragRef.current.startX;
      const nextX = Math.max(
        0,
        Math.min(dragRef.current.startScrollX - deltaX, maxOffset)
      );
      scrollRef.current?.scrollTo({ x: nextX, animated: false });
      syncPageFromOffset(nextX);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', endDrag);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', endDrag);
    };
  }, [maxOffset, width]);

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
    const nextX = Math.max(0, Math.min(scrollXRef.current + delta, maxOffset));

    scrollRef.current?.scrollTo({ x: nextX, animated: false });
    syncPageFromOffset(nextX);
  }

  function handleMouseDown(event: NativeSyntheticEvent<MouseEvent>) {
    if (Platform.OS !== 'web' || pages.length <= 1) return;

    const nativeEvent = event.nativeEvent as unknown as MouseEvent;
    nativeEvent.preventDefault();
    window.getSelection()?.removeAllRanges();

    dragRef.current = {
      active: true,
      startX: nativeEvent.clientX,
      startScrollX: scrollXRef.current,
    };
    setDragging(true);
  }

  return (
    <View style={[styles.container, WEB_NO_SELECT]}>
      {pages.length > 1 ? (
        <View style={styles.indicator}>
          <Text selectable={false} style={styles.indicatorText}>
            {currentPage + 1} / {pages.length}
          </Text>
          <Text selectable={false} style={styles.hint}>
            {Platform.OS === 'web'
              ? 'Fare tekerleği, sürükleyerek veya ok tuşlarıyla gezinin'
              : 'Yatay kaydırarak devamını okuyun'}
          </Text>
        </View>
      ) : null}

      <View
        style={styles.pagerWrap}
        {...(Platform.OS === 'web'
          ? {
              onWheel: handleWheel,
              onMouseDown: handleMouseDown,
            }
          : {})}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          decelerationRate="fast"
          snapToInterval={width}
          snapToAlignment="start"
          disableIntervalMomentum
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onScrollEndDrag={handleScrollEnd}
          onMomentumScrollEnd={handleScrollEnd}
          style={[
            styles.pager,
            WEB_NO_SELECT,
            Platform.OS === 'web' && styles.pagerWeb,
            dragging && styles.pagerDragging,
          ]}
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
  },
  pager: {
    flex: 1,
  },
  pagerWeb: {
    overflow: 'auto',
    cursor: 'grab',
    overscrollBehavior: 'contain',
  } as object,
  pagerDragging: {
    cursor: 'grabbing',
  } as object,
  pagerContent: {
    flexGrow: 1,
  },
});
