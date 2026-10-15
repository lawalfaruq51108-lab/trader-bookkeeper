---
doc: spec
status: draft
---

# Trader Bookkeeper — Technical Spec

## How This Works, In Plain Language
Trader Bookkeeper is a small local mobile app that helps a trader record market transactions without needing a network connection or accounting knowledge. The user speaks or types what happened, the app turns that text into structured entries, and the user reviews the result before saving it. The app keeps all data on the phone and calculates totals in code so the numbers are consistent and auditable.

The app has three key parts: input, parsing, and review. Input can be voice or text. Parsing turns messy real-world phrases into structured sale or expense records. Review lets the user edit anything that was uncertain before saving. Once entries are saved, the app aggregates them into a daily summary and later a monthly report.

This structure is intentionally small and lightweight so it runs well on a low-end Android phone and remains useful even without a working microphone.

## The Core Journey Through the System
1. The user opens the Record screen and either speaks or types an entry.
2. The text is normalized and split into clauses by the parser.
3. The parser extracts sale or expense intent, quantities, units, amounts, and item names.
4. Parsed entries are shown on the Confirm screen as editable cards.
5. The user removes bad entries, fixes unclear data, and saves only what is correct.
6. The app writes the confirmed entries to SQLite.
7. The daily totals are recalculated from the saved entries.
8. The user opens the History or Report screen to review past totals and generate the monthly summary.
9. The report is built from aggregated data and can be exported or shared.

PRD ref: `prd.md > The Core Journey`

## Stack
- Language: TypeScript
- Framework: React Native + Expo
- Navigation: Expo Router
- Local storage: `expo-sqlite`
- Speech input: `whisper.rn` with a small GGML model (`tiny` or `base`), selected after testing on the Infinix Smart 7
- Speech output: `expo-speech` only if time permits after the core flow is stable
- PDF/report export: `expo-print` and `expo-sharing`
- Testing: Jest
- Device requirement: Expo development build required; EAS Build is part of the plan

Rationale:
- Expo + React Native matches the requirement for a mobile app that runs offline and is lightweight enough for low-end Android.
- `expo-sqlite` is the simplest local storage approach for confirmed records and monthly aggregation.
- `whisper.rn` is the required primary speech path. The exact GGML model will be chosen after testing for size and runtime on the target phone.
- Typed input remains the guaranteed fallback whenever speech is unavailable or fails.
- Vosk is a backup path only if Whisper fails on the actual device; it is not the primary plan.
- Jest is sufficient for parser and aggregation logic without adding heavy tooling.

## Where It Runs and How Someone Tries It
This app runs locally on Android through an Expo development build. The native speech model and packaging require an EAS Build dev client; the app is not assumed to work in Expo Go.

Build requirement:
- Required: Expo development build via EAS Build
- Reason: `whisper.rn` and the bundled model need native support and device testing on the Infinix Smart 7

The main run flow:
- install dependencies
- build the app with EAS Build for the Android device
- install the dev build on the target phone
- open the app in airplane mode
- use the Record screen to speak or type a sample phrase such as `sold 3 bags of rice at 40k each` or `paid transport 5k`
- review on the Confirm screen
- save the entries and open the Today or Report screens

The demo flow should also work with sample data in demo mode, so the app can be shown without a microphone or live sales records.

## Look and Feel
The UI should be practical, readable, and confidence-building. The visual system should use large tap targets, strong contrast, clear status states, and minimal distraction. A trader should be able to process the app quickly while handling real-world work, not negotiate a complicated layout.

Colors and typography should feel stable and familiar rather than playful. The app should read like a reliable tool, not a consumer entertainment app. It should support both speech-first and typed-input fallback paths without forcing the user to think about technical details.

## Components

### Record Screen
Handles input capture via microphone or text, supports demo sample sentences, and passes the transcript to the parser.
PRD ref: `prd.md > Entry Recording`

### Confirm Screen
Displays parsed entries as editable cards, highlights missing or low-confidence values, and enforces save-after-confirmation behavior.
PRD ref: `prd.md > Confirmation Before Save`

### Today Screen
Shows the selected day’s totals, expenses, sales, and profit, and offers entry editing and deletion.
PRD ref: `prd.md > Daily Ledger`

### History Screen
Lists previous days and opens a day detail for review.
PRD ref: `prd.md > History and Reporting`

### Report Screen
Generates a report for a selected month and includes totals, daily chart, top items, and expense summary.
PRD ref: `prd.md > History and Reporting`

### Settings Screen
Stores trader name, business name, trader type, speech preference, and the demo mode toggle.
PRD ref: `prd.md > Demo Mode`

### Speech Input Adapter Layer
Encapsulates the on-device speech path so the rest of the app is unaware of whether the user is using Whisper or falling back to typed input. The primary path is `whisper.rn` with a small GGML model bundle; Vosk is a backup only if the Whisper path fails on the target phone.
PRD ref: `prd.md > AI Requirements`

## Data Model
The storage model is deliberately simple and local.

- `entries` table: each transaction record stores date, type, item, quantity, unit, unit price, total, raw text, and created timestamp.
- `profile` table: trader name, business name, trader type, language, and currency settings.

Money is stored as integers, using minor units or whole naira values depending on the chosen reporting convention. The architecture requires that totals are always calculated in code and never derived by AI or by user-entered floating-point data.

