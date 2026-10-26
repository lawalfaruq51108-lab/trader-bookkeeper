import { Directory, File, Paths } from 'expo-file-system';
import { PermissionsAndroid, Platform } from 'react-native';
import LiveAudioStream from '@fugood/react-native-audio-pcm-stream';
import { initWhisper, type WhisperContext } from 'whisper.rn';

const MODEL_NAME = 'ggml-tiny.en.bin';
const MODEL_URL = `https://huggingface.co/ggerganov/whisper.cpp/resolve/main/${MODEL_NAME}`;
const MAX_SECONDS = 15;
const SAMPLE_RATE = 16000;
const BYTES_PER_SAMPLE = 2;
const MAX_AUDIO_BYTES = SAMPLE_RATE * BYTES_PER_SAMPLE * MAX_SECONDS;
const MIN_AUDIO_BYTES = SAMPLE_RATE * BYTES_PER_SAMPLE * 0.5;
const MIN_MODEL_BYTES = 1024 * 1024;
const PROMPT =
  'Nigerian market trader recording sales and expenses in naira. Words: sold, paid, bought, bag, carton, piece, thousand, k, indomie, rice, transport.';

export type SpeechLoadProgress = {
  stage: 'downloading' | 'loading';
  progress?: number;
  bytesDownloaded?: number;
  totalBytes?: number;
};

export interface SpeechInput {
  loadModel(onProgress?: (progress: SpeechLoadProgress) => void): Promise<void>;
  isModelReady(): boolean;
  startRecording(): Promise<void>;
  stopAndTranscribe(): Promise<string>;
  release(): Promise<void>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isOutOfMemory(error: unknown): boolean {
  return /out of memory|enomem|not enough memory|failed to allocate|memory allocation|cannot allocate/i.test(
    errorMessage(error)
  );
}

function isPermissionError(error: unknown): boolean {
  return /permission|not authorized|denied|record_audio/i.test(
    errorMessage(error)
  );
}

function toUserError(error: unknown, fallback: string): Error {
  if (isOutOfMemory(error)) {
    return new Error(
      'Not enough memory for voice transcription. Close other apps or use typed input.'
    );
  }
  return new Error(`${fallback}: ${errorMessage(error)}`);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(
      ...Array.from(bytes.subarray(index, index + chunkSize))
    );
  }
  return btoa(binary);
}

function pcmToWavDataUri(pcm: Uint8Array): string {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * BYTES_PER_SAMPLE, true);
  view.setUint16(32, BYTES_PER_SAMPLE, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, pcm.length, true);

  const wav = new Uint8Array(44 + pcm.length);
  wav.set(new Uint8Array(header));
  wav.set(pcm, 44);
  return `data:audio/wav;base64,${bytesToBase64(wav)}`;
}

class WhisperSpeechInput implements SpeechInput {
  private context: WhisperContext | null = null;
  private loading: Promise<void> | null = null;
  private streamInitialized = false;
  private recording = false;
  private chunks: Uint8Array[] = [];
  private audioBytes = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private stopTask: Promise<void> | null = null;

  async loadModel(onProgress?: (progress: SpeechLoadProgress) => void) {
    if (this.context) return;
    if (this.loading) return this.loading;

    this.loading = this.loadModelOnce(onProgress).finally(() => {
      this.loading = null;
    });
    return this.loading;
  }

  isModelReady(): boolean {
    return this.context !== null;
  }

  async startRecording(): Promise<void> {
    if (!this.context) {
      throw new Error('Voice model is not loaded. Load it before recording.');
    }
    if (this.recording) {
      throw new Error('A voice recording is already in progress.');
    }

    await this.requestMicrophonePermission();
    this.chunks = [];
    this.audioBytes = 0;
    this.stopTask = null;

    try {
      if (!this.streamInitialized) {
        LiveAudioStream.init({
          sampleRate: SAMPLE_RATE,
          channels: 1,
          bitsPerSample: 16,
          audioSource: 6,
          bufferSize: 4096,
          wavFile: '',
        });
        LiveAudioStream.on('data', (base64: string) => {
          if (!this.recording || this.audioBytes >= MAX_AUDIO_BYTES) return;
          const received = base64ToBytes(base64);
          const remainingBytes = MAX_AUDIO_BYTES - this.audioBytes;
          const chunk =
            received.length > remainingBytes
              ? received.subarray(0, remainingBytes)
              : received;
          if (chunk.length > 0) {
            this.chunks.push(chunk);
            this.audioBytes += chunk.length;
          }
        });
        this.streamInitialized = true;
      }

      this.recording = true;
      LiveAudioStream.start();
      this.timer = setTimeout(() => {
        void this.stopCapture().catch(() => undefined);
      }, MAX_SECONDS * 1000);
    } catch (error) {
      this.recording = false;
      this.clearTimer();
      if (isPermissionError(error)) {
        throw new Error(
          'Microphone permission denied. You can type your sales instead.'
        );
      }
      throw toUserError(error, 'Could not start recording');
    }
  }

