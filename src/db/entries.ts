import type { SQLiteDatabase } from 'expo-sqlite';
import type { Entry, EntryType } from '../domain/types';

export type NewEntry = Omit<Entry, 'id'>;

export interface ActiveDay {
  date: string;
  entryCount: number;
}

interface EntryRow {
  id: number;
  date: string;
  type: EntryType;
  item: string;
  qty: number | null;
  unit: string | null;
  unit_price: number | null;
  total: number;
  raw_text: string | null;
  created_at: string;
}

function toEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    item: row.item,
    qty: row.qty,
    unit: row.unit,
    unitPrice: row.unit_price,
    total: row.total,
    rawText: row.raw_text ?? '',
    createdAt: row.created_at,
  };
}

function validateEntry(entry: NewEntry): void {
  validateDate(entry.date);
  if (entry.type !== 'sale' && entry.type !== 'expense') {
    throw new Error(`Invalid entry type: ${String(entry.type)}`);
  }
  if (!Number.isSafeInteger(entry.total)) {
    throw new Error('Entry total must be a whole-naira safe integer.');
  }
  if (entry.unitPrice !== null && !Number.isSafeInteger(entry.unitPrice)) {
    throw new Error('Entry unit price must be a whole-naira safe integer.');
  }
  if (entry.qty !== null && !Number.isFinite(entry.qty)) {
    throw new Error('Entry quantity must be a finite number.');
  }
}

function validateDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid entry date: ${date}`);
  }
}

function validateMonth(month: string): void {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error(`Invalid month; expected YYYY-MM: ${month}`);
  }
}

export async function addEntries(
  db: SQLiteDatabase,
  entries: readonly NewEntry[]
): Promise<Entry[]> {
  for (const entry of entries) validateEntry(entry);
  if (entries.length === 0) return [];

  const created: Entry[] = [];
  await db.withExclusiveTransactionAsync(async (transaction) => {
    for (const entry of entries) {
      const result = await transaction.runAsync(
        `INSERT INTO entries
          (date, type, item, qty, unit, unit_price, total, raw_text, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        entry.date,
        entry.type,
        entry.item,
        entry.qty,
        entry.unit,
        entry.unitPrice,
        entry.total,
        entry.rawText,
        entry.createdAt
      );
      created.push({ ...entry, id: result.lastInsertRowId });
    }
  });
  return created;
}

export async function updateEntry(
  db: SQLiteDatabase,
  entry: Entry
): Promise<void> {
  validateEntry(entry);
  const result = await db.runAsync(
    `UPDATE entries
     SET date = ?, type = ?, item = ?, qty = ?, unit = ?, unit_price = ?,
         total = ?, raw_text = ?, created_at = ?
     WHERE id = ?`,
    entry.date,
    entry.type,
    entry.item,
    entry.qty,
    entry.unit,
    entry.unitPrice,
    entry.total,
    entry.rawText,
    entry.createdAt,
    entry.id
  );
  if (result.changes === 0) {
    throw new Error(`Cannot update entry ${entry.id}: entry not found.`);
  }
}

export async function deleteEntry(
  db: SQLiteDatabase,
  id: number
): Promise<boolean> {
  const result = await db.runAsync('DELETE FROM entries WHERE id = ?', id);
  return result.changes > 0;
}

export async function getEntriesByDate(
  db: SQLiteDatabase,
  date: string
): Promise<Entry[]> {
  validateDate(date);
  const rows = await db.getAllAsync<EntryRow>(
    'SELECT * FROM entries WHERE date = ? ORDER BY id',
    date
  );
  return rows.map(toEntry);
}

export async function getEntriesByMonth(
  db: SQLiteDatabase,
  month: string
): Promise<Entry[]> {
  validateMonth(month);
  const rows = await db.getAllAsync<EntryRow>(
    `SELECT * FROM entries
     WHERE date >= ? AND date < date(?, '+1 month')
     ORDER BY date, id`,
    `${month}-01`,
    `${month}-01`
  );
  return rows.map(toEntry);
}

export async function getDaysWithActivity(
  db: SQLiteDatabase,
  month?: string
): Promise<ActiveDay[]> {
  let rows: ActiveDay[];
  if (month !== undefined) {
    validateMonth(month);
    rows = await db.getAllAsync<ActiveDay>(
      `SELECT date, COUNT(*) AS entryCount
       FROM entries
       WHERE date >= ? AND date < date(?, '+1 month')
       GROUP BY date
       ORDER BY date DESC`,
      `${month}-01`,
      `${month}-01`
    );
  } else {
    rows = await db.getAllAsync<ActiveDay>(
      `SELECT date, COUNT(*) AS entryCount
       FROM entries
       GROUP BY date
       ORDER BY date DESC`
    );
  }
  return rows;
}
