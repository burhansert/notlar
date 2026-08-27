export const TURKISH_LETTERS = [
  'A',
  'B',
  'C',
  'Ç',
  'D',
  'E',
  'F',
  'G',
  'Ğ',
  'H',
  'I',
  'İ',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'Ö',
  'P',
  'R',
  'S',
  'Ş',
  'T',
  'U',
  'Ü',
  'V',
  'Y',
  'Z',
] as const;

export type TurkishLetter = (typeof TURKISH_LETTERS)[number];

export function isTurkishLetter(value: string): value is TurkishLetter {
  return (TURKISH_LETTERS as readonly string[]).includes(value);
}

export function letterRouteParam(letter: TurkishLetter) {
  return encodeURIComponent(letter);
}

export function letterFromRouteParam(param: string): TurkishLetter | null {
  try {
    const decoded = decodeURIComponent(param);
    return isTurkishLetter(decoded) ? decoded : null;
  } catch {
    return null;
  }
}
