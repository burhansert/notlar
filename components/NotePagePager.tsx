import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { groupLinesIntoPages, linesPerPage, NOTE_BODY_LINE_HEIGHT } from '@/lib/notePagination';
import type { Note } from '@/lib/types';

const TOP_BAR_HEIGHT = 36;
const MEASURE_TIMEOUT_MS = 400;

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
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const wheelLockRef = useRef(false);
  const [pagerHeight, setPagerHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [pages, setPages] = useState<string[] | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const content = note.content.trim() || 'Henüz içerik yok.';
  const bodyWidth = width - spacing.lg * 2 - spacing.md * 2;
  const showPageCount = (pages?.length ?? 0) > 1;

  const layout = useMemo(() => {
    const pagePadding = spacing.lg * 2 + spacing.sm;
    const bodyPadding = spacing.md * 2;
    const firstBodyHeight =
      pagerHeight - headerHeight - pagePadding - bodyPadding;
    const nextBodyHeight = pagerHeight - spacing.lg - spacing.lg - bodyPadding;

    return {
      firstBodyHeight: Math.max(NOTE_BODY_LINE_HEIGHT, firstBodyHeight),
      nextBodyHeight: Math.max(NOTE_BODY_LINE_HEIGHT, nextBodyHeight),
      firstPageCapacity: linesPerPage(firstBodyHeight),
      nextPageCapacity: linesPerPage(nextBodyHeight),
    };
  }, [headerHeight, pagerHeight]);

  useEffect(() => {
    setPages(null);
    setCurrentPage(0);
    setHeaderHeight(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [note.id, width]);

  useEffect(() => {
    if (pages !== null || pagerHeight <= 0 || headerHeight <= 0) return;

    const timeout = setTimeout(() => {
      setPages((current) => current ?? [content]);
    }, MEASURE_TIMEOUT_MS);

    return () => clearTimeout(timeout);
  }, [content, headerHeight, pages, pagerHeight]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !pages || pages.length <= 1) return;

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
  }, [currentPage, pages]);

  function handlePagerLayout(event: LayoutChangeEvent) {
    const nextHeight = event.nativeEvent.layout.height;
    if (nextHeight !== pagerHeight) {
      setPagerHeight(nextHeight);
    }
  }

  function handleHeaderMeasure(height: number) {
    if (height !== headerHeight) {
      setHeaderHeight(height);
    }
  }

  function handleTextMeasure(event: TextLayoutEvent) {
    if (pagerHeight <= 0 || headerHeight <= 0) return;

    const lineTexts = event.nativeEvent.lines.map((line) => line.text);
    const grouped = groupLinesIntoPages(lineTexts, {
      firstPageCapacity: layout.firstPageCapacity,
      nextPageCapacity: layout.nextPageCapacity,
    });
    setPages(grouped);
  }

  function syncPageFromOffset(offsetX: number) {
    if (!pages?.length) return;
    const nextPage = Math.min(
      pages.length - 1,
      Math.max(0, Math.round(offsetX / width))
    );
    setCurrentPage((prev) => (prev === nextPage ? prev : nextPage));
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    syncPageFromOffset(event.nativeEvent.contentOffset.x);
  }

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    syncPageFromOffset(event.nativeEvent.contentOffset.x);
  }

  function goToPage(page: number) {
    if (!pages?.length) return;
    const nextPage = Math.min(pages.length - 1, Math.max(0, page));
    scrollRef.current?.scrollTo({ x: nextPage * width, animated: true });
    setCurrentPage(nextPage);
  }

  function handleWheel(event: NativeSyntheticEvent<WheelEvent>) {
    if (Platform.OS !== 'web' || !pages || pages.length <= 1) return;

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

  const ready = pages !== null && pagerHeight > 0 && headerHeight > 0;

  return (
    <View style={[styles.container, WEB_NO_SELECT]}>
      <View style={styles.topBar}>
        <View style={styles.topBarGroup}>
          <Text selectable={false} style={styles.date}>
            {formatDateTime(note.updated_at)}
          </Text>
          {showPageCount ? (
            <Text selectable={false} style={styles.pageCount}>
              {currentPage + 1} / {pages?.length}
            </Text>
          ) : null}
        </View>
      </View>

      <View
        style={styles.pagerWrap}
        onLayout={handlePagerLayout}
        {...(Platform.OS === 'web' ? { onWheel: handleWheel } : {})}>
        {pagerHeight > 0 ? (
          <View style={styles.measureLayer} pointerEvents="none">
            <NotePageHeaderMeasure
              note={note}
              width={width}
              onLayout={handleHeaderMeasure}
            />
            {headerHeight > 0 ? (
              <Text
                key={`${note.id}-${headerHeight}-${bodyWidth}`}
                style={[noteBodyTextStyle, { width: bodyWidth, marginLeft: spacing.lg + spacing.md }]}
                onTextLayout={handleTextMeasure}>
                {content}
              </Text>
            ) : null}
          </View>
        ) : null}

        {!ready ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.forest} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            decelerationRate="normal"
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={handleScroll}
            onScrollEndDrag={handleScrollEnd}
            onMomentumScrollEnd={handleScrollEnd}
            style={[styles.pager, Platform.OS === 'web' && styles.pagerWeb, WEB_NO_SELECT]}
            contentContainerStyle={styles.pagerContent}>
            {pages.map((page, index) => (
              <NotePageContent
                key={`${note.id}-${index}`}
                note={note}
                content={page}
                showHeader={index === 0}
                width={width}
                pageHeight={pagerHeight}
                bodyMaxHeight={index === 0 ? layout.firstBodyHeight : layout.nextBodyHeight}
              />
            ))}
          </ScrollView>
        )}
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
    opacity: 0,
    top: 0,
    left: 0,
    right: 0,
    zIndex: -1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pager: {
    flex: 1,
  },
  pagerWeb: {
    overflow: 'auto',
    cursor: 'grab',
    overscrollBehavior: 'contain',
    scrollSnapType: 'x mandatory',
  } as object,
  pagerContent: {
    flexGrow: 1,
  },
});
