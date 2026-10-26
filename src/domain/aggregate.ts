import type { DaySummary, Entry, MonthReportData } from './types';

function summarizeEntries(date: string, entries: readonly Entry[]): DaySummary {
  let totalSales = 0;
  let totalExpenses = 0;

  for (const entry of entries) {
    if (entry.type === 'sale') {
      totalSales += entry.total;
    } else {
      totalExpenses += entry.total;
    }
  }

  return {
    date,
    totalSales,
    totalExpenses,
    profit: totalSales - totalExpenses,
    entryCount: entries.length,
  };
}

export function summarizeDay(entries: Entry[]): DaySummary {
  const date = entries[0]?.date ?? '';
  return summarizeEntries(date, entries);
}

function normalizeItem(item: string): string {
  return item.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
}

function topByItem(entries: readonly Entry[], type: Entry['type']) {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    if (entry.type !== type) continue;
    const item = normalizeItem(entry.item);
    if (!item) continue;
    totals.set(item, (totals.get(item) ?? 0) + entry.total);
  }

  return [...totals.entries()]
    .map(([item, total]) => ({ item, total }))
    .sort((a, b) => b.total - a.total || a.item.localeCompare(b.item, 'en'));
}

export function buildMonthReport(
  entries: Entry[],
  month: string
): MonthReportData {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error(`Invalid month; expected YYYY-MM: ${month}`);
  }

  const monthEntries = entries.filter((entry) => entry.date.startsWith(`${month}-`));
  const byDate = new Map<string, Entry[]>();
  for (const entry of monthEntries) {
    const dayEntries = byDate.get(entry.date) ?? [];
    dayEntries.push(entry);
    byDate.set(entry.date, dayEntries);
  }

  const daily = [...byDate.entries()]
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, dayEntries]) => {
      const summary = summarizeEntries(date, dayEntries);
      return {
        date,
        sales: summary.totalSales,
        expenses: summary.totalExpenses,
      };
    });

  let totalSales = 0;
  let totalExpenses = 0;
  for (const day of daily) {
    totalSales += day.sales;
    totalExpenses += day.expenses;
  }

  const activeDays = daily.length;
  return {
    month,
    totalSales,
    totalExpenses,
    netProfit: totalSales - totalExpenses,
    activeDays,
    avgDailySales: activeDays ? Math.round(totalSales / activeDays) : 0,
    topItems: topByItem(monthEntries, 'sale'),
    topExpenses: topByItem(monthEntries, 'expense'),
    daily,
  };
}
