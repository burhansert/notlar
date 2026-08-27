export const NOTE_BODY_FONT_SIZE = 17;
export const NOTE_BODY_LINE_HEIGHT = 28;

const AVG_CHAR_WIDTH_RATIO = 0.52;
const PAGE_VERTICAL_PADDING = 48;
const BODY_CARD_PADDING = 32;
const HEADER_GAP = 10;

export function groupLinesIntoPages(
  lineTexts: string[],
  options: { firstPageCapacity: number; nextPageCapacity: number }
) {
  if (!lineTexts.length) return [''];

  const pages: string[] = [];
  let index = 0;
  let capacity = Math.max(1, options.firstPageCapacity);

  while (index < lineTexts.length) {
    const chunk = lineTexts.slice(index, index + capacity);
    pages.push(chunk.join('\n'));
    index += capacity;
    capacity = Math.max(1, options.nextPageCapacity);
  }

  return pages;
}

export function linesPerPage(bodyHeight: number) {
  if (bodyHeight <= 0) return 1;
  return Math.max(1, Math.floor(bodyHeight / NOTE_BODY_LINE_HEIGHT) - 1);
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

export function estimateWrappedLines(content: string, bodyWidth: number) {
  const charsPerLine = Math.max(
    12,
    Math.floor(bodyWidth / (NOTE_BODY_FONT_SIZE * AVG_CHAR_WIDTH_RATIO))
  );

  return content.split('\n').flatMap((paragraph) => wrapParagraph(paragraph, charsPerLine));
}

export function paginateContent(
  content: string,
  options: {
    bodyWidth: number;
    firstPageCapacity: number;
    nextPageCapacity: number;
    lineTexts?: string[];
  }
) {
  const normalized = content.trim() || 'Henüz içerik yok.';
  const lines =
    options.lineTexts && options.lineTexts.length
      ? options.lineTexts
      : estimateWrappedLines(normalized, options.bodyWidth);

  return groupLinesIntoPages(lines, {
    firstPageCapacity: options.firstPageCapacity,
    nextPageCapacity: options.nextPageCapacity,
  });
}

export function pageLayoutMetrics(pagerHeight: number, headerHeight: number) {
  const firstBodyHeight =
    pagerHeight - PAGE_VERTICAL_PADDING - headerHeight - HEADER_GAP - BODY_CARD_PADDING;
  const nextBodyHeight = pagerHeight - PAGE_VERTICAL_PADDING - BODY_CARD_PADDING;

  return {
    firstBodyHeight: Math.max(NOTE_BODY_LINE_HEIGHT, firstBodyHeight),
    nextBodyHeight: Math.max(NOTE_BODY_LINE_HEIGHT, nextBodyHeight),
    firstPageCapacity: linesPerPage(firstBodyHeight),
    nextPageCapacity: linesPerPage(nextBodyHeight),
  };
}

export const DEFAULT_TITLE_HEADER_HEIGHT = 34 + 24 + 10;
