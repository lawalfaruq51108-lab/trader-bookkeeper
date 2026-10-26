# Trader Bookkeeper

An offline-first bookkeeping app for informal traders. Type sales and expenses
as the main input, or try optional on-device voice transcription. Review every
parsed entry before saving it to the local ledger.

> Built for the Build With AI Hackathon using the Devpost Learn Skill Pack and
> GitHub Copilot.

## Features

- Record sales and expenses by typing; voice input is optional and labeled beta.
- Rule-based English and Pidgin transcript parser, including number and naira
  amount handling.
- Confirm screen to review, edit, and delete parsed entries before saving.
- Today's sales, expenses, profit, and editable ledger entries.
- Monthly report preview and one-page PDF sharing, including totals, active
  days, average daily sales, and top items and expenses.
- Trader profile with trader name, business name, and trader type; profile
  details appear in reports.
- Demo mode with sample inputs and a generated sample month. Demo entries are
  kept in a separate database from real entries.
- Local SQLite storage. No account or API key is required.

## Android APK

**Release download:** `<APK_RELEASE_LINK_NOT_PUBLISHED_YET>`

The EAS `preview` profile is configured for an internally distributed Android
APK. To build it from a configured EAS project:

```bash
eas build --platform android --profile preview
```

Install the APK on the Android device after the build completes. The Whisper
model is not included in the APK: voice downloads it on first use, so that
initial use needs internet access.

## Run from source

Requirements: Node.js, npm, and an Android device or emulator. The voice
recorder and Whisper integration use native modules; Expo Go is not sufficient.
Install and launch an installed development client:

```bash
npm install
npx expo start --dev-client
```

If a development client has not yet been built and installed for the target
device, create one with EAS first:

```bash
eas build --platform android --profile development
```

The npm scripts declared in `package.json` are:

| Command | Script |
|---|---|
| `npm start` | `expo start` |
| `npm run android` | `expo start --android` |
| `npm run ios` | `expo start --ios` |
| `npm run web` | `expo start --web` |
| `npm test` | `jest` |

The native speech workflow is intended for an installed development client on
Android, not Expo Go.

## Tests

Run the Jest suites with:

```bash
npm test -- --runInBand
```

Verified for this README update: **2 suites passed, 49 tests passed** (parser and
aggregation tests).

## Try the app without a microphone

1. Open **Settings** and enable **Demo mode**, or load a sample month there.
2. On **Record**, tap a sample sentence or type your own.
3. Review and edit the parsed entries on **Confirm**, then choose **Save All**.
4. View today's ledger in **Today**, or open **Report** to preview and share a
   monthly PDF.

Demo records are stored separately and labeled as demo data. Turning demo mode
off returns screens to the real ledger.

## Voice and AI

- Speech recognition runs on-device through `whisper.rn` using the Whisper
  `tiny.en` model (`ggml-tiny.en.bin`).
- The model is downloaded once on first voice use (about **75 MB**), rather than
  bundled in the app. After it has downloaded, transcription works offline.
- Voice is a beta feature. In the Infinix Smart 7 test, model loading took
  **1,020 ms** and transcribing one short sentence took **11,025 ms**.
- Accuracy on that test was poor: the spoken phrase “sold 3 bags of rice at 40k
  each” was transcribed as “So do the bugs of rice as for the key each.” Numbers,
  accents, and Pidgin may be misrecognized. **Typed input is the main path**;
  always check voice transcripts and confirm entries before saving.
- Parsing and all money calculations are performed by app code. The app does
  not send speech or bookkeeping data to an AI service.

## Project disclosure

- The project was developed with GitHub Copilot in VS Code and the Devpost Learn
  Skill Pack.
- Runtime speech recognition uses the downloaded Whisper model locally.
- Third-party library names, resolved versions, and license identifiers below
  are taken from `package.json` and `package-lock.json`. Transitive dependencies
  are not enumerated here.
- The Whisper source project is MIT-licensed. The license for the exact
  converted `ggml-tiny.en.bin` artifact served by the configured model host was
  **not independently verified**; confirm its upstream terms before
  redistributing that model file.
- Whether any retained starter-template code needs a separate disclosure is
  **unconfirmed**; verify the project history before publication.

## Direct dependencies and licenses

Versions below are the lockfile-resolved versions. Development-only packages
are marked **dev**.

| Package | Version | License |
|---|---:|---|
| `@fugood/react-native-audio-pcm-stream` | 1.1.4 | MIT |
| `@types/jest` (dev) | 29.5.14 | MIT |
| `@types/react` (dev) | 19.2.18 | MIT |
| `buffer` | 6.0.3 | MIT |
| `expo` | 57.0.30 | MIT |
| `expo-audio` | 57.0.5 | MIT |
| `expo-constants` | 57.0.22 | MIT |
| `expo-dev-client` | 57.0.20 | MIT |
| `expo-file-system` | 57.0.7 | MIT |
| `expo-font` | 57.0.4 | MIT |
| `expo-linking` | 57.0.13 | MIT |
| `expo-print` | 57.0.2 | MIT |
| `expo-router` | 57.0.28 | MIT |
| `expo-sharing` | 57.0.23 | MIT |
| `expo-splash-screen` | 57.0.10 | MIT |
| `expo-sqlite` | 57.0.4 | MIT |
| `expo-status-bar` | 57.0.1 | MIT |
| `expo-symbols` | 57.0.3 | MIT |
| `expo-web-browser` | 57.0.3 | MIT |
| `jest` (dev) | 29.7.0 | MIT |
| `jest-expo` (dev) | 57.0.6 | MIT |
| `react` | 19.2.3 | MIT |
| `react-dom` | 19.2.3 | MIT |
| `react-native` | 0.86.3 | MIT |
| `react-native-reanimated` | 4.5.1 | MIT |
| `react-native-safe-area-context` | 5.7.0 | MIT |
| `react-native-screens` | 4.26.2 | MIT |
| `react-native-web` | 0.21.4 | MIT |
| `react-native-worklets` | 0.10.1 | MIT |
| `whisper.rn` | 0.7.4 | MIT |
| `typescript` (dev) | 6.0.3 | Apache-2.0 |

The separately downloaded model is **not a package.json dependency**:
`ggml-tiny.en.bin` (Whisper tiny.en; exact converted-artifact license
verification noted above).

## Known limitations

- Voice recognition can be slow and inaccurate, particularly for numbers,
  accents, and Pidgin. Typed entry is available as the primary alternative.
- The initial model download needs internet access; subsequent voice
  transcription is on-device.
- Reports are based on the trader's self-recorded entries and are not
  independently audited or a guarantee of loan eligibility.

## Team

- Solo developer: project owner.

## License

The project is released under the MIT License; see [LICENSE](./LICENSE).
Third-party packages and the downloaded model have their own terms, listed or
qualified above.
