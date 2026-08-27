export const NOTE_BODY_FONT_SIZE = 17;
export const NOTE_BODY_LINE_HEIGHT = 28;

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
