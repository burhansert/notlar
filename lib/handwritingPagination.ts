import { handwritingLayoutMetrics } from '@/constants/handwriting';
import { groupLinesIntoPages } from '@/lib/notePagination';

const AVG_GLYPH_WIDTH_RATIO = 0.55;
const PAGE_VERTICAL_PADDING = 48;
const BODY_CARD_PADDING = 32;
const HEADER_GAP = 10;

export function splitIntoParagraphs(text: string): string[][] {
  return text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim().split(/\s+/).filter(Boolean))
    .filter((words) => words.length > 0);
}

function wrapParagraph(paragraph: string, charsPerLine: number) {
  if (!paragraph.trim()) return [''];

  const words = paragraph.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= charsPerLine) {
      current = next;
      continue;
    }

    if (current) lines.push(current);
    current = word;
    while (current.length > charsPerLine) {
      lines.push(current.slice(0, charsPerLine));
      current = current.slice(charsPerLine);
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function estimateHandwritingLines(content: string, bodyWidth: number, glyphSize: number) {
  const charsPerLine = Math.max(
    8,
    Math.floor(bodyWidth / (glyphSize * AVG_GLYPH_WIDTH_RATIO))
  );

  return content.split('\n').flatMap((paragraph) => wrapParagraph(paragraph, charsPerLine));
}

function handwritingLinesPerPage(bodyHeight: number, glyphSize: number) {
  const { rowGap } = handwritingLayoutMetrics(glyphSize);
  const lineHeight = glyphSize + rowGap + 4;

  if (bodyHeight <= 0) return 1;
  return Math.max(1, Math.floor(bodyHeight / lineHeight) - 1);
}

export function handwritingPageLayoutMetrics(
  pagerHeight: number,
  headerHeight: number,
  glyphSize: number
) {
  const firstBodyHeight =
    pagerHeight - PAGE_VERTICAL_PADDING - headerHeight - HEADER_GAP - BODY_CARD_PADDING;
  const nextBodyHeight = pagerHeight - PAGE_VERTICAL_PADDING - BODY_CARD_PADDING;

  return {
    firstPageCapacity: handwritingLinesPerPage(firstBodyHeight, glyphSize),
    nextPageCapacity: handwritingLinesPerPage(nextBodyHeight, glyphSize),
  };
}

export function paginateHandwritingContent(
  content: string,
  options: {
    bodyWidth: number;
    firstPageCapacity: number;
    nextPageCapacity: number;
    glyphSize: number;
    lineTexts?: string[];
  }
) {
  const normalized = content.trim() || 'Henüz içerik yok.';
  const lines =
    options.lineTexts && options.lineTexts.length
      ? options.lineTexts
      : estimateHandwritingLines(normalized, options.bodyWidth, options.glyphSize);

  return groupLinesIntoPages(lines, {
    firstPageCapacity: options.firstPageCapacity,
    nextPageCapacity: options.nextPageCapacity,
  });
}
