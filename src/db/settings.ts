import type { SQLiteDatabase } from 'expo-sqlite';

const DEMO_MODE_KEY = 'demo_mode';

export async function getDemoMode(db: SQLiteDatabase): Promise<boolean> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    DEMO_MODE_KEY
  );
  return row?.value === 'true';
}

export async function setDemoMode(
  db: SQLiteDatabase,
  enabled: boolean
): Promise<void> {
  await db.runAsync(
    `INSERT INTO app_settings (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    DEMO_MODE_KEY,
    enabled ? 'true' : 'false'
  );
}
