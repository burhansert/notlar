export const TURKISH_LETTER_PAIRS = [
  { lower: 'a', upper: 'A' },
  { lower: 'b', upper: 'B' },
  { lower: 'c', upper: 'C' },
  { lower: 'ç', upper: 'Ç' },
  { lower: 'd', upper: 'D' },
  { lower: 'e', upper: 'E' },
  { lower: 'f', upper: 'F' },
  { lower: 'g', upper: 'G' },
  { lower: 'ğ', upper: 'Ğ' },
  { lower: 'h', upper: 'H' },
  { lower: 'ı', upper: 'I' },
  { lower: 'i', upper: 'İ' },
  { lower: 'j', upper: 'J' },
  { lower: 'k', upper: 'K' },
  { lower: 'l', upper: 'L' },
  { lower: 'm', upper: 'M' },
  { lower: 'n', upper: 'N' },
  { lower: 'o', upper: 'O' },
  { lower: 'ö', upper: 'Ö' },
  { lower: 'p', upper: 'P' },
  { lower: 'r', upper: 'R' },
  { lower: 's', upper: 'S' },
  { lower: 'ş', upper: 'Ş' },
  { lower: 't', upper: 'T' },
  { lower: 'u', upper: 'U' },
  { lower: 'ü', upper: 'Ü' },
  { lower: 'v', upper: 'V' },
  { lower: 'y', upper: 'Y' },
  { lower: 'z', upper: 'Z' },
] as const;

export const HANDWRITING_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;

export const HANDWRITING_SYMBOLS = ['.', ',', ':', ';', '!', '(', ')'] as const;

export const TURKISH_LETTERS_LOWER = TURKISH_LETTER_PAIRS.map((pair) => pair.lower);
export const TURKISH_LETTERS_UPPER = TURKISH_LETTER_PAIRS.map((pair) => pair.upper);

export const TURKISH_LETTERS = TURKISH_LETTER_PAIRS.flatMap((pair) => [pair.lower, pair.upper]);

export const HANDWRITING_CHARACTERS = [
  ...TURKISH_LETTERS,
  ...HANDWRITING_DIGITS,
  ...HANDWRITING_SYMBOLS,
];

export type TurkishLetterLower = (typeof TURKISH_LETTER_PAIRS)[number]['lower'];
export type TurkishLetterUpper = (typeof TURKISH_LETTER_PAIRS)[number]['upper'];
export type TurkishLetter = TurkishLetterLower | TurkishLetterUpper;
export type HandwritingDigit = (typeof HANDWRITING_DIGITS)[number];
export type HandwritingSymbol = (typeof HANDWRITING_SYMBOLS)[number];
export type HandwritingCharacter = TurkishLetter | HandwritingDigit | HandwritingSymbol;

const TURKISH_LETTER_SET = new Set<string>(TURKISH_LETTERS);
const HANDWRITING_CHARACTER_SET = new Set<string>(HANDWRITING_CHARACTERS);

export function isTurkishLetter(value: string): value is TurkishLetter {
  return TURKISH_LETTER_SET.has(value);
}

export function isHandwritingCharacter(value: string): value is HandwritingCharacter {
  return HANDWRITING_CHARACTER_SET.has(value);
}

export function resolveHandwritingCharacter(value: string): HandwritingCharacter | null {
  if (!value) return null;
  return isHandwritingCharacter(value) ? value : null;
}

export function resolveTurkishLetter(value: string): TurkishLetter | null {
  const resolved = resolveHandwritingCharacter(value);
  return resolved && isTurkishLetter(resolved) ? resolved : null;
}

export function characterRouteParam(character: HandwritingCharacter) {
  return encodeURIComponent(character);
}

export function characterFromRouteParam(param: string): HandwritingCharacter | null {
  try {
    const decoded = decodeURIComponent(param);
    return resolveHandwritingCharacter(decoded);
  } catch {
    return null;
  }
}

export function letterRouteParam(letter: HandwritingCharacter) {
  return characterRouteParam(letter);
}

export function letterFromRouteParam(param: string): HandwritingCharacter | null {
  return characterFromRouteParam(param);
}
