import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type TextLayoutEvent,
} from 'react-native';

import {
  NotePageContent,
  NotePageHeaderMeasure,
  noteBodyTextStyle,
} from '@/components/NotePageContent';
import { colors, spacing } from '@/constants/theme';
import { formatDateTime } from '@/lib/format';
import {
  DEFAULT_TITLE_HEADER_HEIGHT,
  paginateContent,
  pageLayoutMetrics,
} from '@/lib/notePagination';
import type { Note } from '@/lib/types';

const TOP_BAR_HEIGHT = 36;

const WEB_NO_SELECT =
  Platform.OS === 'web'
    ? ({
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      } as object)
    : undefined;

type Props = {
  note: Note;
};

export function NotePagePager({ note }: Props) {
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const scrollXRef = useRef(0);
  const wheelLockRef = useRef(false);
  const dragRef = useRef({ active: false, startX: 0, startScrollX: 0 });
  const pagesRef = useRef<string[]>([]);
  const widthRef = useRef(width);
  const [pagerHeight, setPagerHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(DEFAULT_TITLE_HEADER_HEIGHT);
  const [measuredPages, setMeasuredPages] = useState<string[] | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [dragging, setDragging] = useState(false);

  const content = note.content.trim() || 'Henüz içerik yok.';
  const bodyWidth = width - spacing.lg * 2 - spacing.md * 2;
  const layoutKey = `${note.id}:${width}:${height}:${pagerHeight}:${headerHeight}`;

  const capacities = useMemo(() => {
    if (pagerHeight <= 0) {
      return { firstPageCapacity: 1, nextPageCapacity: 1 };
    }
    const metrics = pageLayoutMetrics(pagerHeight, headerHeight);
    return {
      firstPageCapacity: metrics.firstPageCapacity,
      nextPageCapacity: metrics.nextPageCapacity,
    };
  }, [headerHeight, pagerHeight]);

  const estimatedPages = useMemo(() => {
    if (pagerHeight <= 0) return [content];
    return paginateContent(content, {
      bodyWidth,
      firstPageCapacity: capacities.firstPageCapacity,
      nextPageCapacity: capacities.nextPageCapacity,
    });
  }, [bodyWidth, capacities.firstPageCapacity, capacities.nextPageCapacity, content, pagerHeight]);

  const pages = measuredPages ?? estimatedPages;
  const showPageCount = pages.length > 1;

  pagesRef.current = pages;
  widthRef.current = width;

  useEffect(() => {
    setMeasuredPages(null);
    setCurrentPage(0);
    scrollXRef.current = 0;
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [layoutKey]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    function onMouseMove(event: MouseEvent) {
      if (!dragRef.current.active) return;
      event.preventDefault();

      const pageWidth = widthRef.current;
      const pageCount = pagesRef.current.length;
      const maxOffset = Math.max(0, (pageCount - 1) * pageWidth);
      const deltaX = event.clientX - dragRef.current.startX;
      const nextX = Math.max(
        0,
        Math.min(dragRef.current.startScrollX - deltaX, maxOffset)
      );

      scrollRef.current?.scrollTo({ x: nextX, animated: false });
      scrollXRef.current = nextX;
      syncPageFromOffset(nextX);
    }

    function onMouseUp() {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      setDragging(false);

      const pageWidth = widthRef.current;
      const pageCount = pagesRef.current.length;
      const nextPage = Math.min(
        pageCount - 1,
        Math.max(0, Math.round(scrollXRef.current / pageWidth))
      );
      scrollRef.current?.scrollTo({ x: nextPage * pageWidth, animated: true });
      scrollXRef.current = nextPage * pageWidth;
      setCurrentPage(nextPage);
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

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
  }, [currentPage, pages.length]);

  function handlePagerLayout(event: LayoutChangeEvent) {
    const nextHeight = Math.floor(event.nativeEvent.layout.height);
    if (nextHeight > 0 && nextHeight !== pagerHeight) {
      setPagerHeight(nextHeight);
    }
  }

  function handleHeaderMeasure(nextHeight: number) {
    if (nextHeight > 0 && nextHeight !== headerHeight) {
      setHeaderHeight(nextHeight);
    }
  }

  function handleTextMeasure(event: TextLayoutEvent) {
    if (pagerHeight <= 0) return;

    const lineTexts = event.nativeEvent.lines.map((line) => line.text);
    const grouped = paginateContent(content, {
      bodyWidth,
      firstPageCapacity: capacities.firstPageCapacity,
      nextPageCapacity: capacities.nextPageCapacity,
      lineTexts,
    });
    setMeasuredPages(grouped);
  }

  function syncPageFromOffset(offsetX: number) {
    const pageCount = pagesRef.current.length;
    if (!pageCount) return;
    const pageWidth = widthRef.current;
    const nextPage = Math.min(pageCount - 1, Math.max(0, Math.round(offsetX / pageWidth)));
    setCurrentPage((prev) => (prev === nextPage ? prev : nextPage));
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollXRef.current = event.nativeEvent.contentOffset.x;
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

  function handleMouseDown(event: NativeSyntheticEvent<MouseEvent>) {
    if (Platform.OS !== 'web' || pages.length <= 1) return;

    const nativeEvent = event.nativeEvent as unknown as MouseEvent;
    if (nativeEvent.button !== 0) return;

    dragRef.current = {
      active: true,
      startX: nativeEvent.clientX,
      startScrollX: scrollXRef.current,
    };
    setDragging(true);
    window.getSelection()?.removeAllRanges();
  }

  function handleWheel(event: NativeSyntheticEvent<WheelEvent>) {
    if (Platform.OS !== 'web' || pages.length <= 1) return;

    const nativeEvent = event.nativeEvent as unknown as WheelEvent;
    nativeEvent.preventDefault();
    if (wheelLockRef.current) return;

    const delta =
      Math.abs(nativeEvent.deltaX) > Math.abs(nativeEvent.deltaY)
        ? nativeEvent.deltaX
        : nativeEvent.deltaY;
    if (Math.abs(delta) < 8) return;

    wheelLockRef.current = true;
    goToPage(currentPage + (delta > 0 ? 1 : -1));
    window.setTimeout(() => {
      wheelLockRef.current = false;
    }, 350);
  }

  const canRender = pagerHeight > 0 && width > 0;

  return (
    <View style={[styles.container, WEB_NO_SELECT]}>
      <View style={styles.topBar}>
        <View style={styles.topBarGroup}>
          <Text selectable={false} style={styles.date}>
            {formatDateTime(note.updated_at)}
          </Text>
          {showPageCount ? (
            <Text selectable={false} style={styles.pageCount}>
              {currentPage + 1} / {pages.length}
            </Text>
          ) : null}
        </View>
      </View>

      <View
        style={styles.pagerWrap}
        onLayout={handlePagerLayout}
        {...(Platform.OS === 'web'
          ? { onWheel: handleWheel, onMouseDown: handleMouseDown }
          : {})}>
        <View style={styles.measureLayer} pointerEvents="none">
          <NotePageHeaderMeasure note={note} width={width} onLayout={handleHeaderMeasure} />
          {canRender ? (
            <Text
              key={layoutKey}
              style={[noteBodyTextStyle, styles.measureText, { width: bodyWidth }]}
              onTextLayout={handleTextMeasure}>
              {content}
            </Text>
          ) : null}
        </View>

        {canRender ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            decelerationRate="normal"
            showsHorizontalScrollIndicator={Platform.OS === 'web'}
            scrollEventThrottle={16}
            onScroll={handleScroll}
            onScrollEndDrag={handleScrollEnd}
            onMomentumScrollEnd={handleScrollEnd}
            style={[
              styles.pager,
              Platform.OS === 'web' && styles.pagerWeb,
              dragging && styles.pagerDragging,
              WEB_NO_SELECT,
            ]}
            contentContainerStyle={styles.pagerContent}>
            {pages.map((page, index) => (
              <NotePageContent
                key={`${layoutKey}-${index}`}
                note={note}
                content={page}
                showHeader={index === 0}
                width={width}
                pageHeight={pagerHeight}
              />
            ))}
          </ScrollView>
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
  topBar: {
    height: TOP_BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  topBarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  date: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
  },
  pageCount: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.forest,
  },
  pagerWrap: {
    flex: 1,
  },
  measureLayer: {
    position: 'absolute',
    left: -10000,
    top: 0,
    width: '100%',
  },
  measureText: {
    paddingHorizontal: spacing.lg + spacing.md,
  },
  pager: {
    flex: 1,
  },
  pagerWeb: {
    overflowX: 'auto',
    overflowY: 'hidden',
    cursor: 'grab',
    overscrollBehavior: 'contain',
    scrollSnapType: 'x mandatory',
  } as object,
  pagerDragging: {
    cursor: 'grabbing',
  } as object,
  pagerContent: {
    alignItems: 'stretch',
  },
});