  async stopAndTranscribe(): Promise<string> {
    if (!this.context) {
      throw new Error('Voice model is not loaded. Load it before recording.');
    }
    if (!this.recording && !this.stopTask) {
      throw new Error('There is no voice recording to transcribe.');
    }

    try {
      await this.stopCapture();
    } catch (error) {
      throw toUserError(error, 'Could not stop recording');
    }

    if (this.audioBytes < MIN_AUDIO_BYTES) {
      this.clearAudio();
      throw new Error(
        'Recording too short. Speak for at least half a second and try again.'
      );
    }

    try {
      const pcm = new Uint8Array(this.audioBytes);
      let offset = 0;
      for (const chunk of this.chunks) {
        pcm.set(chunk, offset);
        offset += chunk.length;
      }
      this.clearAudio();

      const { promise } = this.context.transcribe(pcmToWavDataUri(pcm), {
        language: 'en',
        prompt: PROMPT,
        maxThreads: 2,
      });
      const { result } = await promise;
      const transcript = (result ?? '').trim();
      if (!transcript) {
        throw new Error('No speech detected. Try again or type your sales.');
      }
      return transcript;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.startsWith('No speech detected.')
      ) {
        throw error;
      }
      throw toUserError(error, 'Could not transcribe the recording');
    }
  }

  async release(): Promise<void> {
    this.clearTimer();
    if (this.loading) await this.loading;
    if (this.recording) {
      try {
        await this.stopCapture();
      } catch (error) {
        this.clearAudio();
        throw toUserError(error, 'Could not stop recording during cleanup');
      }
    } else if (this.stopTask) {
      await this.stopTask;
    }
    this.clearAudio();

    if (this.context) {
      const context = this.context;
      this.context = null;
      try {
        await context.release();
      } catch (error) {
        throw toUserError(error, 'Could not release the voice model');
      }
    }
  }

  private async loadModelOnce(
    onProgress?: (progress: SpeechLoadProgress) => void
  ): Promise<void> {
    const modelFile = new File(Paths.document, MODEL_NAME);

    if (modelFile.exists && (modelFile.size ?? 0) < MIN_MODEL_BYTES) {
      modelFile.delete();
    }

    if (!modelFile.exists) {
      onProgress?.({ stage: 'downloading', progress: 0 });
      try {
        await File.downloadFileAsync(MODEL_URL, modelFile, {
          idempotent: true,
          onProgress: ({ bytesWritten, totalBytes }) => {
            onProgress?.({
              stage: 'downloading',
              bytesDownloaded: bytesWritten,
              totalBytes,
              progress:
                totalBytes > 0
                  ? Math.min(100, (bytesWritten / totalBytes) * 100)
                  : undefined,
            });
          },
        });
      } catch (error) {
        if (modelFile.exists) modelFile.delete();
        throw new Error(
          `Model download failed. Check your connection and try again: ${errorMessage(error)}`
        );
      }
    }

    if (!modelFile.exists || (modelFile.size ?? 0) < MIN_MODEL_BYTES) {
      throw new Error(
        'Model download failed: the downloaded model file is incomplete.'
      );
    }

    onProgress?.({ stage: 'loading' });
    try {
      this.context = await initWhisper({ filePath: modelFile.uri });
    } catch (error) {
      throw toUserError(error, 'Could not load voice model');
    }
  }

  private async requestMicrophonePermission(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        throw new Error('permission denied');
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('permission denied')
      ) {
        throw new Error(
          'Microphone permission denied. You can type your sales instead.'
        );
      }
      throw new Error(
        `Could not check microphone permission: ${errorMessage(error)}`
      );
    }
  }

  private stopCapture(): Promise<void> {
    this.clearTimer();
    if (this.stopTask) return this.stopTask;
    if (!this.recording) return Promise.resolve();

    this.recording = false;
    const stopTask = LiveAudioStream.stop().then(() => undefined);
    this.stopTask = stopTask;
    void stopTask.catch(() => {
      if (this.stopTask === stopTask) this.stopTask = null;
    });
    return this.stopTask;
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private clearAudio(): void {
    this.chunks = [];
    this.audioBytes = 0;
    this.stopTask = null;
  }
}

const adapter = new WhisperSpeechInput();

export const speechInput: SpeechInput = adapter;

export const loadModel = (onProgress?: (progress: SpeechLoadProgress) => void) =>
  adapter.loadModel(onProgress);
export const isModelReady = () => adapter.isModelReady();
export const startRecording = () => adapter.startRecording();
export const stopAndTranscribe = () => adapter.stopAndTranscribe();
export const release = () => adapter.release();
