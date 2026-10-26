# Trader Bookkeeper

**Talk to your ledger.** An offline, free, voice-first bookkeeping app for informal market traders. Say what you sold and spent, in English or Pidgin, and get a clean ledger plus a one-page income report you can show a lender.

> Built for the **Build With AI Hackathon** (Devpost) using the Devpost Learn Skill Pack and GitHub Copilot.

---

## The Problem

Informal traders (market sellers, provisions shops, fabric and food sellers) track sales in their heads or on scraps of paper. They often do not know their real profit, and with no records they cannot prove income, so loans from microfinance lenders and cooperatives are hard to get. Existing bookkeeping apps assume accounting knowledge, a steady connection, a capable phone and a subscription.

## The Solution

- **Voice-first:** speak the day's sales and expenses, or type them.
- **Understands local speech:** handles phrases like "I sell am 40k" and "paid transport 5k".
- **You stay in control:** every entry is shown on a confirm screen to fix before saving.
- **Offline and free:** runs on the phone with no internet, no subscription, no API key.
- **Loan-readiness report:** a one-page monthly PDF showing sales, expenses, profit and activity.
- **Works on cheap phones:** tested on a low-end Android (Infinix Smart 7).

## Features

| Feature | Status |
|---|---|
| Record by voice or text | MVP |
| Rule-based parser (English and Pidgin) | MVP |
| Confirm and edit screen | MVP |
| Daily ledger with totals and profit | MVP |
| History by day | MVP |
| Spoken daily summary (text-to-speech) | MVP |
| Monthly loan-readiness report (PDF) | MVP |
| Demo mode with sample inputs | MVP |
| On-device speech model | Planned (decided after speech test) |
| Optional on-device language model fallback | Stretch |

## Screenshots

_Add screenshots here before submission._

## Install

### Option 1: Android APK (easiest)
1. Download the latest APK from the **Releases** page: (https://github.com/lawalfaruq51108-lab/trader-bookkeeper/releases)>`
2. Allow installation from unknown sources if prompted.
3. Open **Trader Bookkeeper**.

### Option 2: Run from source
Requirements: Node.js (LTS), Git, and an Android phone with USB debugging or an emulator.

```bash
git clone https://github.com/<lawalfaruq51108-lab>/trader-bookkeeper.git
cd trader-bookkeeper
npm install
npx expo start
```

If a native speech module is used, you need a development build instead of Expo Go:

```bash
npx expo run:android
```

## Try It Without a Microphone (Demo Mode)

1. Open the app and go to **Settings**.
2. Turn on **Demo mode** (or tap **Demo examples** on the Record screen).
3. Tap a sample sentence such as _"sold 3 bags of rice at 40k each, paid transport 5k"_.
4. Review it on the Confirm screen, save it, then open **Today** and **Report**.

No API key or account is needed.

## Example Inputs

| You say or type | The app records |
|---|---|
| sold 3 bags of rice at 40k each | Sale: rice, 3 bags, 40,000 each, total 120,000 |
| I sell am 40k | Sale: total 40,000 (asks for the item name) |
| paid transport 5k | Expense: transport, 5,000 |
| I don sell 2 carton indomie for 15 thousand | Sale: indomie, 2 cartons, total 15,000 |

## How It Works

```
Voice or text -> Parser -> Confirm screen -> SQLite ledger -> Reports (PDF) + spoken summary
```

The parser extracts values from the sentence, and plain code calculates all totals, so the numbers are reliable. See [ARCHITECTURE.md](./ARCHITECTURE.md) for details.

## Tech Stack

- React Native with Expo (TypeScript)
- `expo-sqlite` for offline storage
- Speech recognition library (see ARCHITECTURE.md for the chosen one)
- `expo-speech` for spoken summaries
- `expo-print` and `expo-sharing` for the PDF report
- Jest for parser tests

## Run the Tests

```bash
npm test
```

The parser has a test suite of example sentences with expected outputs.

## Project Documents

| File | Purpose |
|---|---|
| `scope.md` | Project scope (generated with the Devpost Learn Skill Pack) |
| `prd.md` | Product requirements (generated with the Devpost Learn Skill Pack) |
| `spec.md` | Technical specification (generated with the Devpost Learn Skill Pack) |
| `ARCHITECTURE.md` | System design and module overview |
| `docs/` | Seed documents and speech test notes |

## AI in This Project

- **Built with AI:** planned and built using the Devpost Learn Skill Pack and GitHub Copilot in VS Code.
- **AI in the app:** `<UPDATE after speech test: on-device speech model / built-in recognizer / none>`.

## Third-Party Libraries and Disclosures

- All dependencies are listed in `package.json` and are used under their own licenses.
- No pre-existing project code was used. This project was created during the hackathon submission period.
- `<List any starter templates or prototypes here.>`

## Limitations

- Speech recognition accuracy varies by phone and accent. Typed input is always available.
- Reports are generated from the trader's own entries and are **self-reported and not independently audited**.

## Roadmap

- Hausa and Yoruba phrase support
- Customer credit tracking ("who owes me")
- Backup and restore

## Team

- `<Name 1>` (Representative)
- `<Name 2>`

## License

MIT. See [LICENSE](./LICENSE).
