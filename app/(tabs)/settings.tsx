import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { useColorScheme } from '@/components/useColorScheme';
import { clearDemoEntries, getDemoDatabase, replaceDemoEntries } from '@/src/db/demo';
import { getDemoMode, setDemoMode } from '@/src/db/settings';
import { generateDemoMonthEntries } from '@/src/demo/samples';

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function SettingsScreen() {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark
    ? {
        background: '#121212',
        surface: '#1e1e1e',
        text: '#f5f5f5',
        secondaryText: '#d0d0d0',
        border: '#8a8a8a',
        button: '#176b35',
        error: '#ff8a80',
      }
    : {
        background: '#ffffff',
        surface: '#f5f5f5',
        text: '#111111',
        secondaryText: '#444444',
        border: '#666666',
        button: '#1b7f3b',
        error: '#b3261e',
      };
  const db = useSQLiteContext();
  const [demoMode, setDemoModeState] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const refreshDemoMode = useCallback(async () => {
    try {
      setDemoModeState(await getDemoMode(db));
      setError('');
    } catch (loadError) {
      setError(errorMessage(loadError));
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void refreshDemoMode();
    }, [refreshDemoMode])
  );

  const changeDemoMode = async (enabled: boolean) => {
    setBusy(true);
    setError('');
    try {
      await setDemoMode(db, enabled);
      setDemoModeState(enabled);
      setMessage(enabled ? 'Demo mode is on.' : 'Demo mode is off.');
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setBusy(false);
    }
  };

  const loadSampleMonth = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const demoDb = await getDemoDatabase();
      const entries = generateDemoMonthEntries(currentMonth());
      await replaceDemoEntries(demoDb, entries);
      await setDemoMode(db, true);
      setDemoModeState(true);
      setMessage(`Loaded ${entries.length} clearly labeled sample entries for ${currentMonth()}.`);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setBusy(false);
    }
  };

  const confirmClearDemoData = () => {
    Alert.alert(
      'Clear demo data?',
      'This removes sample entries from the separate demo database. Real entries are not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear demo data',
          style: 'destructive',
          onPress: () => {
            setBusy(true);
            setError('');
            setMessage('');
            void getDemoDatabase()
              .then(clearDemoEntries)
              .then(() => setMessage('Demo entries cleared. Real entries were not changed.'))
              .catch((clearError: unknown) => setError(errorMessage(clearError)))
              .finally(() => setBusy(false));
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      <Text style={[styles.intro, { color: colors.secondaryText }]}>
        Demo entries live in a separate database and are never mixed with your
        real records.
      </Text>

      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Demo mode
            </Text>
            <Text style={[styles.description, { color: colors.secondaryText }]}>
              {demoMode
                ? 'Screens are using clearly labeled demo data.'
                : 'Screens are using your real data.'}
            </Text>
          </View>
          <Switch
            value={demoMode}
            disabled={busy}
            onValueChange={(enabled) => void changeDemoMode(enabled)}
            accessibilityLabel="Demo mode"
          />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void loadSampleMonth()}
        style={({ pressed }) => [
          styles.actionButton,
          {
            backgroundColor: colors.button,
            opacity: busy ? 0.55 : pressed ? 0.8 : 1,
          },
        ]}
      >
        <Text style={styles.actionButtonText}>
          {busy ? 'Please wait...' : 'Load sample month'}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={confirmClearDemoData}
        style={({ pressed }) => [
          styles.clearButton,
          {
            borderColor: colors.border,
            opacity: busy ? 0.55 : pressed ? 0.75 : 1,
          },
        ]}
      >
        <Text style={[styles.clearButtonText, { color: colors.text }]}>
          Clear demo data
        </Text>
      </Pressable>

      {!!message && (
        <Text style={[styles.message, { color: colors.text }]}>{message}</Text>
      )}
      {!!error && (
        <Text style={[styles.message, { color: colors.error }]}>{error}</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 28,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
  },
  intro: {
    fontSize: 16,
    lineHeight: 23,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchCopy: {
    flex: 1,
    gap: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionButton: {
    minHeight: 56,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  clearButton: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  message: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
});
