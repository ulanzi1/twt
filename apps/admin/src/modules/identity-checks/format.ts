// Story 3.13 — dates on the identity-check screens, on the Indian calendar (`Asia/Kolkata`), e.g. "25 Nov 2026".

const FORMAT = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

export function formatIstDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : FORMAT.format(d);
}
