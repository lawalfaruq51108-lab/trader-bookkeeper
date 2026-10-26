import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { useColorScheme } from '@/components/useColorScheme';
import { getDemoDatabase, markDemoEntry } from '@/src/db/demo';
import { addEntries, type NewEntry } from '@/src/db/entries';
import { getDemoMode } from '@/src/db/settings';
import type {
  EntryType,
  ParseResult,
  ParsedEntry,
} from '@/src/domain/types';

interface DraftEntry {
  id: string;
  type: EntryType;
  item: string;
  qty: string;
  unit: string;
  unitPrice: string;
  total: string;
  rawClause: string;
  confidence: 'high' | 'low';
  issues: string[];
}

function getLocalDate(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isParsedEntry(value: unknown): value is ParsedEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return (
    (entry.type === 'sale' || entry.type === 'expense') &&
    (entry.item === null || typeof entry.item === 'string') &&
    (entry.qty === null || typeof entry.qty === 'number') &&
    (entry.unit === null || typeof entry.unit === 'string') &&
    (entry.unitPrice === null || typeof entry.unitPrice === 'number') &&
    (entry.total === null || typeof entry.total === 'number') &&
    typeof entry.rawClause === 'string' &&
    (entry.confidence === 'high' || entry.confidence === 'low') &&
    Array.isArray(entry.issues) &&
    entry.issues.every((issue) => typeof issue === 'string')
  );
}

function isParseResult(value: unknown): value is ParseResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Record<string, unknown>;
  return (
    Array.isArray(result.entries) &&
    result.entries.every(isParsedEntry) &&
    Array.isArray(result.unparsed) &&
    result.unparsed.every((clause) => typeof clause === 'string')
  );
}

function toDraft(entry: ParsedEntry, id: string): DraftEntry {
  return {
    id,
    type: entry.type,
    item: entry.item ?? '',
    qty: entry.qty === null ? '' : String(entry.qty),
    unit: entry.unit ?? '',
    unitPrice: entry.unitPrice === null ? '' : String(entry.unitPrice),
    total: entry.total === null ? '' : String(entry.total),
    rawClause: entry.rawClause,
    confidence: entry.confidence,
    issues: [...entry.issues],
  };
}

function todayIsValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function wholeNaira(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const amount = Number(value);
  return Number.isSafeInteger(amount) ? amount : null;
}

function quantityValue(value: string): number | null {
  if (!/^\d+(?:\.\d+)?$/.test(value.trim())) return null;
  const quantity = Number(value);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null;
}

