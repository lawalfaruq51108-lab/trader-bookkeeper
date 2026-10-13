# Architecture

Technical design for **Trader Bookkeeper**, an offline, voice-first bookkeeping app for informal traders. This file is context for the team and for GitHub Copilot.

## 1. Goals That Drive the Design

1. **Fully offline.** No network call is required for any core feature.
2. **Free.** No paid API, no API key, no subscription.
3. **Runs on low-end Android** (target device: Infinix Smart 7, about 2 to 4 GB RAM).
4. **Reliable numbers.** Code calculates every total. AI or parsing only extracts values.
5. **User confirms everything.** Nothing is saved without review.
6. **Judge-friendly.** Works with no microphone and no credentials (demo mode).

## 2. System Overview

```
+-----------------+     +-----------------+     +------------------+
|  Input layer    | --> |  Parser module  | --> |  Confirm screen  |
|  voice | typed  |     |  (pure TS)      |     |  (user edits)    |
|  | demo samples |     +-----------------+     +--------+---------+
+-----------------+                                      |
                                                         v
+-----------------+     +-----------------+     +------------------+
|  Report (PDF)   | <-- |  Aggregations   | <-- |  SQLite ledger   |
|  + share        |     |  (pure TS)      |     |  (expo-sqlite)   |
+-----------------+     +-----------------+     +------------------+
        ^                        |
        |                        v
        |                +------------------+
        +--------------- |  Spoken summary  |
                         |  (expo-speech)   |
                         +------------------+
```

## 3. Technology Choices

| Concern | Choice | Notes |
|---|---|---|
| Framework | React Native + Expo, TypeScript | Use Expo Router for navigation |
| Storage | `expo-sqlite` | Single local database file |
| Speech input | Library chosen after the speech spike | Candidates: a built-in recognizer wrapper (for example `expo-speech-recognition` or `@react-native-voice/voice`) and an on-device model (for example `whisper.rn` or a Vosk wrapper) |
| Speech output | `expo-speech` | Reads summaries aloud |
| PDF | `expo-print` and `expo-sharing` | HTML template rendered to PDF on device |
| Tests | Jest | Parser and aggregation logic |
| Optional LLM | `llama.rn` with a small quantized .gguf | Stretch goal only |

> Verify each library's current docs, Expo version compatibility and whether it needs a development build (it will not run in Expo Go if it has native code). Record the final choices in `spec.md`.

## 4. Folder Structure

```
trader-bookkeeper/
  app/                         Expo Router screens
    (tabs)/
      index.tsx                Record screen
      today.tsx                Today ledger
      history.tsx              History
      report.tsx               Monthly report
      settings.tsx             Settings
    confirm.tsx                Confirm screen
    _layout.tsx
  src/
    parser/
      index.ts                 parseTranscript(text) -> ParseResult
      numbers.ts               number normalization
      keywords.ts              intent, unit and Pidgin keyword lists
      split.ts                 split text into clauses
      __tests__/               Jest tests with example sentences
    db/
      client.ts                open database, run migrations
      schema.ts                table definitions
      entries.ts               CRUD and queries
      profile.ts
    domain/
      types.ts                 shared TypeScript types
      aggregate.ts             totals, profit, top items, monthly stats
      money.ts                 integer money helpers and formatting
    speech/
      input.ts                 SpeechInput interface and adapters
      output.ts                speak summary text
    report/
      template.ts              HTML for the PDF
      generate.ts              build and share the PDF
    demo/
      samples.ts               demo sentences and a demo month of data
    components/                shared UI components
    theme/                     colors, spacing, typography
  docs/
    seed/                      seed documents for the Skill Pack
    speech-spike.md            speech test results
  scope.md  prd.md  spec.md    generated with the Devpost Learn Skill Pack
  ARCHITECTURE.md
  README.md
  LICENSE
```

## 5. Core Types

```ts
export type EntryType = 'sale' | 'expense';

export interface ParsedEntry {
  type: EntryType;
  item: string | null;          // null if not detected
  qty: number | null;
  unit: string | null;          // bag, carton, piece, bunch, ...
  unitPrice: number | null;     // minor or whole currency units, see money.ts
  total: number | null;         // null means unclear, must be fixed by the user
  rawClause: string;            // original clause text
  confidence: 'high' | 'low';   // low entries are highlighted on Confirm
  issues: string[];             // e.g. 'missing_item', 'missing_amount'
}

export interface ParseResult {
  entries: ParsedEntry[];
  unparsed: string[];           // clauses the parser could not read
}

export interface Entry {
  id: number;
  date: string;                 // ISO date YYYY-MM-DD
  type: EntryType;
  item: string;
  qty: number | null;
  unit: string | null;
  unitPrice: number | null;
  total: number;
  rawText: string;
  createdAt: string;            // ISO timestamp
}

export interface DaySummary {
  date: string;
  totalSales: number;
  totalExpenses: number;
  profit: number;
  entryCount: number;
}

export interface MonthReportData {
  month: string;                // YYYY-MM
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  activeDays: number;
  avgDailySales: number;
  topItems: { item: string; total: number }[];
  topExpenses: { item: string; total: number }[];
  daily: { date: string; sales: number; expenses: number }[];
}
```