## File Structure
```text
trader-bookkeeper/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx
│   │   ├── today.tsx
│   │   ├── history.tsx
│   │   ├── report.tsx
│   │   └── settings.tsx
│   ├── confirm.tsx
│   └── _layout.tsx
├── src/
│   ├── parser/
│   │   ├── index.ts
│   │   ├── numbers.ts
│   │   ├── keywords.ts
│   │   ├── split.ts
│   │   └── __tests__/
│   ├── db/
│   │   ├── client.ts
│   │   ├── schema.ts
│   │   ├── entries.ts
│   │   └── profile.ts
│   ├── domain/
│   │   ├── types.ts
│   │   ├── aggregate.ts
│   │   └── money.ts
│   ├── speech/
│   │   ├── input.ts
│   │   └── output.ts
│   ├── report/
│   │   ├── template.ts
│   │   └── generate.ts
│   ├── demo/
│   │   └── samples.ts
│   ├── components/
│   ├── theme/
│   └── app.tsx
├── docs/
│   ├── seed/
│   │   ├── PRD-seed.md
│   │   └── ARCHITECTURE.md
│   └── speech-spike.md
├── scope.md
├── prd.md
├── spec.md
├── ARCHITECTURE.md
├── README.md
├── LICENSE
└── package.json
```

## External Services and Dependencies
- Expo CLI / Metro for local development
- SQLite local database runtime
- Speech recognizer library chosen after feasibility check
- Expo speech engine for the spoken summary
- PDF export libraries for share/export flow
- Any optional on-device model if used as a stretch feature

Documentation links should be recorded as the actual libraries are chosen. No paid APIs or cloud dependencies are required for the MVP.

## Important Failure Modes
- **Speech fails or is not available** → the app falls back to typed input and clearly explains the issue.
- **Parser misreads a phrase** → the user sees the parsed entry on the confirm screen and can fix it before saving.
- **A transaction is incomplete** → the entry is flagged and cannot be saved without a valid total.
- **A low-end device struggles with a heavy speech option** → the app falls back to the built-in recognizer or typed mode and keeps the core flow working.

## What Was Simplified and Why
- The app does not include a full accounting or tax model — it focuses on practical trader recording and monthly summaries instead.
- The report is a one-page summary rather than a full accounting package — enough to support a lender discussion without bloating the MVP.
- Demo mode is a deliberate simplification to make the app testable and presentable without relying on real market conditions or a microphone.

## Gate Plan

### Gate 0 — speech test
Target date: Oct 15
Goal: prove the speech path works on the Infinix Smart 7 or select the fallback path.
Required evidence:
- `whisper.rn` loads on-device or an alternative is chosen intentionally
- the app can record a short phrase in airplane mode
- the speech output is reliable enough to support the required phrases
- if Whisper fails on the device, Vosk may be tested as a backup only

### Gate 1 — speak or type to saved entry
Target date: Oct 17
Goal: prove the pipeline from input to saved ledger entry works end to end.
Required evidence:
- the user can record a sale or expense by voice or text
- the parser creates a structured entry
- the Confirm screen allows edits and deletes
- the app saves only approved entries
- the Today totals update from stored data

### Gate 2 — full flow in airplane mode
Target date: Oct 20
Goal: prove the core MVP works offline and without external services.
Required evidence:
- full voice or typed flow works in airplane mode
- parser tolerates common speech errors
- confirm screen and save flow work
- report can be generated from stored data
- demo mode works without a microphone

### Freeze
Target date: Oct 21
Goal: lock scope and stop feature growth.
Required rule:
- no new features beyond the approved proof-of-concept boundary after this gate
- only bug fixes, correctness fixes, and critical reliability work are allowed

## Build Order for a Team of 1
This ordering assumes one developer working through the proof of concept in a disciplined sequence with the required gates.

### 1. Speech and parser foundation
- set up the Expo project and native dev build
- test `whisper.rn` on the Infinix Smart 7
- choose `tiny` or `base` based on runtime and bundle size
- implement the parser and number normalization logic
- create Jest tests for speech-recognition errors, missing punctuation, and malformed phrases

### 2. Entry capture and Confirm flow
- build the Record screen with text input and mic trigger
- send transcript to the parser
- display parsed entries on the Confirm screen
- allow editing, deleting, and save-only-after-confirmation behavior
- enforce a valid total before save

### 3. Local ledger and totals
- create the SQLite schema and CRUD operations
- save confirmed entries locally
- calculate Today totals from stored data
- allow editing and deleting saved entries without breaking the ledger logic

### 4. Demo mode and report path
- add demo sample entries and sample month data
- support demo mode without a microphone
- build the monthly report screen
- generate PDF output and share via the device share sheet

### 5. Final reliability and gate verification
- test the full flow in airplane mode
- verify parser tolerance and error handling
- complete the gate checks and fix only critical issues
- freeze scope on Oct 21 and finalize the demo path

## Decisions and Open Issues
- Speech recognition uses `whisper.rn` with a small GGML model chosen after testing on the Infinix Smart 7. The model should be `tiny` or `base`, depending on runtime and bundle size.
- The app is bundled with the speech model if size allows; otherwise the size limitation must be documented before the build is finalized.
- The app requires an Expo development build via EAS Build because native speech support is not assumed to work in Expo Go.
- The parser is plain TypeScript and must have Jest coverage for common speech-recognition errors and malformed input.
- The project remains intentionally narrow so one person can finish the proof of concept before the hard freeze.
- The default trade type and a final report-format decision should still be confirmed before demo scripting.
