import type { ParsedEntry } from '../../domain/types';
import { parseTranscript } from '..';

interface ParserCase {
  name: string;
  text: string;
  expected?: Partial<ParsedEntry>;
  expectedEntries?: Partial<ParsedEntry>[];
  expectedUnparsed?: string[];
}

const cases: ParserCase[] = [
    {
      name: 'parses the documented sale with a per-item price',
      text: 'sold 3 bags of rice at 40k each',
      expected: {
        type: 'sale',
        item: 'rice',
        qty: 3,
        unit: 'bag',
        unitPrice: 40000,
        total: 120000,
      },
    },
    {
      name: 'flags a Pidgin sale with no item',
      text: 'I sell am 40k',
      expected: {
        type: 'sale',
        item: null,
        total: 40000,
        issues: ['missing_item'],
      },
    },
    {
      name: 'parses the documented transport expense',
      text: 'paid transport 5k',
      expected: { type: 'expense', item: 'transport', total: 5000 },
    },
    {
      name: 'parses a Pidgin sale with quantity, unit, and total',
      text: 'I don sell 2 carton indomie for 15 thousand',
      expected: {
        type: 'sale',
        item: 'indomie',
        qty: 2,
        unit: 'carton',
        total: 15000,
        unitPrice: 7500,
      },
    },
    {
      name: 'parses the documented pepper expense',
      text: 'I buy pepper 12,000',
      expected: { type: 'expense', item: 'pepper', total: 12000 },
    },
    {
      name: 'uses number words for quantity and each for unit price',
      text: 'two tomatoes 3500 each',
      expected: {
        type: 'sale',
        item: 'tomatoes',
        qty: 2,
        unitPrice: 3500,
        total: 7000,
      },
    },
    {
      name: 'parses two entries in one sentence',
      text: 'sold rice 40k and paid transport 5k',
      expectedEntries: [
        { type: 'sale', item: 'rice', total: 40000 },
        { type: 'expense', item: 'transport', total: 5000 },
      ],
    },
    {
      name: 'leaves unintelligible text unparsed',
      text: 'bla bla',
      expectedUnparsed: ['bla bla'],
    },
    {
      name: 'parses a spaced k suffix',
      text: 'paid fuel 40 k',
      expected: { type: 'expense', item: 'fuel', total: 40000 },
    },
    {
      name: 'parses an uppercase K suffix',
      text: 'SOLD rice 40K',
      expected: { type: 'sale', item: 'rice', total: 40000 },
    },
    {
      name: 'parses a decimal k suffix as whole naira',
      text: 'paid rent 2.5k',
      expected: { type: 'expense', item: 'rent', total: 2500 },
    },
    {
      name: 'parses a thousand multiplier',
      text: 'sold rice 40 thousand',
      expected: { type: 'sale', item: 'rice', total: 40000 },
    },
    {
      name: 'parses one million',
      text: 'sold generator 1 million',
      expected: { type: 'sale', item: 'generator', total: 1000000 },
    },
    {
      name: 'parses comma-separated amounts',
      text: 'paid rent 15,000',
      expected: { type: 'expense', item: 'rent', total: 15000 },
    },
    {
      name: 'parses ungrouped amounts',
      text: 'paid rent 15000',
      expected: { type: 'expense', item: 'rent', total: 15000 },
    },
    {
      name: 'parses a naira symbol and grouped amount',
      text: 'paid rent ₦15,000',
      expected: { type: 'expense', item: 'rent', total: 15000 },
    },
    {
      name: 'parses an N currency prefix',
      text: 'paid rent N15000',
      expected: { type: 'expense', item: 'rent', total: 15000 },
    },
    {
      name: 'parses naira after a k amount',
      text: 'sold rice 15k naira',
      expected: { type: 'sale', item: 'rice', total: 15000 },
    },
    {
      name: 'parses one k',
      text: 'paid transport one k',
      expected: { type: 'expense', item: 'transport', total: 1000 },
    },
    {
      name: 'parses half k',
      text: 'paid transport half k',
      expected: { type: 'expense', item: 'transport', total: 500 },
    },
    {
      name: 'parses a five hundred naira number phrase',
      text: 'paid fuel five hundred naira',
      expected: { type: 'expense', item: 'fuel', total: 500 },
    },
    {
      name: 'parses a compound number phrase',
      text: 'sold rice two thousand five hundred',
      expected: { type: 'sale', item: 'rice', total: 2500 },
    },
    {
      name: 'parses a spoken number from one to twenty',
      text: 'sold rice twenty',
      expected: { type: 'sale', item: 'rice', total: 20 },
    },
    {
      name: 'parses a spoken tens amount',
      text: 'sold rice thirty thousand',
      expected: { type: 'sale', item: 'rice', total: 30000 },
    },
    {
      name: 'treats each as a unit price',
      text: 'sold 2 bags rice 5k each',
      expected: {
        type: 'sale',
        item: 'rice',
        qty: 2,
        unitPrice: 5000,
        total: 10000,
      },
    },
    {
      name: 'treats an amount without each as the total',
      text: 'sold 2 bags rice 5k',
      expected: {
        type: 'sale',
        item: 'rice',
        qty: 2,
        unitPrice: 2500,
        total: 5000,
      },
    },
    {
      name: 'recognizes I sell am as a sale intent',
      text: 'I sell am rice 8k',
      expected: { type: 'sale', item: 'rice', total: 8000 },
    },
    {
      name: 'recognizes I don sell as a sale intent',
      text: 'I don sell rice 8k',
      expected: { type: 'sale', item: 'rice', total: 8000 },
    },
    {
      name: 'recognizes I buy as an expense intent',
      text: 'I buy rice 8k',
      expected: { type: 'expense', item: 'rice', total: 8000 },
    },
    {
      name: 'splits clauses joined with then',
      text: 'sold rice 4k then paid fuel 1k',
      expectedEntries: [
        { type: 'sale', item: 'rice', total: 4000 },
        { type: 'expense', item: 'fuel', total: 1000 },
      ],
    },
    {
      name: 'splits clauses on a comma without splitting grouped numbers',
      text: 'sold rice 15,000, paid transport 2,000',
      expectedEntries: [
        { type: 'sale', item: 'rice', total: 15000 },
        { type: 'expense', item: 'transport', total: 2000 },
      ],
    },
    {
      name: 'splits clauses on a semicolon',
      text: 'sold rice 4k; paid fuel 1k',
      expectedEntries: [
        { type: 'sale', item: 'rice', total: 4000 },
        { type: 'expense', item: 'fuel', total: 1000 },
      ],
    },
    {
      name: 'normalizes sentence punctuation',
      text: 'Sold rice for 4k.',
      expected: { type: 'sale', item: 'rice', total: 4000 },
    },
    {
      name: 'normalizes capital letters',
      text: 'PAID RENT 15K',
      expected: { type: 'expense', item: 'rent', total: 15000 },
    },
    {
      name: 'flags a missing item',
      text: 'sold 5k',
      expected: {
        type: 'sale',
        item: null,
        total: 5000,
        confidence: 'low',
        issues: ['missing_item'],
      },
    },
    {
      name: 'flags a missing amount',
      text: 'sold rice',
      expected: {
        type: 'sale',
        item: 'rice',
        total: null,
        confidence: 'low',
        issues: ['missing_amount'],
      },
    },
    {
      name: 'parses a transport expense without a verb',
      text: 'transport 5k',
      expected: { type: 'expense', item: 'transport', total: 5000 },
    },
    {
      name: 'parses a rent expense',
      text: 'paid rent 20k',
      expected: { type: 'expense', item: 'rent', total: 20000 },
    },
    {
      name: 'parses a fuel expense',
      text: 'spent fuel 3k',
      expected: { type: 'expense', item: 'fuel', total: 3000 },
    },
    {
      name: 'removes filler words',
      text: 'Um, I sold, uh, rice for 4k',
      expected: { type: 'sale', item: 'rice', total: 4000 },
    },
    {
      name: 'does not invent lost values from the speech spike transcript',
      text: 'So do the bugs of rice as for the key each.',
      expectedUnparsed: ['So do the bugs of rice as for the key each.'],
    },
];

describe('parseTranscript', () => {
  it.each(cases)(
    '$name',
    ({ text, expected, expectedEntries, expectedUnparsed }) => {
      const result = parseTranscript(text);

      if (expectedUnparsed) {
        expect(result.unparsed).toEqual(expect.arrayContaining(expectedUnparsed));
        expect(result.entries).toHaveLength(0);
        return;
      }

      if (expectedEntries) {
        expect(result.entries).toHaveLength(expectedEntries.length);
        expectedEntries.forEach((entry, index) => {
          expect(result.entries[index]).toMatchObject(entry);
        });
        return;
      }

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]).toMatchObject(expected);
    }
  );
});
