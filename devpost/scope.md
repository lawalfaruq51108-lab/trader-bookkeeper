---
doc: scope
status: draft
---

# Trader Bookkeeper

An offline mobile app that turns a trader's spoken or typed sales and expenses into confirmed daily records and a monthly PDF income report.

## The Unique Kernel
A trader speaks their day, gets to correct what the app understood before anything is saved, and leaves with an offline record they can show a lender. It is built for low-end phones and supports English and Pidgin speech input.

## Who It's For
An informal market trader using an inexpensive Android phone who currently keeps sales and expenses in their head or on paper. They want a clearer view of daily profit and a simple income report to support a lender conversation.

## The Core Loop
The trader opens the app, speaks or types sales and expenses, reviews and fixes the parsed entries, and explicitly saves them. They see today's sales, expenses, and profit; they can also review a simple list of past days and create a monthly PDF report.

## Inspiration & Identity
Practical, trustworthy, readable in everyday market conditions, and respectful of the trader's time. Keep the experience simple, with strong contrast and large tap targets. No specific visual references were provided.

## Why This Matters to the Learner
The learner wants to get the app working as a solo developer. The project aims to help informal traders turn day-to-day activity into records that can support a lender conversation, without internet or paid services.

## What "Working" Looks Like
In a demo under three minutes, using only the real phone and no slides or mockups:
1. Introduce the problem: traders lack records, which makes it harder to seek loans.
2. Turn on airplane mode.
3. Speak a day's sales and expenses, including English and Pidgin phrasing, such as "I sell rice 40k, paid transport 5k."
4. Review the parsed entries, correct one mistake, and tap Save.
5. Show today's sales, expenses, and profit.
6. Open the monthly report and show its totals, honesty note, PDF, and share button.
7. Close with who the app is for and what it helps them do.

The entries and totals must remain usable offline, and nothing is saved before the trader confirms it.

## The POC Boundary
- Record transactions by on-device Whisper speech recognition or typed text.
- Parse entries with rules that tolerate common speech-recognition mistakes.
- Show parsed entries on a confirm screen where the trader can correct them before saving.
- Keep a today ledger with sales, expenses, and profit totals, plus a simple list of past days.
- Include demo mode so the full flow can be shown without relying on a microphone or real records.
- Generate a monthly PDF report with totals, an honesty note, and a share action.
- Include minimal profile settings needed for the trader and report.
- Work offline on the Infinix Smart 7 without paid services.

## Later
No later features are committed. Any addition beyond this boundary needs the learner's approval first.

## Explicitly Cut
- Full history screen - the simple past-days list is enough for this 10-day solo proof of concept.
- Spoken summary - it is not needed to demonstrate the agreed record-to-report flow.
- Accounts and cloud sync - the app is a standalone offline tool.
- Inventory and payments - neither is needed to prove transaction recording and income reporting.
- Multi-currency - keep the proof of concept focused on one reporting convention.
- On-device language model - use the agreed rule-based parser and keep the build small.
- Hausa and Yoruba - keep language support to English and Pidgin for this proof of concept.