export default function ConfirmScreen() {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark
    ? {
        background: '#121212',
        surface: '#1e1e1e',
        text: '#f5f5f5',
        secondaryText: '#d0d0d0',
        border: '#8a8a8a',
        button: '#176b35',
        warning: '#3b2e00',
        warningText: '#ffe082',
        error: '#ff8a80',
        danger: '#ffb4ab',
      }
    : {
        background: '#ffffff',
        surface: '#f5f5f5',
        text: '#111111',
        secondaryText: '#444444',
        border: '#666666',
        button: '#1b7f3b',
        warning: '#fff4ce',
        warningText: '#5c4300',
        error: '#b3261e',
        danger: '#8c1d18',
      };
  const params = useLocalSearchParams<{
    result?: string | string[];
    demoMode?: string | string[];
  }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const [entries, setEntries] = useState<DraftEntry[]>([]);
  const [date, setDate] = useState(getLocalDate);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [demoMode, setDemoModeState] = useState(false);

  useEffect(() => {
    let active = true;
    const rawResult = Array.isArray(params.result)
      ? params.result[0]
      : params.result;
    const requestedDemoMode = Array.isArray(params.demoMode)
      ? params.demoMode[0]
      : params.demoMode;
    if (requestedDemoMode === 'true' || requestedDemoMode === 'false') {
      setDemoModeState(requestedDemoMode === 'true');
    } else {
      getDemoMode(db)
        .then((enabled) => {
          if (active) setDemoModeState(enabled);
        })
        .catch((error: unknown) => {
          if (active) setLoadError(error instanceof Error ? error.message : String(error));
        });
    }
    if (!rawResult) {
      setLoadError('No parsed entries were received. Cancel and try parsing again.');
      setEntries([]);
      return () => {
        active = false;
      };
    }

    try {
      const result: unknown = JSON.parse(rawResult);
      if (!isParseResult(result)) {
        throw new Error('The parser result has an invalid shape.');
      }
      const drafts = result.entries.map((entry, index) =>
        toDraft(entry, `parsed-${index}`)
      );
      result.unparsed.forEach((rawClause, index) => {
        drafts.push(
          toDraft(
            {
              type: 'sale',
              item: null,
              qty: null,
              unit: null,
              unitPrice: null,
              total: null,
              rawClause,
              confidence: 'low',
              issues: ['unparsed', 'missing_item', 'missing_amount'],
            },
            `unparsed-${index}`
          )
        );
      });
      setEntries(drafts);
      setLoadError('');
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Could not read the parser result.'
      );
      setEntries([]);
    }
    return () => {
      active = false;
    };
  }, [db, params.demoMode, params.result]);

  const allTotalsValid = useMemo(
    () =>
      entries.length > 0 &&
      entries.every((entry) => wholeNaira(entry.total) !== null),
    [entries]
  );

  const updateEntry = (id: string, update: Partial<DraftEntry>) => {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, ...update } : entry
      )
    );
  };

  const updateQuantityOrPrice = (
    entry: DraftEntry,
    key: 'qty' | 'unitPrice',
    value: string
  ) => {
    const nextQty = key === 'qty' ? value : entry.qty;
    const nextPrice = key === 'unitPrice' ? value : entry.unitPrice;
    const qty = quantityValue(nextQty);
    const price = wholeNaira(nextPrice);
    const total =
      qty !== null && price !== null
        ? String(Math.round(qty * price))
        : '';
    updateEntry(entry.id, { [key]: value, total });
  };

  const handleSave = async () => {
    setSaveError('');
    if (!todayIsValidDate(date)) {
      setSaveError('Enter a valid date in YYYY-MM-DD format.');
      return;
    }
    if (!allTotalsValid) {
      setSaveError('Enter a whole-naira total for every entry before saving.');
      return;
    }

    setSaving(true);
    try {
      const timestamp = new Date().toISOString();
      const newEntries: NewEntry[] = entries.map((entry) => {
        const total = wholeNaira(entry.total);
        if (total === null) {
          throw new Error(
            `Entry "${entry.item || entry.rawClause}" has an invalid total.`
          );
        }
        const unitPrice =
          entry.unitPrice.trim() === '' ? null : wholeNaira(entry.unitPrice);
        if (entry.unitPrice.trim() !== '' && unitPrice === null) {
          throw new Error(
            `Entry "${entry.item || entry.rawClause}" has an invalid unit price.`
          );
        }
        const qty = entry.qty.trim() === '' ? null : quantityValue(entry.qty);
        if (entry.qty.trim() !== '' && qty === null) {
          throw new Error(
            `Entry "${entry.item || entry.rawClause}" has an invalid quantity.`
          );
        }
        return {
          date,
          type: entry.type,
          item: entry.item.trim(),
          qty,
          unit: entry.unit.trim() || null,
          unitPrice,
          total,
          rawText: entry.rawClause,
          createdAt: timestamp,
        };
      });
      const destination = demoMode ? await getDemoDatabase() : db;
      await addEntries(
        destination,
        demoMode ? newEntries.map(markDemoEntry) : newEntries
      );
      router.replace('/(tabs)');
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : 'Could not save entries.'
      );
    } finally {
      setSaving(false);
    }
  };

  const renderTextInput = (
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    keyboardType: 'default' | 'numeric' | 'decimal-pad' = 'default',
    accessibilityLabel?: string
  ) => (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.secondaryText}
      keyboardType={keyboardType}
      accessibilityLabel={accessibilityLabel ?? placeholder}
      style={[
        styles.field,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          color: colors.text,
        },
      ]}
    />
  );

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.text }]}>Review entries</Text>
      <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
        Check and edit everything before saving.
      </Text>
      {demoMode && (
        <Text style={[styles.demoBadge, { color: colors.button }]}>
          DEMO MODE — this will save only to the separate sample database.
        </Text>
      )}

      <Text style={[styles.label, { color: colors.text }]}>Date (YYYY-MM-DD)</Text>
      {renderTextInput(date, setDate, 'YYYY-MM-DD', 'default', 'Entry date')}

      {!!loadError && (
        <Text style={[styles.error, { color: colors.error }]}>{loadError}</Text>
      )}

      {entries.map((entry) => {
        const missingTotal = wholeNaira(entry.total) === null;
        const needsAttention = entry.confidence === 'low' || missingTotal;
        return (
          <View
            key={entry.id}
            style={[
              styles.card,
              {
                backgroundColor: needsAttention ? colors.warning : colors.surface,
                borderColor: missingTotal ? colors.error : colors.border,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                {entry.rawClause ? 'Parsed sentence' : 'Entry'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete entry"
                onPress={() =>
                  setEntries((current) =>
                    current.filter((item) => item.id !== entry.id)
                  )
                }
                style={({ pressed }) => [
                  styles.deleteButton,
                  {
                    borderColor: colors.danger,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text style={[styles.deleteText, { color: colors.danger }]}>
                  Delete
                </Text>
              </Pressable>
            </View>

            {needsAttention && (
              <Text style={[styles.warningText, { color: colors.warningText }]}>
                {missingTotal
                  ? 'Total missing — add a valid whole-naira amount.'
                  : 'Low confidence — please check this entry.'}
              </Text>
            )}
            {!!entry.rawClause && (
              <Text style={[styles.rawClause, { color: colors.secondaryText }]}>
                Heard: {entry.rawClause}
              </Text>
            )}

            <Text style={[styles.label, { color: colors.text }]}>Type</Text>
            <View style={styles.toggleRow}>
              {(['sale', 'expense'] as const).map((type) => {
                const selected = entry.type === type;
                return (
                  <Pressable
                    key={type}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => updateEntry(entry.id, { type })}
                    style={[
                      styles.typeButton,
                      {
                        backgroundColor: selected
                          ? colors.button
                          : colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        { color: selected ? '#ffffff' : colors.text },
                      ]}
                    >
                      {type === 'sale' ? 'Sale' : 'Expense'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, { color: colors.text }]}>Item</Text>
            {renderTextInput(
              entry.item,
              (item) => updateEntry(entry.id, { item }),
              'Item name',
              'default',
              'Entry item'
            )}

            <View style={styles.fieldRow}>
              <View style={styles.halfField}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Quantity
                </Text>
                {renderTextInput(
                  entry.qty,
                  (qty) => updateQuantityOrPrice(entry, 'qty', qty),
                  'Qty',
                  'decimal-pad',
                  'Entry quantity'
                )}
              </View>
              <View style={styles.halfField}>
                <Text style={[styles.label, { color: colors.text }]}>Unit</Text>
                {renderTextInput(
                  entry.unit,
                  (unit) => updateEntry(entry.id, { unit }),
                  'e.g. bag',
                  'default',
                  'Entry unit'
                )}
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.halfField}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Unit price (₦)
                </Text>
                {renderTextInput(
                  entry.unitPrice,
                  (unitPrice) =>
                    updateQuantityOrPrice(entry, 'unitPrice', unitPrice),
                  'Unit price',
                  'numeric',
                  'Entry unit price'
                )}
              </View>
              <View style={styles.halfField}>
                <Text style={[styles.label, { color: colors.text }]}>
                  Total (₦)
                </Text>
                {renderTextInput(
                  entry.total,
                  (total) => updateEntry(entry.id, { total }),
                  'Required',
                  'numeric',
                  'Entry total'
                )}
              </View>
            </View>
          </View>
        );
      })}

      {entries.length === 0 && !loadError && (
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
          No entries to review. Cancel and parse a sentence first.
        </Text>
      )}

      {!!saveError && (
        <Text style={[styles.error, { color: colors.error }]}>{saveError}</Text>
      )}

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.cancelButton,
            { borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Text style={[styles.cancelText, { color: colors.text }]}>Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!allTotalsValid || saving || !!loadError}
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor: colors.button,
              opacity: !allTotalsValid || saving || !!loadError
                ? 0.45
                : pressed
                  ? 0.8
                  : 1,
            },
          ]}
        >
          <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save All'}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    paddingTop: 28,
    paddingBottom: 40,
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  demoBadge: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 5,
  },
  field: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  card: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
    gap: 9,
    marginTop: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },
  deleteButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  deleteText: {
    fontSize: 15,
    fontWeight: '700',
  },
  warningText: {
    fontSize: 14,
    fontWeight: '700',
  },
  rawClause: {
    fontSize: 14,
    lineHeight: 19,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  halfField: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    minHeight: 56,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 17,
    fontWeight: '700',
  },
  saveButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  error: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
});