**Money:** store whole naira as integers (no decimals needed for the MVP). Use helpers in `money.ts` for formatting (for example `₦120,000`). Never use floating point for totals.

## 6. Parser Design

**Entry point:** `parseTranscript(text: string): ParseResult`, a pure function with no side effects, fully unit tested.

### Pipeline
1. **Normalize:** lowercase, trim, collapse whitespace, remove filler words, normalize punctuation.
2. **Split into clauses:** split on `and`, `then`, commas, full stops and semicolons, but do not split inside numbers like `15,000`.
3. **Detect intent per clause:**
   - Sale keywords: `sold`, `sell`, `sell am`, `i sell`, `don sell`, `collect`, `received`, `customer pay`
   - Expense keywords: `paid`, `pay`, `bought`, `buy`, `i buy`, `spent`, `spend`, `give`, `rent`, `fuel`, `transport`, `light`, `NEPA`
   - If a clause has no verb but starts with a known expense word (for example `transport 5k`), treat it as an expense.
4. **Extract numbers** (see below).
5. **Extract quantity and unit:** number followed by a known unit, or a number word before an item.
6. **Extract item:** the remaining noun phrase after removing verbs, numbers, units, prepositions and filler.
7. **Compute missing values:**
   - `each`, `per`, `a piece` means the amount is a unit price, so `total = qty * unitPrice`
   - Otherwise the amount is the total, and `unitPrice = total / qty` only if qty is known
8. **Flag issues:** missing item, missing amount, ambiguous intent. Set `confidence: 'low'`.
9. **Never drop silently:** unreadable clauses go to `unparsed` and show on the Confirm screen as editable blank entries.

### Number normalizer (`numbers.ts`)
Must handle:
- `40k`, `40 k`, `40K`, `2.5k`, `40 thousand`, `1 million`
- `15,000`, `15000`, `₦15,000`, `N15000`, `15k naira`
- Number words: `one` to `twenty`, tens, `hundred`, `thousand` (for example `two thousand five hundred`)
- Pidgin and slang tolerance: `one k`, `half k` (500), `five hundred naira`
- Return `{ value: number, start: number, end: number }` so the item extractor can remove the matched text

### Keyword lists (`keywords.ts`)
Keep sale verbs, expense verbs, units and filler words as exported arrays so they are easy to extend and test. Include these units: bag, bags, carton, cartons, piece, pieces, bunch, tin, tins, basket, baskets, bottle, bottles, pack, packs, dozen, paint (bucket), derica, congo, kg, litre.

### Example expectations (use as tests)
| Input | Expected |
|---|---|
| `sold 3 bags of rice at 40k each` | sale, rice, qty 3, unit bag, unitPrice 40000, total 120000 |
| `I sell am 40k` | sale, item null, total 40000, issues: missing_item |
| `paid transport 5k` | expense, transport, total 5000 |
| `I don sell 2 carton indomie for 15 thousand` | sale, indomie, qty 2, unit carton, total 15000 |
| `I buy pepper 12,000` | expense, pepper, total 12000 |
| `two tomatoes 3500 each` | sale, tomatoes, qty 2, unitPrice 3500, total 7000 |
| `sold rice 40k and paid transport 5k` | two entries |
| `bla bla` | no entries, unparsed contains the text |

Write at least **30** such cases in `src/parser/__tests__/`.

## 7. Speech Layer

Define one interface so the rest of the app does not care which library is used:

```ts
export interface SpeechInput {
  isAvailable(): Promise<boolean>;
  start(onPartial: (text: string) => void): Promise<void>;
  stop(): Promise<string>;       // final transcript
}
```

- Provide adapters (for example `BuiltInRecognizer` and optionally `OnDeviceModelRecognizer`).
- The Record screen picks an adapter based on availability and the Settings choice.
- If no adapter is available or permission is denied, show a clear message and focus the text input. **Typed input is always available.**
- The speech spike result (accuracy, offline behavior, speed on the Infinix Smart 7) is written to `docs/speech-spike.md` and the choice recorded in `spec.md`.

`output.ts` exposes `speakSummary(daySummary)` which builds a short sentence ("Today you sold 120,000 naira, spent 5,000, and made 115,000 profit") and reads it with `expo-speech`.

## 8. Database

**Engine:** `expo-sqlite`. Run migrations on app start.

