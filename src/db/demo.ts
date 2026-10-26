import { openDatabaseAsync } from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Entry } from '../domain/types';
import type { NewEntry } from './entries';
import { migrateDatabase } from './client';

export const DEMO_DATABASE_NAME = 'trader-bookkeeper-demo.db';

let demoDatabase: Promise<SQLiteDatabase> | null = null;

export function getDemoDatabase(): Promise<SQLiteDatabase> {
  if (!demoDatabase) {
    demoDatabase = openDatabaseAsync(DEMO_DATABASE_NAME)
      .then(async (db) => {
        await migrateDatabase(db);
        return db;
      })
      .catch((error: unknown) => {
        demoDatabase = null;
        throw error;
      });
  }
  return demoDatabase;
}

export async function replaceDemoEntries(
  db: SQLiteDatabase,
  entries: readonly NewEntry[]
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync('DELETE FROM entries');
    for (const entry of entries) {
      await transaction.runAsync(
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
        `[DEMO] ${entry.rawText.replace(/^\[DEMO\]\s*/, '')}`,
        entry.createdAt
      );
    }
  });
}

export async function clearDemoEntries(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM entries');
}

export function markDemoEntry(entry: NewEntry): NewEntry {
  return {
    ...entry,
    rawText: `[DEMO] ${entry.rawText.replace(/^\[DEMO\]\s*/, '')}`,
  };
}

export function isDemoEntry(entry: Entry): boolean {
  return entry.rawText.startsWith('[DEMO]');
}
