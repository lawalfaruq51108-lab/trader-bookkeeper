import { formatNaira } from '../domain/money';
import type { MonthReportData } from '../domain/types';
import type { Profile } from '../db/profile';

const HONESTY_NOTE =
  "Generated from the trader's own self-recorded entries. Not independently audited.";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

function formatMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString('en-NG', {
    month: 'long',
    year: 'numeric',
  });
}

function itemRows(
  items: MonthReportData['topItems'],
  emptyLabel: string
): string {
  if (items.length === 0) {
    return `<tr><td colspan="2" class="empty">${emptyLabel}</td></tr>`;
  }
  return items
    .slice(0, 5)
    .map(
      ({ item, total }) =>
        `<tr><td>${escapeHtml(item)}</td><td class="amount">${formatNaira(total)}</td></tr>`
    )
    .join('');
}

export function buildReportHtml(
  data: MonthReportData,
  profile: Profile | null,
  isDemo = false
): string {
  const traderName = escapeHtml(profile?.traderName?.trim() || 'Trader');
  const businessName = escapeHtml(
    profile?.businessName?.trim() || 'Provisions shop'
  );
  const generatedAt = escapeHtml(
    new Date().toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Trader Bookkeeper report - ${escapeHtml(formatMonth(data.month))}</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #17211b;
      background: #fff;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      line-height: 1.35;
    }
    main { width: 100%; max-height: 269mm; overflow: hidden; }
    header { border-bottom: 2px solid #1b6b3a; padding-bottom: 10px; margin-bottom: 14px; }
    h1 { margin: 0 0 4px; font-size: 22pt; color: #145c2e; }
    h2 { margin: 14px 0 6px; font-size: 13pt; color: #145c2e; }
    p { margin: 3px 0; }
    .meta { color: #435348; }
    .badge { display: inline-block; margin-top: 7px; padding: 3px 8px; border: 1px solid #8a5b00; border-radius: 4px; color: #684500; font-weight: bold; }
    .summary { display: table; width: 100%; border-spacing: 6px; margin: 4px -6px 0; }
    .summary-cell { display: table-cell; width: 33.33%; padding: 10px; border: 1px solid #c6d0c8; border-radius: 5px; vertical-align: top; }
    .summary-label { color: #435348; font-size: 9pt; text-transform: uppercase; }
    .summary-value { margin-top: 4px; font-size: 16pt; font-weight: bold; }
    .detail-grid { display: table; width: 100%; table-layout: fixed; border-spacing: 8px 0; margin: 0 -8px; }
    .detail-column { display: table-cell; width: 50%; vertical-align: top; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    td { padding: 5px 3px; border-bottom: 1px solid #d9dfda; }
    .amount { text-align: right; white-space: nowrap; }
    .empty { color: #59665d; font-style: italic; }
    .signature { margin-top: 25px; width: 58%; border-top: 1px solid #26352b; padding-top: 5px; }
    footer { margin-top: 16px; border-top: 1px solid #c6d0c8; padding-top: 7px; color: #435348; font-size: 8.5pt; }
    .honesty { font-weight: bold; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Monthly business report</h1>
      <p><strong>${traderName}</strong> · ${businessName}</p>
      <p class="meta">For ${escapeHtml(formatMonth(data.month))} · Prepared ${generatedAt}</p>
      ${isDemo ? '<p class="badge">DEMO DATA — SAMPLE RECORDS</p>' : ''}
    </header>
    <section class="summary">
      <div class="summary-cell"><div class="summary-label">Total sales</div><div class="summary-value">${formatNaira(data.totalSales)}</div></div>
      <div class="summary-cell"><div class="summary-label">Total expenses</div><div class="summary-value">${formatNaira(data.totalExpenses)}</div></div>
      <div class="summary-cell"><div class="summary-label">Net profit</div><div class="summary-value">${formatNaira(data.netProfit)}</div></div>
    </section>
    <p><strong>Active days:</strong> ${data.activeDays} &nbsp; <strong>Average daily sales:</strong> ${formatNaira(data.avgDailySales)}</p>
    <div class="detail-grid">
      <section class="detail-column">
        <h2>Top 5 items sold</h2>
        <table><tbody>${itemRows(data.topItems, 'No sales recorded')}</tbody></table>
      </section>
      <section class="detail-column">
        <h2>Top 5 expenses</h2>
        <table><tbody>${itemRows(data.topExpenses, 'No expenses recorded')}</tbody></table>
      </section>
    </div>
    <div class="signature">Trader signature</div>
    <footer><p class="honesty">${HONESTY_NOTE}</p><p>Currency: Nigerian naira · Generated offline by Trader Bookkeeper.</p></footer>
  </main>
</body>
</html>`;
}
