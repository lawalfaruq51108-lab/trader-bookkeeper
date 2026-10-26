import { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { useColorScheme } from '@/components/useColorScheme';
import { getDemoDatabase } from '@/src/db/demo';
import { getEntriesByMonth } from '@/src/db/entries';
import { getProfile } from '@/src/db/profile';
import { getDemoMode } from '@/src/db/settings';
import { buildMonthReport } from '@/src/domain/aggregate';
import { formatNaira } from '@/src/domain/money';
import type { MonthReportData } from '@/src/domain/types';
import type { Profile } from '@/src/db/profile';
import { shareReportPdf } from '@/src/report/generate';

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function isValidMonth(month: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function ReportScreen() {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark
    ? {
        background: '#121212',
        surface: '#1e1e1e',
        text: '#f5f5f5',
        secondaryText: '#d0d0d0',
        border: '#8a8a8a',
        button: '#176b35',
        accent: '#9bd7ad',
        error: '#ff8a80',
      }
    : {
        background: '#ffffff',
        surface: '#f5f5f5',
        text: '#111111',
        secondaryText: '#444444',
        border: '#666666',
        button: '#1b7f3b',
        accent: '#145c2e',
        error: '#b3261e',
      };
  const db = useSQLiteContext();
  const [month, setMonth] = useState(currentMonth);
  const monthRef = useRef(month);
  const [report, setReport] = useState<MonthReportData | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');

  const loadReport = useCallback(
    async (requestedMonth: string) => {
      if (!isValidMonth(requestedMonth)) {
        setError('Enter a month in YYYY-MM format.');
        return;
      }
      setLoading(true);
      setError('');
      try {
        const enabled = await getDemoMode(db);
        const source = enabled ? await getDemoDatabase() : db;
        const [entries, savedProfile] = await Promise.all([
          getEntriesByMonth(source, requestedMonth),
          getProfile(db),
        ]);
        setDemoMode(enabled);
        setProfile(savedProfile);
        setReport(buildMonthReport(entries, requestedMonth));
      } catch (loadError) {
        setError(errorMessage(loadError));
        setReport(null);
      } finally {
        setLoading(false);
      }
    },
    [db]
  );

  useFocusEffect(
    useCallback(() => {
      void loadReport(monthRef.current);
    }, [loadReport])
  );

  const handleShare = async () => {
    if (!report) return;
    setSharing(true);
    setError('');
    try {
      await shareReportPdf(report, profile, demoMode);
    } catch (shareError) {
      setError(errorMessage(shareError));
    } finally {
      setSharing(false);
    }
  };

  const renderTop = (
    title: string,
    items: MonthReportData['topItems']
  ) => (
    <View style={[styles.listCard, { backgroundColor: colors.surface }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
      {items.length === 0 ? (
        <Text style={[styles.mutedText, { color: colors.secondaryText }]}>
          Nothing recorded
        </Text>
      ) : (
        items.slice(0, 5).map((item) => (
          <View key={item.item} style={styles.listRow}>
            <Text style={[styles.listName, { color: colors.text }]}>
              {item.item}
            </Text>
            <Text style={[styles.listAmount, { color: colors.text }]}>
              {formatNaira(item.total)}
            </Text>
          </View>
        ))
      )}
    </View>
  );

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: colors.text }]}>Monthly report</Text>
      <Text style={[styles.description, { color: colors.secondaryText }]}>
        Choose a month to preview and share your report. It is generated on this
        device and works offline.
      </Text>

      <View style={styles.monthRow}>
        <TextInput
          value={month}
          onChangeText={(value) => {
            monthRef.current = value;
            setMonth(value);
          }}
          placeholder="YYYY-MM"
          placeholderTextColor={colors.secondaryText}
          accessibilityLabel="Report month in YYYY-MM format"
          style={[
            styles.monthInput,
            {
              color: colors.text,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          disabled={loading}
          onPress={() => void loadReport(month)}
          style={({ pressed }) => [
            styles.loadButton,
            {
              backgroundColor: colors.button,
              opacity: loading ? 0.55 : pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text style={styles.buttonText}>{loading ? 'Loading...' : 'Preview'}</Text>
        </Pressable>
      </View>

      {demoMode && (
        <Text style={[styles.demoBadge, { color: colors.accent }]}>
          DEMO REPORT — SAMPLE DATA
        </Text>
      )}
      {!!error && (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      )}

      {report && (
        <>
          <View style={[styles.previewHeader, { borderColor: colors.border }]}>
            <Text style={[styles.previewTitle, { color: colors.text }]}>
              {profile?.businessName || 'Provisions shop'}
            </Text>
            <Text style={[styles.mutedText, { color: colors.secondaryText }]}>
              {profile?.traderName || 'Trader'} · {report.month}
            </Text>
          </View>

          <View style={styles.summaryGrid}>
            <SummaryCard
              label="Total sales"
              value={formatNaira(report.totalSales)}
              colors={colors}
            />
            <SummaryCard
              label="Total expenses"
              value={formatNaira(report.totalExpenses)}
              colors={colors}
            />
            <SummaryCard
              label="Net profit"
              value={formatNaira(report.netProfit)}
              colors={colors}
            />
            <SummaryCard
              label="Active days"
              value={String(report.activeDays)}
              colors={colors}
            />
            <SummaryCard
              label="Average daily sales"
              value={formatNaira(report.avgDailySales)}
              colors={colors}
            />
          </View>

          {renderTop('Top 5 items sold', report.topItems)}
          {renderTop('Top 5 expenses', report.topExpenses)}

          <View style={[styles.signature, { borderColor: colors.border }]}>
            <Text style={[styles.mutedText, { color: colors.secondaryText }]}>
              Trader signature
            </Text>
          </View>
          <Text style={[styles.honesty, { color: colors.secondaryText }]}>
            Generated from the trader's own self-recorded entries. Not
            independently audited.
          </Text>

          <Pressable
            accessibilityRole="button"
            disabled={sharing || loading}
            onPress={() => void handleShare()}
            style={({ pressed }) => [
              styles.shareButton,
              {
                backgroundColor: colors.button,
                opacity: sharing || loading ? 0.55 : pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={styles.buttonText}>
              {sharing ? 'Preparing PDF...' : 'Share PDF'}
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function SummaryCard({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: {
    surface: string;
    text: string;
    secondaryText: string;
  };
}) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
      <Text style={[styles.summaryLabel, { color: colors.secondaryText }]}>
        {label}
      </Text>
      <Text style={[styles.summaryValue, { color: colors.text }]}>{value}</Text>
    </View>
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
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  monthRow: {
    flexDirection: 'row',
    gap: 10,
  },
  monthInput: {
    flex: 1,
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 12,
    fontSize: 17,
  },
  loadButton: {
    minHeight: 50,
    paddingHorizontal: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  demoBadge: {
    fontSize: 13,
    fontWeight: '800',
  },
  error: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
  previewHeader: {
    borderBottomWidth: 1,
    paddingBottom: 10,
    gap: 4,
  },
  previewTitle: {
    fontSize: 21,
    fontWeight: '800',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 82,
    padding: 12,
    borderRadius: 10,
    justifyContent: 'center',
    gap: 6,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  summaryValue: {
    fontSize: 19,
    fontWeight: '800',
  },
  listCard: {
    padding: 14,
    borderRadius: 10,
    gap: 9,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  listName: {
    flex: 1,
    fontSize: 15,
  },
  listAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  mutedText: {
    fontSize: 14,
    lineHeight: 20,
  },
  signature: {
    width: '65%',
    borderTopWidth: 1,
    paddingTop: 6,
    marginTop: 8,
  },
  honesty: {
    fontSize: 13,
    lineHeight: 19,
  },
  shareButton: {
    minHeight: 56,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
