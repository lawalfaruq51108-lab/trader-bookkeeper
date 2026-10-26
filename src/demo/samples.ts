import type { Entry } from '../domain/types';

export const DEMO_SAMPLES = [
  'sold 3 bags of rice at 40k each',
  'Sold 2 cartons of noodles for 18,000 naira',
  'Customer paid 12k for cooking oil',
  'I don sell 2 carton indomie for 15 thousand',
  'I sell am 4 bags of beans for 32k',
  'I buy pepper 12,000',
  'I pay transport 2k',
  'I don buy 3 cartons of soap for 21 thousand',
  'Paid shop rent 35,000 and fuel 5k',
  'paid transport 5k',
] as const;

interface DemoTemplate {
  day: number;
  type: 'sale' | 'expense';
  item: string;
  qty: number | null;
  unit: string | null;
  unitPrice: number | null;
  total: number;
  rawText: string;
}

const MONTH_TEMPLATE: DemoTemplate[] = [
  { day: 1, type: 'sale', item: 'rice', qty: 4, unit: 'bag', unitPrice: 40000, total: 160000, rawText: 'sold 4 bags of rice at 40k each' },
  { day: 1, type: 'sale', item: 'noodles', qty: 3, unit: 'carton', unitPrice: 9000, total: 27000, rawText: 'sold 3 cartons of noodles at 9k each' },
  { day: 1, type: 'expense', item: 'transport', qty: null, unit: null, unitPrice: null, total: 3500, rawText: 'paid transport 3,500' },
  { day: 3, type: 'sale', item: 'beans', qty: 2, unit: 'bag', unitPrice: 32000, total: 64000, rawText: 'sold 2 bags of beans at 32k each' },
  { day: 3, type: 'sale', item: 'cooking oil', qty: 5, unit: 'bottle', unitPrice: 4500, total: 22500, rawText: 'sold 5 bottles of cooking oil at 4,500 each' },
  { day: 3, type: 'expense', item: 'market restock', qty: null, unit: null, unitPrice: null, total: 85000, rawText: 'bought stock for 85k' },
  { day: 5, type: 'sale', item: 'garri', qty: 6, unit: 'paint', unitPrice: 2500, total: 15000, rawText: 'sold 6 paints of garri at 2,500 each' },
  { day: 5, type: 'sale', item: 'sugar', qty: 8, unit: 'kg', unitPrice: 1800, total: 14400, rawText: 'sold 8 kg of sugar at 1,800 each' },
  { day: 5, type: 'expense', item: 'transport', qty: null, unit: null, unitPrice: null, total: 2500, rawText: 'paid transport 2,500' },
  { day: 7, type: 'sale', item: 'indomie', qty: 4, unit: 'carton', unitPrice: 8500, total: 34000, rawText: 'sold 4 cartons of indomie at 8,500 each' },
  { day: 7, type: 'sale', item: 'soap', qty: 12, unit: 'piece', unitPrice: 700, total: 8400, rawText: 'sold 12 pieces of soap at 700 each' },
  { day: 7, type: 'expense', item: 'fuel', qty: null, unit: null, unitPrice: null, total: 4000, rawText: 'paid for fuel 4k' },
  { day: 10, type: 'sale', item: 'rice', qty: 3, unit: 'bag', unitPrice: 41000, total: 123000, rawText: 'sold 3 bags of rice at 41k each' },
  { day: 10, type: 'sale', item: 'milk', qty: 2, unit: 'carton', unitPrice: 12500, total: 25000, rawText: 'sold 2 cartons of milk at 12,500 each' },
  { day: 10, type: 'expense', item: 'shop rent', qty: null, unit: null, unitPrice: null, total: 35000, rawText: 'paid shop rent 35k' },
  { day: 12, type: 'sale', item: 'beans', qty: 3, unit: 'bag', unitPrice: 31500, total: 94500, rawText: 'sold 3 bags of beans at 31,500 each' },
  { day: 12, type: 'sale', item: 'tomatoes', qty: 10, unit: 'basket', unitPrice: 2200, total: 22000, rawText: 'sold 10 baskets of tomatoes at 2,200 each' },
  { day: 12, type: 'expense', item: 'transport', qty: null, unit: null, unitPrice: null, total: 3000, rawText: 'paid transport 3k' },
  { day: 15, type: 'sale', item: 'noodles', qty: 5, unit: 'carton', unitPrice: 9200, total: 46000, rawText: 'sold 5 cartons of noodles at 9,200 each' },
  { day: 15, type: 'sale', item: 'salt', qty: 20, unit: 'pack', unitPrice: 300, total: 6000, rawText: 'sold 20 packs of salt at 300 each' },
  { day: 15, type: 'expense', item: 'market restock', qty: null, unit: null, unitPrice: null, total: 65000, rawText: 'bought stock for 65k' },
  { day: 18, type: 'sale', item: 'cooking oil', qty: 8, unit: 'bottle', unitPrice: 4600, total: 36800, rawText: 'sold 8 bottles of cooking oil at 4,600 each' },
  { day: 18, type: 'sale', item: 'sugar', qty: 10, unit: 'kg', unitPrice: 1850, total: 18500, rawText: 'sold 10 kg of sugar at 1,850 each' },
  { day: 18, type: 'expense', item: 'electricity', qty: null, unit: null, unitPrice: null, total: 6000, rawText: 'paid electricity 6k' },
  { day: 21, type: 'sale', item: 'rice', qty: 5, unit: 'bag', unitPrice: 40500, total: 202500, rawText: 'sold 5 bags of rice at 40,500 each' },
  { day: 21, type: 'sale', item: 'soap', qty: 16, unit: 'piece', unitPrice: 750, total: 12000, rawText: 'sold 16 pieces of soap at 750 each' },
  { day: 21, type: 'expense', item: 'transport', qty: null, unit: null, unitPrice: null, total: 4000, rawText: 'paid transport 4k' },
  { day: 24, type: 'sale', item: 'garri', qty: 8, unit: 'paint', unitPrice: 2600, total: 20800, rawText: 'sold 8 paints of garri at 2,600 each' },
  { day: 24, type: 'sale', item: 'indomie', qty: 3, unit: 'carton', unitPrice: 8800, total: 26400, rawText: 'sold 3 cartons of indomie at 8,800 each' },
  { day: 24, type: 'expense', item: 'fuel', qty: null, unit: null, unitPrice: null, total: 4500, rawText: 'paid fuel 4,500' },
  { day: 27, type: 'sale', item: 'beans', qty: 2, unit: 'bag', unitPrice: 32500, total: 65000, rawText: 'sold 2 bags of beans at 32,500 each' },
  { day: 27, type: 'sale', item: 'milk', qty: 3, unit: 'carton', unitPrice: 12800, total: 38400, rawText: 'sold 3 cartons of milk at 12,800 each' },
  { day: 27, type: 'expense', item: 'market restock', qty: null, unit: null, unitPrice: null, total: 72000, rawText: 'bought stock for 72k' },
  { day: 30, type: 'sale', item: 'rice', qty: 2, unit: 'bag', unitPrice: 41500, total: 83000, rawText: 'sold 2 bags of rice at 41,500 each' },
  { day: 30, type: 'sale', item: 'tomatoes', qty: 12, unit: 'basket', unitPrice: 2300, total: 27600, rawText: 'sold 12 baskets of tomatoes at 2,300 each' },
  { day: 30, type: 'expense', item: 'transport', qty: null, unit: null, unitPrice: null, total: 3500, rawText: 'paid transport 3,500' },
];

export function generateDemoMonthEntries(
  month: string
): Omit<Entry, 'id'>[] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error(`Invalid demo month; expected YYYY-MM: ${month}`);
  }
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return MONTH_TEMPLATE.filter((entry) => entry.day <= lastDay).map((entry) => {
    const date = `${month}-${String(entry.day).padStart(2, '0')}`;
    return {
      date,
      type: entry.type,
      item: entry.item,
      qty: entry.qty,
      unit: entry.unit,
      unitPrice: entry.unitPrice,
      total: entry.total,
      rawText: `[DEMO] ${entry.rawText}`,
      createdAt: `${date}T12:00:00.000Z`,
    };
  });
}
