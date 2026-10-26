export const SALE_VERBS = [
  'sold',
  'sell',
  'sell am',
  'i sell',
  'don sell',
  'collect',
  'received',
  'customer pay',
] as const;

export const EXPENSE_VERBS = [
  'paid',
  'pay',
  'bought',
  'buy',
  'i buy',
  'spent',
  'spend',
  'give',
  'rent',
  'fuel',
  'transport',
  'light',
  'nepa',
] as const;

export const UNITS = [
  'bag',
  'bags',
  'carton',
  'cartons',
  'piece',
  'pieces',
  'bunch',
  'tin',
  'tins',
  'basket',
  'baskets',
  'bottle',
  'bottles',
  'pack',
  'packs',
  'dozen',
  'paint',
  'bucket',
  'derica',
  'congo',
  'kg',
  'litre',
] as const;

export const FILLER_WORDS = [
  'um',
  'uh',
  'erm',
  'ah',
  'please',
  'abeg',
] as const;

export const SALE_KEYWORDS = SALE_VERBS;
export const EXPENSE_KEYWORDS = EXPENSE_VERBS;
export const UNIT_KEYWORDS = UNITS;

export const EXPENSE_ITEMS = ['transport', 'rent', 'fuel', 'light', 'nepa'] as const;
