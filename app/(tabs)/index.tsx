import { useEffect, useRef, useState } from 'react';
import {
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import { initWhisper } from 'whisper.rn';
import LiveAudioStream from '@fugood/react-native-audio-pcm-stream';
import { useColorScheme } from '@/components/useColorScheme';

const MODEL_NAME = 'ggml-tiny.en.bin';
const MODEL_URL = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODEL_NAME}`;
const MAX_SECONDS = 15;
const SAMPLE_RATE = 16000;
const PROMPT =
  'Nigerian market trader recording sales and expenses in naira. Words: sold, paid, bought, bag, carton, piece, thousand, k, indomie, rice, transport.';

type SpeechStep =
  | 'idle'
  | 'downloading'
  | 'loading model'
  | 'model ready'
  | 'recording'
  | 'transcribing'
  | 'done'
  | 'error';

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)) as unknown as number[]
    );
  }
  return btoa(bin);
}

function pcmToWavDataUri(pcm: Uint8Array): string {
  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, 36 + pcm.length, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, SAMPLE_RATE, true);
  v.setUint32(28, SAMPLE_RATE * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, pcm.length, true);
  const wav = new Uint8Array(44 + pcm.length);
  wav.set(new Uint8Array(header), 0);
  wav.set(pcm, 44);
  return 'data:audio/wav;base64,' + bytesToBase64(wav);
}

export default function SpeechTestScreen() {
  const isDark = useColorScheme() === 'dark';
  const colors = isDark
    ? {
        background: '#121212',
        surface: '#1e1e1e',
        text: '#f5f5f5',
        secondaryText: '#c4c7c5',
        border: '#8a8a8a',
        error: '#ff8a80',
      }
    : {
        background: '#ffffff',
        surface: '#f7f7f7',
        text: '#111111',
        secondaryText: '#555555',
        border: '#767676',
        error: '#b3261e',
      };
  const ctxRef = useRef<any>(null);
  const chunksRef = useRef<Uint8Array[]>([]);
  const recordingRef = useRef(false);
  const streamReadyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [status, setStatus] = useState<SpeechStep>('idle');
  const [modelReady, setModelReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [loadMs, setLoadMs] = useState<number | null>(null);
  const [transcribeMs, setTranscribeMs] = useState<number | null>(null);
  const [audioChunkCount, setAudioChunkCount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('[SpeechTest] idle');
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      try {
        ctxRef.current?.release?.();
      } catch {}
    };
  }, []);

  const setStep = (step: SpeechStep, detail?: string) => {
    setStatus(step);
    console.log(`[SpeechTest] ${step}${detail ? `: ${detail}` : ''}`);
  };

  const fail = (where: string, e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    setError(`${where}: ${msg}`);
    setStep('error', `${where}: ${msg}`);
  };

  const loadModel = async () => {
    setError('');
    setBusy(true);
    console.log('[SpeechTest] model load requested');
    try {
      const modelFile = new File(Paths.document, MODEL_NAME);
      if (!modelFile.exists) {
        setStep('downloading');
        await File.downloadFileAsync(MODEL_URL, new Directory(Paths.document));
      }
      setStep('loading model');
      const t0 = Date.now();
      ctxRef.current = await initWhisper({ filePath: modelFile.uri });
      const elapsed = Date.now() - t0;
      setLoadMs(elapsed);
      console.log(`[SpeechTest] model load time: ${elapsed} ms`);
      setModelReady(true);
      setStep('model ready');
    } catch (e) {
      fail('Model', e);
    } finally {
      setBusy(false);
    }
  };

  const ensureMic = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    const res = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
    );
    return res === PermissionsAndroid.RESULTS.GRANTED;
  };

  const startRecording = async () => {
    setError('');
    setTranscript('');
    setTranscribeMs(null);
    setAudioChunkCount(0);
    try {
      if (!(await ensureMic())) {
        const message =
          'Microphone permission was denied. Turn it on in Settings > Apps.';
        setError(message);
        setStep('error', message);
        return;
      }
      if (!streamReadyRef.current) {
        LiveAudioStream.init({
          sampleRate: SAMPLE_RATE,
          channels: 1,
          bitsPerSample: 16,
          audioSource: 6,
          bufferSize: 4096,
          wavFile: '',
        });
        LiveAudioStream.on('data', (b64: string) => {
          if (recordingRef.current) {
            chunksRef.current.push(base64ToBytes(b64));
            setAudioChunkCount(chunksRef.current.length);
          }
        });
        streamReadyRef.current = true;
      }
      chunksRef.current = [];
      recordingRef.current = true;
      LiveAudioStream.start();
      setRecording(true);
      setStep('recording');
      timerRef.current = setTimeout(() => {
        stopRecording();
      }, MAX_SECONDS * 1000);
    } catch (e) {
      recordingRef.current = false;
      setRecording(false);
      fail('Recording', e);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    recordingRef.current = false;
    setRecording(false);
    try {
      await LiveAudioStream.stop();
    } catch (e) {
      fail('Stop', e);
      return;
    }

    const total = chunksRef.current.reduce((n, c) => n + c.length, 0);
    if (total < SAMPLE_RATE * 2 * 0.5) {
      const message =
        'Recording was too short. Try again and speak for a few seconds.';
      setError(message);
      setStep('error', message);
      return;
    }
    const pcm = new Uint8Array(total);
    let offset = 0;
    for (const c of chunksRef.current) {
      pcm.set(c, offset);
      offset += c.length;
    }

    setStep('transcribing', `${chunksRef.current.length} audio chunks`);
    setBusy(true);
    try {
      const t0 = Date.now();
      const { promise } = ctxRef.current.transcribe(pcmToWavDataUri(pcm), {
        language: 'en',
        prompt: PROMPT,
      });
      const { result } = await promise;
      const elapsed = Date.now() - t0;
      const text = (result ?? '').trim() || '(nothing recognized)';
      setTranscribeMs(elapsed);
      setTranscript(text);
      console.log(`[SpeechTest] transcribe time: ${elapsed} ms`);
      console.log(`[SpeechTest] transcript: ${text}`);
      setStep('done');
    } catch (e) {
      fail('Transcribe', e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        Speech test (Whisper tiny.en)
      </Text>
      <Text style={[styles.status, { color: colors.text }]}>Status: {status}</Text>

      {!modelReady && (
        <Pressable
          style={[styles.btn, busy && styles.disabled]}
          disabled={busy}
          onPress={loadModel}
        >
          <Text style={styles.btnText}>1. Load model</Text>
        </Pressable>
      )}

      {modelReady && !recording && (
        <Pressable
          style={[styles.btn, busy && styles.disabled]}
          disabled={busy}
          onPress={startRecording}
        >
          <Text style={styles.btnText}>Record</Text>
        </Pressable>
      )}

      {recording && (
        <Pressable style={[styles.btn, styles.stop]} onPress={stopRecording}>
          <Text style={styles.btnText}>Stop</Text>
        </Pressable>
      )}

      <View
        style={[
          styles.box,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.label, { color: colors.secondaryText }]}>Transcript</Text>
        <Text style={[styles.transcript, { color: colors.text }]}>
          {transcript || '-'}
        </Text>
      </View>

      <View
        style={[
          styles.box,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.label, { color: colors.secondaryText }]}>Model load time</Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {loadMs !== null ? `${loadMs} ms` : '-'}
        </Text>
        <Text style={[styles.label, { color: colors.secondaryText }]}>
          Audio chunks collected
        </Text>
        <Text style={[styles.value, { color: colors.text }]}>{audioChunkCount}</Text>
        <Text style={[styles.label, { color: colors.secondaryText }]}>
          Transcribe time
        </Text>
        <Text style={[styles.value, { color: colors.text }]}>
          {transcribeMs !== null ? `${transcribeMs} ms` : '-'}
        </Text>
      </View>

      {!!error && (
        <View
          style={[
            styles.box,
            {
              backgroundColor: colors.surface,
              borderColor: colors.error,
            },
          ]}
        >
          <Text style={[styles.label, { color: colors.secondaryText }]}>Error</Text>
          <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 60, gap: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  status: { fontSize: 16 },
  btn: {
    backgroundColor: '#1b7f3b',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 64,
  },
  stop: { backgroundColor: '#b3261e' },
  disabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  box: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 4 },
  label: { fontSize: 13 },
  transcript: { fontSize: 28, fontWeight: '600' },
  value: { fontSize: 20, fontWeight: '600' },
  error: { fontSize: 16 },
});