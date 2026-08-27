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
} from 'react-native';

import { GlyphSizeSlider } from '@/components/GlyphSizeSlider';
import { HandwritingTextPreview } from '@/components/HandwritingTextPreview';
import {
  DEFAULT_HANDWRITING_GLYPH_SIZE,
  MAX_HANDWRITING_GLYPH_SIZE,
  MIN_HANDWRITING_GLYPH_SIZE,
} from '@/constants/handwriting';
import { colors, radius, spacing } from '@/constants/theme';
import { getHandwritingGlyphSize, setHandwritingGlyphSize } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import {
  handwritingPageLayoutMetrics,
  paginateHandwritingContent,
} from '@/lib/handwritingPagination';
import { DEFAULT_TITLE_HEADER_HEIGHT } from '@/lib/notePagination';
import type { HandwritingCharacter } from '@/constants/turkish-alphabet';
import type { Note, Stroke } from '@/lib/types';

const TOP_BAR_HEIGHT = 40;

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
  glyphMap: Map<HandwritingCharacter, Stroke[]>;
};

function HandwritingPageContent({
  note,
  content,
  glyphMap,
  glyphSize,
  showHeader,
  width,
  pageHeight,
}: {
  note: Note;
  content: string;
  glyphMap: Map<HandwritingCharacter, Stroke[]>;
  glyphSize: number;
  showHeader: boolean;
  width: number;
  pageHeight: number;
}) {
  return (
    <View style={[styles.page, { width, height: pageHeight }]}>
      <View style={styles.inner}>
        {showHeader ? (
          <Text selectable={false} style={styles.title}>
            {note.title.trim() || 'Başlıksız not'}
          </Text>
        ) : null}
        <View style={styles.bodyCard}>
          <HandwritingTextPreview text={content} glyphMap={glyphMap} glyphSize={glyphSize} />
        </View>
      </View>
    </View>
  );
}

