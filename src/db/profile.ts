import type { SQLiteDatabase } from 'expo-sqlite';

export interface Profile {
  traderName: string | null;
  businessName: string | null;
  traderType: string | null;
  phone: string | null;
  currency: string;
  language: string;
}

interface ProfileRow {
  trader_name: string | null;
  business_name: string | null;
  trader_type: string | null;
  phone: string | null;
  currency: string;
  language: string;
}

export async function getProfile(
  db: SQLiteDatabase
): Promise<Profile | null> {
  const row = await db.getFirstAsync<ProfileRow>(
    'SELECT trader_name, business_name, trader_type, phone, currency, language FROM profile WHERE id = 1'
  );
  if (!row) return null;

  return {
    traderName: row.trader_name,
    businessName: row.business_name,
    traderType: row.trader_type,
    phone: row.phone,
    currency: row.currency,
    language: row.language,
  };
}

export async function saveProfile(
  db: SQLiteDatabase,
  profile: Profile
): Promise<void> {
  await db.runAsync(
    `INSERT INTO profile
      (id, trader_name, business_name, trader_type, phone, currency, language)
     VALUES (1, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       trader_name = excluded.trader_name,
       business_name = excluded.business_name,
       trader_type = excluded.trader_type,
       phone = excluded.phone,
       currency = excluded.currency,
       language = excluded.language`,
    profile.traderName,
    profile.businessName,
    profile.traderType,
    profile.phone,
    profile.currency,
    profile.language
  );
}
