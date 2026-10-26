import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'trader-bookkeeper.db';

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS entries (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT NOT NULL,
      type        TEXT NOT NULL CHECK (type IN ('sale','expense')),
      item        TEXT NOT NULL DEFAULT '',
      qty         REAL,
      unit        TEXT,
      unit_price  INTEGER,
      total       INTEGER NOT NULL,
      raw_text    TEXT,
      created_at  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);

    CREATE TABLE IF NOT EXISTS profile (
      id            INTEGER PRIMARY KEY CHECK (id = 1),
      trader_name   TEXT,
      business_name TEXT,
      trader_type   TEXT,
      phone         TEXT,
      currency      TEXT DEFAULT '₦',
      language      TEXT DEFAULT 'en'
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}