```sql
CREATE TABLE IF NOT EXISTS entries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  date        TEXT NOT NULL,                 -- YYYY-MM-DD
  type        TEXT NOT NULL CHECK (type IN ('sale','expense')),
  item        TEXT NOT NULL DEFAULT '',
  qty         REAL,
  unit        TEXT,
  unit_price  INTEGER,
  total       INTEGER NOT NULL,
  raw_text    TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);

CREATE TABLE IF NOT EXISTS profile (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  trader_name   TEXT,
  business_name TEXT,
  trader_type   TEXT,
  phone         TEXT,
  currency      TEXT DEFAULT '₦',
  language      TEXT DEFAULT 'en'
);
```

All queries live in `src/db/`. Screens never write SQL directly.

## 9. Aggregations

`aggregate.ts` contains pure functions that take arrays of `Entry` and return `DaySummary` and `MonthReportData`. Keeping them pure makes them easy to test and lets demo mode reuse them.

Rules:
- Profit = total sales minus total expenses
- Average daily sales = total sales divided by **active days** (days with at least one entry), not calendar days
- Top items = grouped by normalized item name, sorted by total

## 10. Report Generation

1. `aggregate.ts` builds `MonthReportData` for the chosen month.
2. `template.ts` returns an HTML string with inline CSS (one A4 page): trader and business name, month, total sales, total expenses, net profit, active days, average daily sales, top items, top expenses, a simple daily bar chart (inline SVG or CSS bars), a signature line, and the **honesty note**: "Generated from the trader's own self-recorded entries. Not independently audited."
3. `generate.ts` calls `expo-print` to produce a PDF and `expo-sharing` to share or save it.

## 11. Demo Mode

- `demo/samples.ts` exports 8 to 10 sample sentences and a generated month of realistic entries.
- Settings has a toggle to load demo data into a separate demo date range or clearly labeled demo database so real data is never mixed with sample data.
- The Record screen shows tappable sample sentences that go through the normal parser and Confirm flow.
- Judges can see the whole flow, including the report, without a microphone.

## 12. Screens and Navigation

| Screen | Purpose |
|---|---|
| Record | Mic button, text box, sample sentences, running profit for today |
| Confirm | Editable entry cards, highlighted low-confidence entries, Save All and Cancel |
| Today | Ledger for today, totals, Listen button |
| History | Days with profit, tap to view that day |
| Report | Choose month, preview, share PDF |
| Settings | Profile, language, speech engine, demo mode |

Design rules: large tap targets (at least 48 dp), high contrast, icons with labels, minimal text, works in bright sunlight, no reliance on color alone.

## 13. Optional: Local Language Model (Stretch)

Only if everything else is finished and stable:
- Run a small quantized .gguf model through a native binding only for clauses in `unparsed`.
- The model downloads on demand (never bundled in the repo or the APK), only on Wi-Fi, with a size warning.
- Prompt it to return strict JSON matching `ParsedEntry`, then validate with code. Reject anything invalid.
- Always show results on the Confirm screen.
- If the device is too slow, the feature stays off. The app must work fully without it.

## 14. Error Handling and Edge Cases

- Microphone permission denied: show an explanation and focus the text input
- Empty or unrecognized transcript: friendly message, keep the user's text for editing
- Total missing: Confirm screen requires an amount before saving
- Very large numbers: warn if an amount looks unusual (for example above 10 million)
- App killed mid-confirm: unsaved entries are discarded, saved entries are never lost
- Date handling: use the device's local date. Allow changing the date on the Confirm screen
- Storage: database writes wrapped in transactions

## 15. Performance Targets (Infinix Smart 7)

| Metric | Target |
|---|---|
| Cold start | under 4 seconds |
| Parse a typical sentence | under 50 ms |
| Save entries | under 200 ms |
| Generate monthly PDF | under 5 seconds |
| Installed APK size | as small as possible; no bundled models |

## 16. Testing Strategy

- **Unit tests (Jest):** parser (30+ cases), number normalizer, aggregations, money helpers
- **Manual device tests:** full flow in airplane mode on the Infinix Smart 7
- **Usability test:** one real trader or non-team member uses the app unassisted
- **Release test:** install the release APK on a clean phone

## 17. Security and Privacy

- All data stays on the device. There are no accounts and no network calls in core features.
- No analytics or tracking.
- Permissions requested: microphone only (and storage or sharing handled by the system share sheet).
- Reports are clearly labeled as self-reported.

## 18. Key Decisions Log

| Decision | Reason |
|---|---|
| Rule-based parser as the primary engine | Fast, predictable, offline, works on weak phones |
| Optional LLM only as a fallback | Heavy for 2 to 4 GB RAM phones; large downloads cost users data |
| Integer money, code-computed totals | Avoid floating point errors and AI arithmetic mistakes |
| Mandatory Confirm screen | Speech and parsing are imperfect |
| Typed input always available | Speech may fail on some phones, accents or offline |
| Demo mode | Judges and users can try the app without a microphone |
| Honesty label on reports | Credibility with lenders; avoids overclaiming |
