import { useCallback, useEffect, useRef, useState } from 'react';
import {
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
import { getEntriesByDate } from '@/src/db/entries';
import { getDemoMode, setDemoMode } from '@/src/db/settings';
import { summarizeDay } from '@/src/domain/aggregate';
import type { ParseResult } from '@/src/domain/types';
import { parseTranscript } from '@/src/parser';
import {
  isModelReady,
  loadModel,
  release,
  startRecording,
  stopAndTranscribe,
  type SpeechLoadProgress,
} from '@/src/speech/input';
import { DEMO_SAMPLES } from '@/src/demo/samples';

function getLocalDate(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function RecordScreen() {
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
        error: '#ff8a80',
      }
    : {
        background: '#ffffff',
        surface: '#f5f5f5',
        text: '#111111',
        secondaryText: '#444444',
        border: '#666666',
        accent: '#145c2e',
        button: '#1b7f3b',
        error: '#b3261e',
      };
  const db = useSQLiteContext();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [transcript, setTranscript] = useState('');
  const [todayProfit, setTodayProfit] = useState(0);
  const [profitError, setProfitError] = useState('');
  const [voiceState, setVoiceState] = useState<
    'idle' | 'loading' | 'recording' | 'transcribing'
  >('idle');
  const [loadProgress, setLoadProgress] = useState<SpeechLoadProgress | null>(
    null
  );
  const [voiceError, setVoiceError] = useState('');
  const [parseError, setParseError] = useState('');
  const [demoMode, setDemoModeState] = useState(false);
  const today = getLocalDate();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getDemoMode(db)
        .then(async (enabled) => {
          if (!active) return;
          setDemoModeState(enabled);
          const source = enabled ? await getDemoDatabase() : db;
          const entries = await getEntriesByDate(source, today);
          if (active) {
            setTodayProfit(summarizeDay(entries).profit);
            setProfitError('');
          }
        })
        .catch((error: unknown) => {
          if (active) setProfitError(errorText(error));
        });

      return () => {
        active = false;
      };
    }, [db, today])
  );

  useEffect(() => {
    return () => {
      release().catch((error: unknown) => {
        console.error('[Record] Failed to release speech resources:', error);
      });
    };
  }, []);

  const handleVoicePress = async () => {
    setVoiceError('');
    setLoadProgress(null);

    if (voiceState === 'recording') {
      setVoiceState('transcribing');
      try {
        const recognizedText = await stopAndTranscribe();
        setTranscript((current) =>
          current.trim()
            ? `${current.trim()} ${recognizedText}`
            : recognizedText
        );
      } catch (error) {
        setVoiceError(errorText(error));
        inputRef.current?.focus();
      } finally {
        setVoiceState('idle');
      }
      return;
    }

    try {
      if (!isModelReady()) {
        setVoiceState('loading');
        await loadModel((progress) => setLoadProgress(progress));
      }
      await startRecording();
      setVoiceState('recording');
    } catch (error) {
      setVoiceError(errorText(error));
      inputRef.current?.focus();
      setVoiceState('idle');
    }
  };

  const handleParse = (sampleText?: string, forceDemo = false) => {
    setParseError('');
    const text = (sampleText ?? transcript).trim();
    if (!text) {
      setParseError('Type or choose a sentence before parsing.');
      inputRef.current?.focus();
      return;
    }

    try {
      const result: ParseResult = parseTranscript(text);
      router.push({
        pathname: '/confirm',
        params: {
          result: JSON.stringify(result),
          demoMode: demoMode || forceDemo ? 'true' : 'false',
        },
      });
    } catch (error) {
      setParseError(errorText(error));
    }
  };

  const handleSamplePress = async (sample: string) => {
    setTranscript(sample);
    setParseError('');
    try {
      await setDemoMode(db, true);
      setDemoModeState(true);
      handleParse(sample, true);
    } catch (error) {
      setParseError(`Could not enable demo mode: ${errorText(error)}`);
    }
  };

  const voiceButtonLabel =
    voiceState === 'recording'
      ? 'Stop voice'
      : voiceState === 'loading'
        ? 'Preparing voice...'
        : voiceState === 'transcribing'
          ? 'Transcribing...'
          : 'Voice (beta)';

  const loadMessage =
    loadProgress?.stage === 'downloading'
      ? loadProgress.progress !== undefined
        ? `Downloading voice model: ${Math.round(loadProgress.progress)}%`
        : 'Downloading voice model...'
      : loadProgress?.stage === 'loading'
        ? 'Loading voice model...'
        : '';

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.profitCard, { backgroundColor: colors.surface }]}>
        {demoMode && (
          <Text style={[styles.demoBadge, { color: colors.accent }]}>
            DEMO MODE — SAMPLE DATA ONLY
          </Text>
        )}
        <Text style={[styles.eyebrow, { color: colors.secondaryText }]}>
          TODAY'S PROFIT
        </Text>
        <Text style={[styles.profit, { color: colors.accent }]}>
          ₦{todayProfit.toLocaleString('en-NG')}
        </Text>
        {!!profitError && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            Could not load today's profit: {profitError}
          </Text>
        )}
      </View>

      <Text style={[styles.title, { color: colors.text }]}>
        Record a sale or expense
      </Text>
      <Text style={[styles.body, { color: colors.secondaryText }]}>
        Type what happened, or choose a sample sentence.
      </Text>

      <TextInput
        ref={inputRef}
        value={transcript}
        onChangeText={setTranscript}
        multiline
        textAlignVertical="top"
        placeholder="Example: sold 3 bags of rice at 40k each"
        placeholderTextColor={colors.secondaryText}
        accessibilityLabel="Type a sale or expense"
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.text,
          },
        ]}
      />

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={handleParse}
          style={({ pressed }) => [
            styles.parseButton,
            { backgroundColor: colors.button, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={styles.primaryButtonText}>Parse</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={voiceState === 'loading' || voiceState === 'transcribing'}
          onPress={handleVoicePress}
          style={({ pressed }) => [
            styles.voiceButton,
            {
              borderColor: colors.border,
              opacity:
                voiceState === 'loading' || voiceState === 'transcribing'
                  ? 0.6
                  : pressed
                    ? 0.75
                    : 1,
            },
          ]}
        >
          <Text style={[styles.voiceButtonText, { color: colors.text }]}>
            {voiceButtonLabel}
          </Text>
        </Pressable>
      </View>

      {!!loadMessage && (
        <Text style={[styles.body, { color: colors.secondaryText }]}>
          {loadMessage}
        </Text>
      )}
      {!!voiceError && (
        <Text style={[styles.errorText, { color: colors.error }]}>
          {voiceError}
          {!voiceError.includes('You can type your sales instead') &&
            ' You can type your sales instead'}
        </Text>
      )}
      {!!parseError && (
        <Text style={[styles.errorText, { color: colors.error }]}>
          {parseError}
        </Text>
      )}

      <Text style={[styles.note, { color: colors.secondaryText }]}>
        Voice is beta. First use downloads about 75 MB once; after that it works
        offline. It may be slow (about 11 seconds) or inaccurate. Typed input
        is always available.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Try a sample
      </Text>
      <View style={styles.samples}>
        {DEMO_SAMPLES.map((sample) => (
          <Pressable
            key={sample}
            accessibilityRole="button"
            onPress={() => void handleSamplePress(sample)}
            style={({ pressed }) => [
              styles.sample,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text style={[styles.sampleText, { color: colors.text }]}>
              {sample}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 28,
    paddingBottom: 40,
    gap: 16,
  },
  profitCard: {
    padding: 18,
    borderRadius: 14,
    gap: 4,
  },
  demoBadge: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
  profit: {
    fontSize: 32,
    fontWeight: '800',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  input: {
    minHeight: 170,
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    lineHeight: 25,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  parseButton: {
    minHeight: 58,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  voiceButton: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 10,
    justifyContent: 'center',
  },
  voiceButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  note: {
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  samples: {
    gap: 10,
  },
  sample: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  sampleText: {
    fontSize: 15,
    lineHeight: 21,
  },
});
