import { buildMonthReport, summarizeDay } from '../aggregate';
import type { Entry, EntryType } from '../types';

function makeEntry(
  id: number,
  date: string,
  type: EntryType,
  item: string,
  total: number
): Entry {
  return {
    id,
    date,
    type,
    item,
    qty: null,
    unit: null,
    unitPrice: null,
    total,
    rawText: '',
    createdAt: `${date}T12:00:00.000Z`,
  };
}

describe('summarizeDay', () => {
  it('calculates sales, expenses, profit, and entry count', () => {
    const entries = [
      makeEntry(1, '2026-10-26', 'sale', 'rice', 120000),
      makeEntry(2, '2026-10-26', 'sale', 'beans', 30000),
      makeEntry(3, '2026-10-26', 'expense', 'transport', 5000),
    ];

    expect(summarizeDay(entries)).toEqual({
      date: '2026-10-26',
      totalSales: 150000,
      totalExpenses: 5000,
      profit: 145000,
      entryCount: 3,
    });
  });

  it('returns zero totals for an empty day', () => {
    expect(summarizeDay([])).toEqual({
      date: '',
      totalSales: 0,
      totalExpenses: 0,
      profit: 0,
      entryCount: 0,
    });
  });

  it('allows a loss when expenses exceed sales', () => {
    const entries = [
      makeEntry(1, '2026-10-26', 'sale', 'rice', 2000),
      makeEntry(2, '2026-10-26', 'expense', 'rent', 7000),
    ];

    expect(summarizeDay(entries).profit).toBe(-5000);
  });
});

describe('buildMonthReport', () => {
  const entries = [
    makeEntry(1, '2026-10-01', 'sale', ' Rice ', 10000),
    makeEntry(2, '2026-10-01', 'sale', 'rice', 5000),
    makeEntry(3, '2026-10-01', 'expense', 'Transport', 1000),
    makeEntry(4, '2026-10-03', 'sale', 'Beans', 20000),
    makeEntry(5, '2026-10-03', 'expense', 'transport', 2000),
    makeEntry(6, '2026-09-30', 'sale', 'Rice', 99999),
    makeEntry(7, '2026-11-01', 'expense', 'Rent', 88888),
  ];

  it('calculates monthly totals and averages over active days', () => {
    expect(buildMonthReport(entries, '2026-10')).toEqual({
      month: '2026-10',
      totalSales: 35000,
      totalExpenses: 3000,
      netProfit: 32000,
      activeDays: 2,
      avgDailySales: 17500,
      topItems: [
        { item: 'beans', total: 20000 },
        { item: 'rice', total: 15000 },
      ],
      topExpenses: [
        { item: 'transport', total: 3000 },
      ],
      daily: [
        { date: '2026-10-01', sales: 15000, expenses: 1000 },
        { date: '2026-10-03', sales: 20000, expenses: 2000 },
      ],
    });
  });

  it('counts expense-only dates as active days for the average', () => {
    const expenseOnly = [
      makeEntry(1, '2026-10-05', 'sale', 'rice', 9000),
      makeEntry(2, '2026-10-06', 'expense', 'rent', 1000),
      makeEntry(3, '2026-10-07', 'expense', 'fuel', 500),
    ];

    expect(buildMonthReport(expenseOnly, '2026-10')).toMatchObject({
      totalSales: 9000,
      activeDays: 3,
      avgDailySales: 3000,
    });
  });

  it('uses zero average and empty breakdowns when there are no entries', () => {
    expect(buildMonthReport([], '2026-10')).toEqual({
      month: '2026-10',
      totalSales: 0,
      totalExpenses: 0,
      netProfit: 0,
      activeDays: 0,
      avgDailySales: 0,
      topItems: [],
      topExpenses: [],
      daily: [],
    });
  });

  it('sorts category totals by total then normalized item name', () => {
    const sameTotal = [
      makeEntry(1, '2026-10-01', 'sale', 'zebra', 1000),
      makeEntry(2, '2026-10-01', 'sale', 'apple', 1000),
      makeEntry(3, '2026-10-01', 'expense', 'water', 500),
      makeEntry(4, '2026-10-01', 'expense', 'fuel', 500),
    ];

    expect(buildMonthReport(sameTotal, '2026-10')).toMatchObject({
      topItems: [
        { item: 'apple', total: 1000 },
        { item: 'zebra', total: 1000 },
      ],
      topExpenses: [
        { item: 'fuel', total: 500 },
        { item: 'water', total: 500 },
      ],
    });
  });

  it('rejects a month that is not YYYY-MM', () => {
    expect(() => buildMonthReport(entries, '2026-13')).toThrow(
      'Invalid month; expected YYYY-MM: 2026-13'
    );
  });
});
