export function formatDateTime(value: string) {
  try {
    return new Date(value).toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

export function previewText(value: string, max = 120) {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max).trim()}…`;
}

export function noteCountLabel(count: number) {
  if (count === 0) return 'Not yok';
  if (count === 1) return '1 not';
  return `${count} not`;
}

export function notebookCountLabel(count: number) {
  if (count === 0) return 'Not defteri yok';
  if (count === 1) return '1 not defteri';
  return `${count} not defteri`;
}

export function sectionCountLabel(count: number) {
  if (count === 0) return 'Bölüm yok';
  if (count === 1) return '1 bölüm';
  return `${count} bölüm`;
}
