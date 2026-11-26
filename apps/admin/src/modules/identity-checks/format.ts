// Story 3.13 — dates on the identity-check screens, on the Indian calendar (`Asia/Kolkata`), e.g. "25 Nov 2026".

const FORMAT = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

export function formatIstDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : FORMAT.format(d);
}

// A typed-in date of birth is a CALENDAR date (`YYYY-MM-DD`, ⛔ a moment): read and printed in UTC so no time zone moves the day,
// in the same "9 Mar 1971" shape as every other date here — ⛔ the raw ISO `1971-03-09`, whose day and month staff could swap
// against an ID card printed DD/MM/YYYY (code review R3-P8). A value of another shape is shown as it is (⛔ a blank beside Confirm).
const DOB_FORMAT = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function formatDateOfBirth(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return value;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  // `Date.UTC` rolls an impossible day over (`1971-02-31` → 3 Mar): such a value is shown as typed, ⛔ silently moved.
  if (d.getUTCFullYear() !== Number(m[1]) || d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) return value;
  return DOB_FORMAT.format(d);
}
