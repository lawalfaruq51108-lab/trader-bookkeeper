---
doc: prd
status: draft
---

# Trader Bookkeeper — Product Requirements

Trader Bookkeeper is an offline, voice-first bookkeeping app for an informal trader who needs to record sales and expenses quickly, confirm the app’s interpretation, and see a daily total and monthly income view without internet access, paid services, or accounting knowledge.

Source context: `scope.md` and `docs/seed/PRD-seed.md`.

## The Core Journey
1. The trader opens the app on a low-end Android phone.
2. They speak or type a short message describing one or more sales and expenses in plain language.
3. The app parses the statement into structured entries and shows them on the Confirm screen.
4. The trader reviews each item, fixes unclear values, and deletes or edits anything that is wrong.
5. The user saves only approved entries.
6. The app calculates daily totals from stored entries and shows the day summary.
7. The trader can switch to demo mode to try the app without a microphone or real data.
8. The trader can generate a month-end PDF report for review or sharing.
9. The app remains fully offline for the core journey and does not require an account or subscription.

## Screens and Layout
The MVP has a compact mobile flow:
- Record screen: one field for text input, one microphone button for speech input, and a clear way to submit the statement.
- Confirm screen: editable cards for parsed results before save.
- Today ledger: the current day’s sales, expenses, and profit.
- Demo mode: a test flow that loads sample entries and sample month data without requiring a microphone.
- Monthly report screen: preview, generate, and export a PDF report.

Optional if time allows:
- Spoken summary of the day’s totals.
- A fuller history screen that lists previous days.

## Look and Feel
The app should feel practical, trustworthy, and easy to scan under time pressure. It should use large tap targets, high contrast, clear icons, and minimal reading. The interface should support fast daily work and avoid a heavy accounting aesthetic.

## Functional Requirements

### 1. Record by speech or text
1.1 The app shall provide both a microphone trigger and a text input on the recording screen.
1.2 The user shall be able to record a sale or expense by speaking or typing, without requiring an internet connection.
1.3 If speech is unavailable, denied, or fails, the app shall keep the typed input available and clearly explain the issue.
1.4 The app shall accept short market-language phrases, including amounts such as `40k`, `15,000`, `₦15000`, and plain phrases like `I don sell` and `paid transport 5k`.

Acceptance checks:
- A user can complete the record flow using voice alone.
- A user can complete the same flow using typed text when voice is unavailable.
- A speech failure state does not block the user from recording a transaction.

### 2. Rule-based parser tolerant of speech recognition mistakes
2.1 The app shall parse recorded text into structured sale or expense entries using rule-based logic.
2.2 The parser shall tolerate speech-recognition errors, missing punctuation, and imperfect grammar.
2.3 The parser shall split multiple entries in one statement into separate records when they are expressed in one sentence.
2.4 The parser shall keep unclear or incomplete data visible and editable instead of silently dropping it.
2.5 The parser shall mark low-confidence values and missing required pieces for manual review.

Acceptance checks:
- Input like `sold 3 bags of rice at 40k each` produces a sale entry with quantity, item, and total.
- Input like `I sell am 40k` ends up as a visible editable entry with a missing item and a reviewable total.
- A garbled phrase does not crash the app; it appears as a user-editable entry.

### 3. Confirm-before-save workflow
3.1 Parsed entries shall be shown on a Confirm screen before saving.
3.2 The user shall be able to edit type, item, quantity, unit, unit price, total, and date for each parsed entry.
3.3 The user shall be able to delete any entry before saving.
3.4 Nothing shall be saved without an explicit save action from the user.
3.5 Entries that are low confidence or incomplete shall be visually highlighted.

Acceptance checks:
- The user sees the parsed entries before any save occurs.
- The user can fix an item or price before saving.
- The app blocks saving when an entry is missing a valid total.

### 4. Daily ledger and totals
4.1 The app shall store confirmed entries locally on the device.
4.2 The Today ledger shall show total sales, total expenses, and profit for the selected day.
4.3 Totals shall be calculated by code from stored entries, never manually entered.
4.4 The user shall be able to delete or edit saved entries after the initial save.

Acceptance checks:
- A saved sale and expense produce the correct daily profit.
- Correct totals update after an entry is edited or deleted.
- The app continues to function offline after a restart.

### 5. Demo mode
5.1 The app shall include a demo mode that loads sample entries and a sample month without requiring a microphone.
5.2 Demo data shall be clearly labeled and kept separate from real data.
5.3 Demo mode shall allow a tester to complete the full core journey and see the report flow.

