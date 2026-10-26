export interface NumberMatch {
  value: number;
  start: number;
  end: number;
}

const SMALL_NUMBERS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const WORD_PATTERN =
  'zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|half';

const DIGIT_PATTERN = String.raw`(?:\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)`;
const BOUNDARY_BEFORE = String.raw`(?<![\w.])`;
const BOUNDARY_AFTER = String.raw`(?![\w.])`;

function parseNumberWords(phrase: string): number {
  const words = phrase.toLowerCase().split(/\s+/);
  if (words.length === 1 && words[0] === 'half') return 500;

  let total = 0;
  let group = 0;
  for (const word of words) {
    if (word === 'and') continue;
    if (word === 'half') {
      group += 0.5;
    } else if (word in SMALL_NUMBERS) {
      group += SMALL_NUMBERS[word];
    } else if (word in TENS) {
      group += TENS[word];
    } else if (word === 'hundred') {
      group = (group || 1) * 100;
    } else if (word === 'thousand') {
      total += (group || 1) * 1000;
      group = 0;
    } else if (word === 'million') {
      total += (group || 1) * 1000000;
      group = 0;
    }
  }
  return total + group;
}

function numberValue(value: string, multiplier: string | undefined): number {
  const parsed = Number(value.replace(/,/g, ''));
  if (multiplier === 'k' || multiplier === 'thousand') {
    return Math.round(parsed * 1000);
  }
  if (multiplier === 'million') return Math.round(parsed * 1000000);
  return Math.round(parsed);
}

export function normalizeNumbers(text: string): NumberMatch[] {
  const matches: NumberMatch[] = [];
  const digitsPattern = new RegExp(
    `${BOUNDARY_BEFORE}(?:₦\\s*|n\\s*)?(${DIGIT_PATTERN})\\s*(k|thousand|million)?(?:\\s+naira)?${BOUNDARY_AFTER}`,
    'gi'
  );
  let match: RegExpExecArray | null;
  while ((match = digitsPattern.exec(text)) !== null) {
    const multiplier = match[2]?.toLowerCase();
    const token = match[0];
    const numericText = match[1];
    const value = numberValue(numericText, multiplier);
    matches.push({ value, start: match.index, end: match.index + token.length });
  }

  const wordsPattern = new RegExp(
    `${BOUNDARY_BEFORE}((?:${WORD_PATTERN})(?:\\s+(?:(?:${WORD_PATTERN})|and))*)(?:\\s+(k|thousand|million))?(?:\\s+naira)?${BOUNDARY_AFTER}`,
    'gi'
  );
  while ((match = wordsPattern.exec(text)) !== null) {
    const phrase = match[1].toLowerCase();
    const multiplier = match[2]?.toLowerCase();
    let value = parseNumberWords(phrase);
    if (multiplier === 'k' || multiplier === 'thousand') value *= 1000;
    if (multiplier === 'million') value *= 1000000;
    if (phrase === 'half' && multiplier) value = 500;
    matches.push({
      value: Math.round(value),
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  matches.sort((a, b) => a.start - b.start || b.end - a.end);
  const deduplicated: NumberMatch[] = [];
  for (const candidate of matches) {
    const previous = deduplicated[deduplicated.length - 1];
    if (!previous || candidate.start >= previous.end) {
      deduplicated.push(candidate);
    }
  }
  return deduplicated;
}
