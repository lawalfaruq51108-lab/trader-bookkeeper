---
doc: scope
status: draft
---

# Trader Bookkeeper

A small offline, voice-first bookkeeping app for informal traders to record daily sales and expenses, confirm what the app understood, and generate a simple monthly income report without internet or fees.

## The Unique Kernel
The unique kernel is the combination of voice-first input, confirmation-before-save, and a month-end report that helps a trader show income with limited literacy or accounting experience. The app is not just a ledger; it is a recording tool designed to turn spoken market activity into trustworthy daily totals and a usable income summary.

## Who It's For
This is for a market trader such as Mama Ngozi who sells goods in a local market, uses a low-end Android phone, may be offline, and often tracks money in her head or on scraps of paper. She wants to know whether she is making profit and needs a clear record that can support a loan application or cooperative discussion.

## The Core Loop
The user opens the app, speaks or types a short description of sales and expenses, reviews the parsed entries on a confirmation screen, saves only what they approve, then sees the day’s sales, expenses, and profit. They can later revisit earlier days and generate a monthly report.

## Inspiration & Identity
The app should feel simple, practical, and trustworthy rather than “startup-like” or overly polished. It should be high-contrast, large-tap, low-friction, and gently supportive. The tone is grounded, useful, and respectful of a trader’s time and context. It aims to feel like a tool for everyday work rather than a finance app made for office users.

## Why This Matters to the Learner
The learner wants a practical project that solves a real-world problem in a low-resource setting. The app should help traders understand their actual profit without requiring internet, subscriptions, or accounting knowledge, while staying usable on inexpensive Android hardware.

## What "Working" Looks Like
The proof of concept works when a user can record a day’s transactions by speech or text, review and correct the parsed results, save them, see their totals update, and generate a month-end report that shows sales, expenses, and profit clearly enough to share or review.

## The POC Boundary
In scope for the MVP:
- one-day record flow by voice or typed input
- confirmation and editing before save
- offline SQLite storage
- daily totals and monthly report
- demo mode for testing without a microphone
- low-end Android compatibility focus

Out of scope for now:
- multi-user shops
- inventory tracking
- bank integration
- payments and wallets
- tax filing or investments
- cloud sync or user accounts

## Later
Later versions could include richer reporting, optional on-device AI enhancement, better speech tuning, more languages, and stronger export/share workflows.

## Explicitly Cut
- Multi-user shop accounts — not needed for the MVP and outside the single-trader use case.
- Bank integrations — adds complexity without proving the core value.
- Inventory management — a different product and larger scope.
- Cloud sync — contradicts the offline-first requirement.
- Tax filing or financial advice — too much scope for a short hackathon build.
- Multi-currency and investment tracking — out of scope for this first proof of concept.
