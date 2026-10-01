// IST helpers for the correction chase's staff surfaces (Story 6.19b). The chase's days are IST calendar days on the
// server (`cycleCalendar.istDateOf`), so the forms bound their dates by the IST "today", ⛔ not the browser's.

const IST = 'Asia/Kolkata';

/** Today's IST calendar date as `YYYY-MM-DD` (`en-CA` formats as ISO). */
export function istToday(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit' });
}

/** An instant as staff read it, in IST. ⚠ An unparseable value is shown as given — ⛔ never as "Invalid Date". */
export function formatIst(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-IN', { timeZone: IST, dateStyle: 'medium', timeStyle: 'short' });
}
