import type { EntryType, ParseResult, ParsedEntry } from '../domain/types';
import {
  EXPENSE_ITEMS,
  EXPENSE_VERBS,
  FILLER_WORDS,
  SALE_VERBS,
  UNITS,
} from './keywords';
import { normalizeNumbers, type NumberMatch } from './numbers';
import { splitIntoClauses } from './split';

const ITEM_STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'of',
  'for',
  'at',
  'each',
  'per',
  'piece',
  'am',
  'i',
  'don',
  'do',
  'naira',
  'k',
]);

const UNIT_CANONICAL: Record<string, string> = {
  bags: 'bag',
  cartons: 'carton',
  pieces: 'piece',
  tins: 'tin',
  baskets: 'basket',
  bottles: 'bottle',
  packs: 'pack',
  bucket: 'paint',
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function removePhrase(text: string, phrase: string): string {
  const expression = new RegExp(
    `(^|\\b)${escapeRegExp(phrase)}(?=\\b|$)`,
    'gi'
  );
  return text.replace(expression, ' ');
}

function normalizeClause(clause: string): string {
  let normalized = clause
    .toLowerCase()
    .replace(/,(?!\d{3}(?:\D|$))/g, ' ')
    .replace(/(?<!\d)\.(?!\d)|(?<=\d)\.(?!\d)/g, ' ')
    .replace(/[;!?()[\]{}]/g, ' ');
  normalized = normalized.replace(/\s+/g, ' ').trim();
  for (const filler of FILLER_WORDS) {
    normalized = removePhrase(normalized, filler);
  }
  return normalized.replace(/\s+/g, ' ').trim();
}

function phrasePresent(text: string, phrase: string): boolean {
  return new RegExp(`(^|\\b)${escapeRegExp(phrase)}(?=\\b|$)`, 'i').test(text);
}

function detectIntent(text: string): {
  type: EntryType | null;
  ambiguous: boolean;
  hasVerb: boolean;
} {
  const hasSale = SALE_VERBS.some((verb) => phrasePresent(text, verb));
  const isCustomerPay = phrasePresent(text, 'customer pay');
  const hasExpense = EXPENSE_VERBS.some(
    (verb) =>
      phrasePresent(text, verb) && !(verb === 'pay' && isCustomerPay)
  );
  const startsWithExpense = EXPENSE_ITEMS.some((item) =>
    new RegExp(`^${escapeRegExp(item)}\\b`, 'i').test(text)
  );

  if (hasSale && hasExpense) {
    return { type: 'sale', ambiguous: true, hasVerb: true };
  }
  if (hasSale) return { type: 'sale', ambiguous: false, hasVerb: true };
  if (hasExpense || startsWithExpense) {
    return { type: 'expense', ambiguous: false, hasVerb: hasExpense };
  }
  return { type: null, ambiguous: false, hasVerb: false };
}

function removeNumbers(text: string, numbers: NumberMatch[]): string {
  let result = text;
  for (const number of [...numbers].sort((a, b) => b.start - a.start)) {
    result = `${result.slice(0, number.start)} ${result.slice(number.end)}`;
  }
  return result;
}

function removeIntent(text: string): string {
  let result = text;
  const phrases = [...SALE_VERBS, ...EXPENSE_VERBS, 'i', 'don', 'do'];
  for (const phrase of phrases.sort((a, b) => b.length - a.length)) {
    if (EXPENSE_ITEMS.includes(phrase as (typeof EXPENSE_ITEMS)[number])) continue;
    result = removePhrase(result, phrase);
  }
  return result;
}

function extractUnit(text: string): { unit: string | null; start: number } {
  const unitNames = [...UNITS].sort((a, b) => b.length - a.length);
  const match = new RegExp(`\\b(${unitNames.map(escapeRegExp).join('|')})\\b`, 'i').exec(text);
  if (!match) return { unit: null, start: -1 };
  const detected = match[1].toLowerCase();
  return { unit: UNIT_CANONICAL[detected] ?? detected, start: match.index };
}

function extractItem(
  text: string,
  numbers: NumberMatch[],
  unit: string | null
): string | null {
  let remaining = removeNumbers(text, numbers);
  remaining = removeIntent(remaining);
  if (unit) {
    for (const variant of UNITS) {
      if ((UNIT_CANONICAL[variant] ?? variant) === unit) {
        remaining = removePhrase(remaining, variant);
      }
    }
  }
  remaining = remaining
    .replace(/[₦]/g, ' ')
    .replace(/\b(?:each|per|at|for|of|naira|k|and|then)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = remaining
    .split(' ')
    .filter((word) => word && !ITEM_STOP_WORDS.has(word));
  const item = words.join(' ').trim();
  return item || null;
}

function getQuantity(
  text: string,
  numbers: NumberMatch[],
  unitStart: number,
  item: string | null
): { qty: number | null; numberIndex: number | null } {
  if (!numbers.length) return { qty: null, numberIndex: null };
  if (unitStart >= 0) {
    const precedingIndex = numbers.findIndex((number) => number.end <= unitStart);
    if (precedingIndex >= 0) {
      const number = numbers[precedingIndex];
      if (/^\s*$/.test(text.slice(number.end, unitStart))) {
        return { qty: number.value, numberIndex: precedingIndex };
      }
    }
  }
  if (item) {
    const itemIndex = text.toLowerCase().indexOf(item.toLowerCase());
    const numberIndex = numbers.findIndex((number) => number.end <= itemIndex);
    if (numberIndex >= 0) {
      return { qty: numbers[numberIndex].value, numberIndex };
    }
  }
  return { qty: null, numberIndex: null };
}

function hasPerItemMarker(text: string): boolean {
  return /\b(?:each|per)\b/.test(text) || /\ba\s+piece\b/.test(text);
}

function parseClause(rawClause: string): {
  entry?: ParsedEntry;
  unparsed?: string;
} {
  const normalized = normalizeClause(rawClause);
  if (!normalized) return {};

  const intent = detectIntent(normalized);
  const numbers = normalizeNumbers(normalized);
  const unitMatch = extractUnit(normalized);
  const item = extractItem(normalized, numbers, unitMatch.unit);

  if (!intent.type && !(numbers.length && item)) {
    return { unparsed: rawClause };
  }

  const type: EntryType = intent.type ?? 'sale';
  const { qty, numberIndex } = getQuantity(
    normalized,
    numbers,
    unitMatch.start,
    item
  );
  const amountCandidates = numbers.filter(
    (_, index) => index !== numberIndex
  );
  const amount =
    amountCandidates.length > 0
      ? amountCandidates[amountCandidates.length - 1].value
      : numberIndex === null
        ? numbers[numbers.length - 1]?.value ?? null
        : null;
  const perItem = hasPerItemMarker(normalized);
  const unitPrice = perItem
    ? amount
    : qty && amount !== null
      ? Math.round(amount / qty)
      : null;
  const total =
    amount === null
      ? null
      : perItem && qty !== null
        ? amount * qty
        : amount;
  const issues: string[] = [];

  if (!item) issues.push('missing_item');
  if (total === null) issues.push('missing_amount');
  if (intent.ambiguous) issues.push('ambiguous_intent');
  if (!intent.type && item) issues.push('ambiguous_intent');

  if (!intent.type && !intent.hasVerb && !item) {
    return { unparsed: rawClause };
  }

  return {
    entry: {
      type,
      item,
      qty,
      unit: unitMatch.unit,
      unitPrice,
      total,
      rawClause,
      confidence: issues.length ? 'low' : 'high',
      issues,
    },
  };
}

export function parseTranscript(text: string): ParseResult {
  const entries: ParsedEntry[] = [];
  const unparsed: string[] = [];

  for (const clause of splitIntoClauses(text)) {
    const parsed = parseClause(clause);
    if (parsed.entry) entries.push(parsed.entry);
    if (parsed.unparsed) unparsed.push(parsed.unparsed);
  }

  return { entries, unparsed };
}
