// IST helpers for the correction chase's staff surfaces (Story 6.19b). The chase's days are IST calendar days on the
// server (`cycleCalendar.istDateOf`), so the forms bound their dates by the IST "today", ⛔ not the browser's.

const IST = 'Asia/Kolkata';

const IST_DATE_PARTS = new Intl.DateTimeFormat('en-US', { timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit' });

/**
 * Today's IST calendar date as `YYYY-MM-DD`. ⭐ Assembled from `formatToParts`, ⛔ not from a locale's whole-string
 * format (`en-CA` happening to print ISO is a CLDR detail, ⛔ a contract). The IST day turns at 18:30 UTC.
 */
export function istToday(now: Date = new Date()): string {
  const parts = IST_DATE_PARTS.formatToParts(now);
  const part = (type: 'year' | 'month' | 'day'): string => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** An instant as staff read it, in IST. ⚠ An unparseable value is shown as given — ⛔ never as "Invalid Date". */
export function formatIst(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', { timeZone: IST, dateStyle: 'medium', timeStyle: 'short' });
}
