export const NOTE_BODY_FONT_SIZE = 17;
export const NOTE_BODY_LINE_HEIGHT = 28;

const AVG_CHAR_WIDTH_RATIO = 0.52;

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
  return Math.max(1, Math.floor(bodyHeight / NOTE_BODY_LINE_HEIGHT));
}

export function charsPerLine(bodyWidth: number) {
  return Math.max(12, Math.floor(bodyWidth / (NOTE_BODY_FONT_SIZE * AVG_CHAR_WIDTH_RATIO)));
}

export function charsPerPage(bodyHeight: number, bodyWidth: number) {
  return linesPerPage(bodyHeight) * charsPerLine(bodyWidth);
}

export function paginateText(
  text: string,
  options: {
    firstPageChars: number;
    nextPageChars: number;
  }
) {
  const normalized = text.trim() || 'Henüz içerik yok.';
  const firstLimit = Math.max(80, options.firstPageChars);
  const nextLimit = Math.max(80, options.nextPageChars);

  if (normalized.length <= firstLimit) {
    return [normalized];
  }

  const pages: string[] = [];
  let remaining = normalized;
  let limit = firstLimit;

  while (remaining.length > 0) {
    if (remaining.length <= limit) {
      pages.push(remaining);
      break;
    }

    const slice = remaining.slice(0, limit);
    const lastSpace = slice.lastIndexOf(' ');
    const lastNewline = slice.lastIndexOf('\n');
    const breakAt = Math.max(lastSpace, lastNewline);
    const cut = breakAt > limit * 0.4 ? breakAt : limit;

    pages.push(remaining.slice(0, cut).trimEnd());
    remaining = remaining.slice(cut).trimStart();
    limit = nextLimit;
  }

  return pages.length ? pages : [normalized];
}
