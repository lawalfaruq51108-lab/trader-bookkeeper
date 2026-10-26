import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { useColorScheme } from '@/components/useColorScheme';
import { getDemoDatabase } from '@/src/db/demo';
import {
  deleteEntry,
  getEntriesByDate,
  updateEntry,
} from '@/src/db/entries';
import { getDemoMode } from '@/src/db/settings';
import { summarizeDay } from '@/src/domain/aggregate';
import { formatNaira } from '@/src/domain/money';
import type { Entry, EntryType } from '@/src/domain/types';

interface EntryDraft {
  type: EntryType;
  item: string;
  qty: string;
  unit: string;
  unitPrice: string;
  total: string;
}

function getLocalDate(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDraft(entry: Entry): EntryDraft {
  return {
    type: entry.type,
    item: entry.item,
    qty: entry.qty === null ? '' : String(entry.qty),
    unit: entry.unit ?? '',
    unitPrice: entry.unitPrice === null ? '' : String(entry.unitPrice),
    total: String(entry.total),
  };
}

function parseWholeNaira(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const amount = Number(value);
  return Number.isSafeInteger(amount) ? amount : null;
}

function parseQuantity(value: string): number | null {
  if (!/^\d+(?:\.\d+)?$/.test(value.trim())) return null;
  const quantity = Number(value);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function TodayScreen() {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark
    ? {
        background: '#121212',
        surface: '#1e1e1e',
        text: '#f5f5f5',
        secondaryText: '#d0d0d0',
        border: '#8a8a8a',
        accent: '#9bd7ad',
        button: '#176b35',
        danger: '#ff8a80',
        sale: '#9bd7ad',
        expense: '#ffb4ab',
      }
    : {
        background: '#ffffff',
        surface: '#f5f5f5',
        text: '#111111',
        secondaryText: '#444444',
        border: '#666666',
        accent: '#145c2e',
        button: '#1b7f3b',
        danger: '#b3261e',
        sale: '#145c2e',
        expense: '#8c1d18',
      };
  const db = useSQLiteContext();
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState<EntryDraft | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [demoMode, setDemoModeState] = useState(false);
  const today = getLocalDate();
  const summary = summarizeDay(entries);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const enabled = await getDemoMode(db);
      setDemoModeState(enabled);
      const source = enabled ? await getDemoDatabase() : db;
      const todaysEntries = await getEntriesByDate(source, today);
      setEntries(todaysEntries);
      setError('');
    } catch (loadError) {
      setError(messageOf(loadError));
    } finally {
      setLoading(false);
    }
  }, [db, today]);

  useFocusEffect(
    useCallback(() => {
      void loadEntries();
    }, [loadEntries])
  );

  const openEditor = (entry: Entry) => {
    setEditingId(entry.id);
    setDraft(toDraft(entry));
    setError('');
  };

  const closeEditor = () => {
    setEditingId(null);
    setDraft(null);
  };

  const updateDraftField = (
    field: keyof EntryDraft,
    value: string | EntryType
  ) => {
    setDraft((current) => {
      if (!current) return current;
      const updated = { ...current, [field]: value };
      if (field === 'qty' || field === 'unitPrice') {
        const qty = parseQuantity(
          field === 'qty' ? (value as string) : updated.qty
        );
        const unitPrice = parseWholeNaira(
          field === 'unitPrice' ? (value as string) : updated.unitPrice
        );
        updated.total =
          qty !== null && unitPrice !== null
            ? String(Math.round(qty * unitPrice))
            : '';
      }
      return updated;
    });
  };

  const saveEdit = async () => {
    const entry = entries.find((item) => item.id === editingId);
    if (!entry || !draft) return;

    const total = parseWholeNaira(draft.total);
    if (total === null) {
      setError('Enter a valid whole-naira total.');
      return;
    }
    const unitPrice =
      draft.unitPrice.trim() === ''
        ? null
        : parseWholeNaira(draft.unitPrice);
    if (draft.unitPrice.trim() !== '' && unitPrice === null) {
      setError('Enter a valid whole-naira unit price.');
      return;
    }
    const qty = draft.qty.trim() === '' ? null : parseQuantity(draft.qty);
    if (draft.qty.trim() !== '' && qty === null) {
      setError('Enter a valid quantity greater than zero.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const source = demoMode ? await getDemoDatabase() : db;
      await updateEntry(source, {
        ...entry,
        type: draft.type,
        item: draft.item.trim(),
        qty,
        unit: draft.unit.trim() || null,
        unitPrice,
        total,
      });
      closeEditor();
      await loadEntries();
    } catch (saveError) {
      setError(messageOf(saveError));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (entry: Entry) => {
    Alert.alert(
      'Delete entry?',
      `Delete ${entry.item || entry.type} for ${formatNaira(entry.total)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (demoMode ? getDemoDatabase() : Promise.resolve(db))
              .then((source) => deleteEntry(source, entry.id))
              .then(() => {
                if (editingId === entry.id) closeEditor();
                return loadEntries();
              })
              .catch((deleteError: unknown) => setError(messageOf(deleteError)));
          },
        },
      ]
    );
  };

  const renderField = (
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    keyboardType: 'default' | 'numeric' | 'decimal-pad' = 'default'
  ) => (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.secondaryText}
      keyboardType={keyboardType}
      style={[
        styles.input,
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
      <Text style={[styles.title, { color: colors.text }]}>Today</Text>
      {demoMode && (
        <Text style={[styles.demoBadge, { color: colors.accent }]}>
          DEMO MODE — SAMPLE DATA ONLY
        </Text>
      )}
      <Text style={[styles.date, { color: colors.secondaryText }]}>{today}</Text>

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryLabel, { color: colors.secondaryText }]}>
            Sales
          </Text>
          <Text style={[styles.summaryAmount, { color: colors.text }]}>
            {formatNaira(summary.totalSales)}
          </Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.summaryLabel, { color: colors.secondaryText }]}>
            Expenses
          </Text>
          <Text style={[styles.summaryAmount, { color: colors.text }]}>
            {formatNaira(summary.totalExpenses)}
          </Text>
        </View>
      </View>
      <View style={[styles.profitCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.summaryLabel, { color: colors.secondaryText }]}>
          Profit
        </Text>
        <Text style={[styles.profitAmount, { color: colors.accent }]}>
          {formatNaira(summary.profit)}
        </Text>
      </View>

      {!!error && (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      )}

      {loading ? (
        <Text style={[styles.message, { color: colors.secondaryText }]}>
          Loading today's entries...
        </Text>
      ) : entries.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Nothing recorded today
          </Text>
          <Text style={[styles.message, { color: colors.secondaryText }]}>
            Add your first sale or expense from Record.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(tabs)')}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.button, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={styles.primaryButtonText}>Go to Record</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.list}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Entries
          </Text>
          {entries.map((entry) => {
            const isEditing = editingId === entry.id && draft !== null;
            return (
              <View
                key={entry.id}
                style={[
                  styles.entryCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${entry.type}: ${entry.item}`}
                  onPress={() =>
                    isEditing ? closeEditor() : openEditor(entry)
                  }
                  style={styles.entryHeader}
                >
                  <View
                    style={[
                      styles.typeIcon,
                      {
                        backgroundColor:
                          entry.type === 'sale' ? colors.sale : colors.expense,
                      },
                    ]}
                  >
                    <Text style={styles.typeIconText}>
                      {entry.type === 'sale' ? '+' : '−'}
                    </Text>
                  </View>
                  <View style={styles.entryDescription}>
                    <Text style={[styles.entryTitle, { color: colors.text }]}>
                      {entry.item || 'Untitled entry'}
                    </Text>
                    <Text
                      style={[
                        styles.entrySubtitle,
                        {
                          color:
                            entry.type === 'sale' ? colors.sale : colors.expense,
                        },
                      ]}
                    >
                      {entry.type === 'sale' ? 'Sale' : 'Expense'}
                      {entry.qty !== null
                        ? ` · ${entry.qty}${entry.unit ? ` ${entry.unit}` : ''}`
                        : ''}
                    </Text>
                  </View>
                  <Text style={[styles.entryAmount, { color: colors.text }]}>
                    {formatNaira(entry.total)}
                  </Text>
                </Pressable>

                {isEditing && draft && (
                  <View style={styles.editor}>
                    <View style={styles.typeRow}>
                      {(['sale', 'expense'] as const).map((type) => {
                        const selected = draft.type === type;
                        return (
                          <Pressable
                            key={type}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            onPress={() => updateDraftField('type', type)}
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
                    {renderField(draft.item, (value) =>
                      updateDraftField('item', value), 'Item name')}
                    <View style={styles.fieldRow}>
                      {renderField(
                        draft.qty,
                        (value) => updateDraftField('qty', value),
                        'Quantity',
                        'decimal-pad'
                      )}
                      {renderField(
                        draft.unit,
                        (value) => updateDraftField('unit', value),
                        'Unit'
                      )}
                    </View>
                    <View style={styles.fieldRow}>
                      {renderField(
                        draft.unitPrice,
                        (value) => updateDraftField('unitPrice', value),
                        'Unit price',
                        'numeric'
                      )}
                      {renderField(
                        draft.total,
                        (value) => updateDraftField('total', value),
                        'Total',
                        'numeric'
                      )}
                    </View>
                    <View style={styles.editorActions}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => confirmDelete(entry)}
                        style={[
                          styles.deleteButton,
                          { borderColor: colors.danger },
                        ]}
                      >
                        <Text
                          style={[
                            styles.actionText,
                            { color: colors.danger },
                          ]}
                        >
                          Delete
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        disabled={saving}
                        onPress={() => void saveEdit()}
                        style={[
                          styles.saveButton,
                          {
                            backgroundColor: colors.button,
                            opacity: saving ? 0.6 : 1,
                          },
                        ]}
                      >
                        <Text style={[styles.actionText, { color: '#ffffff' }]}>
                          {saving ? 'Saving...' : 'Save'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    paddingTop: 28,
    paddingBottom: 40,
    gap: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  demoBadge: {
    fontSize: 13,
    fontWeight: '800',
  },
  date: {
    fontSize: 15,
    marginTop: -10,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    minHeight: 96,
    borderRadius: 12,
    padding: 14,
    justifyContent: 'center',
    gap: 6,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: '800',
  },
  profitCard: {
    minHeight: 98,
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    gap: 6,
  },
  profitAmount: {
    fontSize: 30,
    fontWeight: '800',
  },
  error: {
    fontSize: 15,
    fontWeight: '600',
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
  },
  emptyCard: {
    borderRadius: 12,
    padding: 20,
    gap: 12,
    alignItems: 'flex-start',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  primaryButton: {
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: 10,
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  list: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  entryCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  entryHeader: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  typeIcon: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  entryDescription: {
    flex: 1,
    gap: 3,
  },
  entryTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  entrySubtitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  entryAmount: {
    fontSize: 17,
    fontWeight: '800',
  },
  editor: {
    gap: 10,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 11,
    fontSize: 16,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 8,
  },
  editorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  deleteButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
  },
  saveButton: {
    minHeight: 44,
    minWidth: 90,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