function HandwritingHeaderMeasure({
  note,
  width,
  onLayout,
}: {
  note: Note;
  width: number;
  onLayout: (height: number) => void;
}) {
  return (
    <View
      style={{ width, paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}
      onLayout={(event) => onLayout(event.nativeEvent.layout.height)}>
      <Text style={styles.title}>{note.title.trim() || 'Başlıksız not'}</Text>
    </View>
  );
}

export function HandwritingNotePager({ note, glyphMap }: Props) {
  const { session } = useAuth();
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const scrollXRef = useRef(0);
  const wheelLockRef = useRef(false);
  const dragRef = useRef({ active: false, startX: 0, startScrollX: 0, startPage: 0 });
  const pagesRef = useRef<string[]>([]);
  const widthRef = useRef(width);
  const currentPageRef = useRef(0);
  const skipNextSaveRef = useRef(true);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pagerHeight, setPagerHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(DEFAULT_TITLE_HEADER_HEIGHT);
  const [glyphSize, setGlyphSize] = useState(DEFAULT_HANDWRITING_GLYPH_SIZE);
  const [glyphSizeReady, setGlyphSizeReady] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    skipNextSaveRef.current = true;
    setGlyphSizeReady(false);

    if (!session?.token) {
      setGlyphSizeReady(true);
      return;
    }

    let cancelled = false;

    getHandwritingGlyphSize(session.token)
      .then((savedSize) => {
        if (cancelled) return;
        if (
          typeof savedSize === 'number' &&
          savedSize >= MIN_HANDWRITING_GLYPH_SIZE &&
          savedSize <= MAX_HANDWRITING_GLYPH_SIZE
        ) {
          setGlyphSize(savedSize);
        }
      })
      .catch(() => {
        // Kayıtlı değer okunamazsa varsayılan boyut kullanılır.
      })
      .finally(() => {
        if (!cancelled) {
          setGlyphSizeReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.token]);

  useEffect(() => {
    if (!session?.token || !glyphSizeReady) return;

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      setHandwritingGlyphSize(session.token, glyphSize).catch(() => {
        // Kayıt başarısız olursa yerel değer kullanılmaya devam eder.
      });
    }, 400);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [glyphSize, glyphSizeReady, session?.token]);

  const content = note.content.trim() || 'Henüz içerik yok.';
  const bodyWidth = width - spacing.lg * 2 - spacing.md * 2;
  const layoutKey = `${note.id}:${width}:${height}:${pagerHeight}:${headerHeight}:${glyphSize}`;

  const capacities = useMemo(() => {
    if (pagerHeight <= 0) {
      return { firstPageCapacity: 1, nextPageCapacity: 1 };
    }
    return handwritingPageLayoutMetrics(pagerHeight, headerHeight, glyphSize);
  }, [glyphSize, headerHeight, pagerHeight]);

  const pages = useMemo(() => {
    if (pagerHeight <= 0) return [content];
    return paginateHandwritingContent(content, {
      bodyWidth,
      firstPageCapacity: capacities.firstPageCapacity,
      nextPageCapacity: capacities.nextPageCapacity,
      glyphSize,
    });
  }, [
    bodyWidth,
    capacities.firstPageCapacity,
    capacities.nextPageCapacity,
    content,
    glyphSize,
    pagerHeight,
  ]);

  pagesRef.current = pages;
  widthRef.current = width;
  currentPageRef.current = currentPage;

  useEffect(() => {
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
    }

    function onMouseUp() {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      setDragging(false);

      const pageWidth = widthRef.current;
      const pageCount = pagesRef.current.length;
      const offset = scrollXRef.current;
      const moved = offset - dragRef.current.startScrollX;
      let targetPage = dragRef.current.startPage;

      if (Math.abs(moved) > pageWidth * 0.12) {
        targetPage += moved > 0 ? 1 : -1;
      }

      targetPage = Math.min(pageCount - 1, Math.max(0, targetPage));
      scrollRef.current?.scrollTo({ x: targetPage * pageWidth, animated: true });
      scrollXRef.current = targetPage * pageWidth;
      setCurrentPage(targetPage);
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

  function syncPageFromOffset(offsetX: number) {
    const pageCount = pagesRef.current.length;
    if (!pageCount) return;
    const pageWidth = widthRef.current;
    const nextPage = Math.min(pageCount - 1, Math.max(0, Math.round(offsetX / pageWidth)));
    setCurrentPage((prev) => (prev === nextPage ? prev : nextPage));
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollXRef.current = event.nativeEvent.contentOffset.x;
    if (dragRef.current.active) return;
    syncPageFromOffset(event.nativeEvent.contentOffset.x);
  }

  function handleScrollEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (Platform.OS === 'web') {
      const offset = event.nativeEvent.contentOffset.x;
      const nextPage = Math.min(
        pages.length - 1,
        Math.max(0, Math.round(offset / width))
      );
      scrollRef.current?.scrollTo({ x: nextPage * width, animated: true });
      scrollXRef.current = nextPage * width;
      setCurrentPage(nextPage);
      return;
    }
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
      startPage: currentPageRef.current,
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
        <Text selectable={false} style={styles.date}>
          {formatDateTime(note.updated_at)}
        </Text>
        <Text selectable={false} style={styles.pageCount}>
          {currentPage + 1} / {pages.length}
        </Text>
        <GlyphSizeSlider value={glyphSize} onValueChange={setGlyphSize} style={styles.slider} />
      </View>

      <View
        style={styles.pagerWrap}
        onLayout={handlePagerLayout}
        {...(Platform.OS === 'web'
          ? { onWheel: handleWheel, onMouseDown: handleMouseDown }
          : {})}>
        <View style={styles.measureLayer} pointerEvents="none">
          <HandwritingHeaderMeasure note={note} width={width} onLayout={handleHeaderMeasure} />
        </View>

        {canRender ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled={Platform.OS !== 'web'}
            decelerationRate="normal"
            showsHorizontalScrollIndicator={Platform.OS === 'web'}
            scrollEventThrottle={16}
            onScroll={handleScroll}
            onScrollEndDrag={handleScrollEnd}
            onMomentumScrollEnd={handleScrollEnd}
            style={[
              styles.pager,
              Platform.OS === 'web' && styles.pagerWeb,
              dragging && styles.pagerWebDragging,
              WEB_NO_SELECT,
            ]}
            contentContainerStyle={styles.pagerContent}>
            {pages.map((page, index) => (
              <HandwritingPageContent
                key={`${layoutKey}-${index}`}
                note={note}
                content={page}
                glyphMap={glyphMap}
                glyphSize={glyphSize}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
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
  slider: {
    flexGrow: 1,
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
  pager: {
    flex: 1,
  },
  pagerWeb: {
    overflowX: 'auto',
    overflowY: 'hidden',
    cursor: 'grab',
    overscrollBehavior: 'contain',
  } as object,
  pagerWebDragging: {
    cursor: 'grabbing',
    scrollSnapType: 'none',
  } as object,
  pagerContent: {
    alignItems: 'stretch',
  },
  page: {
    backgroundColor: colors.paper,
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.ink,
    lineHeight: 34,
  },
  bodyCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    overflow: 'hidden',
  },
});
