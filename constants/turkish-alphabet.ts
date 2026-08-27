export const TURKISH_LETTERS = [
  'a',
  'b',
  'c',
  'ç',
  'd',
  'e',
  'f',
  'g',
  'ğ',
  'h',
  'ı',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'ö',
  'p',
  'r',
  's',
  'ş',
  't',
  'u',
  'ü',
  'v',
  'y',
  'z',
] as const;

export type TurkishLetter = (typeof TURKISH_LETTERS)[number];

export function isTurkishLetter(value: string): value is TurkishLetter {
  return (TURKISH_LETTERS as readonly string[]).includes(value);
}

export function normalizeTurkishLetter(value: string): TurkishLetter | null {
  const normalized = value.toLocaleLowerCase('tr-TR');
  return isTurkishLetter(normalized) ? normalized : null;
}

export function letterRouteParam(letter: TurkishLetter) {
  return encodeURIComponent(letter);
}

export function letterFromRouteParam(param: string): TurkishLetter | null {
  try {
    const decoded = decodeURIComponent(param);
    return normalizeTurkishLetter(decoded);
  } catch {
    return null;
  }
}
