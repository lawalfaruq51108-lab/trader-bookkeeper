export type EntryType = 'sale' | 'expense';

export interface ParsedEntry {
  type: EntryType;
  item: string | null;
  qty: number | null;
  unit: string | null;
  unitPrice: number | null; // Whole-naira integer.
  total: number | null; // Whole-naira integer.
  rawClause: string;
  confidence: 'high' | 'low';
  issues: string[];
}

export interface ParseResult {
  entries: ParsedEntry[];
  unparsed: string[];
}

export interface Entry {
  id: number;
  date: string;
  type: EntryType;
  item: string;
  qty: number | null;
  unit: string | null;
  unitPrice: number | null; // Whole-naira integer.
  total: number; // Whole-naira integer.
  rawText: string;
  createdAt: string;
}

export interface DaySummary {
  date: string;
  totalSales: number; // Whole-naira integer.
  totalExpenses: number; // Whole-naira integer.
  profit: number; // Whole-naira integer.
  entryCount: number;
}

export interface MonthReportData {
  month: string;
  totalSales: number; // Whole-naira integer.
  totalExpenses: number; // Whole-naira integer.
  netProfit: number; // Whole-naira integer.
  activeDays: number;
  avgDailySales: number; // Whole-naira integer.
  topItems: { item: string; total: number }[];
  topExpenses: { item: string; total: number }[];
  daily: { date: string; sales: number; expenses: number }[];
}
