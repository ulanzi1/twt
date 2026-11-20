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

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const LOCAL_INPUT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * A `datetime-local` value (`YYYY-MM-DDTHH:mm`, seconds optional — it carries NO zone) read as IST wall-clock time, as an ISO
 * instant; `null` when it is not a real date and time (Story 14.3, DL6). ⛔ The browser's zone is never consulted: staff type
 * IST whatever machine they are on. ⚠ Do not use `new Date(value)` for this — it reads the value in the browser's zone.
 */
export function istLocalInputToIso(value: string): string | null {
  const m = LOCAL_INPUT.exec(value.trim());
  if (!m) return null;
  const [y, mo, d, h, mi, s] = [m[1], m[2], m[3], m[4], m[5], m[6] ?? '00'].map(Number) as [number, number, number, number, number, number];
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59) return null;
  const asIfUtc = Date.UTC(y, mo - 1, d, h, mi, s);
  const check = new Date(asIfUtc);
  // `Date.UTC` rolls an impossible day forward (30 February → 2 March): refuse it instead.
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return new Date(asIfUtc - IST_OFFSET_MS).toISOString();
}

/**
 * An instant as the IST `datetime-local` value (`YYYY-MM-DDTHH:mm`) — the inverse of {@link istLocalInputToIso}, for
 * pre-filling a form field. An unparseable value gives `''` (an empty field), ⛔ never "Invalid Date".
 */
export function isoToIstLocalInput(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 16);
}