Acceptance checks:
- A tester can open demo mode and complete the full flow without speaking.
- Demo entries are visually distinct from real entries.
- The report screen works with demo data.

### 6. Monthly PDF report
6.1 The app shall allow the user to choose a month and preview a one-page report.
6.2 The report shall include total sales, total expenses, net profit, active days, average daily sales, top items, and top expenses.
6.3 The report shall be exportable as a PDF and sharable via the phone share sheet.
6.4 The report shall be generated from stored records and calculated in code.

Acceptance checks:
- The user can choose a month and view the report without internet.
- The report totals match the stored entries for the month.
- The report can be generated as a PDF and shared via the device share sheet.

### 7. Optional if time allows
7.1 A spoken summary of the day’s totals may be added if the core flow has already been completed and verified.
7.2 A fuller history screen may be added only if the core report and ledger work are already stable.

Acceptance checks:
- The optional features are not required for the primary proof of concept.
- They are only enabled after the required core flow passes review.

## AI Requirements
- AI-1: The in-app AI is on-device speech recognition using Whisper (`whisper.rn`). This is the primary speech path.
- AI-2: Typed input is always available as the fallback path whenever speech is unavailable, denied, or fails.
- AI-3: Vosk may be used only as a backup fallback if Whisper fails on the target phone during real-device testing; it is not the main path and is not required for the core build.
- AI-4: The AI layer never performs arithmetic and never saves data without a user confirmation step.
- AI-5: No on-device language model is in scope for this MVP. It is explicitly out of scope.

## States and Boundaries
- **First use / empty state** — no entries yet; the app asks the user to add a sale or expense.
- **Unclear input** — the parser cannot confidently interpret the phrase; the user can edit the item and amount before saving.
- **Confirm state** — the user reviews and edits parsed entries before save.
- **Saved state** — entries exist locally and are reflected in the Today totals.
- **Speech unavailable** — typed input remains the fallback path.
- **Demo mode** — sample data flows through the same app logic without using real records.

## Product Decisions
- The app is offline-first and local-only by design.
- Speech is helpful but never required; typed input is always available.
- Money is stored as integers and all totals are calculated by code.
- The app is intentionally lean to fit a low-end Android device and a one-person build schedule.
- Demo mode is included to make the proof of concept testable and presentable even without a microphone.

## What We're Building
The proof of concept includes:
- voice or text input
- rule-based parsing with tolerant recovery from speech mistakes
- confirm-before-save entry review
- Today ledger totals
- demo mode
- monthly PDF report

## Deferred From the POC
- full user accounts and cloud sync
- inventory management
- payments or bank integration
- multi-currency handling
- all advanced financial features beyond the monthly tally and report
- on-device LLM processing
- a complete long-history screen unless time remains after the required flow is working

## Possible Later Enhancements
- spoken day summary
- expanded history views and filtering
- richer report summaries and styling
- further tuning for market-language variations
- additional language coverage beyond the initial targeted phrases

## Non-Goals
- Accounts or user profiles stored online
- cloud backup or sync
- inventory and stock tracking
- payments, wallet features, or lending flows
- any feature that depends on a live internet connection for the core experience

## Acceptance Scenarios

### Scenario 1: voice entry
- Given the app is in airplane mode, when the user says “sold 3 bags of rice at 40k each, paid transport 5k”, then the Confirm screen shows a sale of rice with quantity 3, unit price 40,000, and total 120,000, plus an expense of transport with total 5,000; after save, Today shows sales 120,000, expenses 5,000, and profit 115,000.

### Scenario 2: Pidgin entry
- Given the user types “I don sell 2 carton indomie for 15 thousand”, then the app shows a sale of indomie with quantity 2, unit carton, and total 15,000.

### Scenario 3: unclear input
- Given the user types “I sell am 40k”, then the app shows a sale with total 40,000 and highlights the missing item field for the user to complete.

### Scenario 4: garbled input
- Given the text cannot be parsed, then the app shows an editable blank entry and does not crash.

### Scenario 5: report
- Given a month with recorded entries, when the user opens Report and chooses that month, then the one-page report shows the correct totals and can be shared as a PDF.

### Scenario 6: demo mode
- Given demo mode is on and no microphone is used, the user can complete the full flow from sample sentence to PDF report.

### Scenario 7: speech unavailable
- Given microphone permission is denied, the app explains the problem and lets the user type instead.

## Open Questions
- Which trader type should the MVP demo highlight as the default example?
- What is the target default currency and formatting for the report preview?
- If Whisper is not reliable on the real device, when should Vosk be tested as a fallback rather than a first choice?
- Are there any additional conventions required by the hackathon submission beyond the project brief?
