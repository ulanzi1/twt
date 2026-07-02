// Shared date formatter for the withdrawal surface (Story 3.10, Task 8).
//
// Mirrors the renewal/lock-in widget formatters: locale-aware, ALWAYS in Latin numerals (operational
// figures — amendment-A2), with a graceful fallback to the ISO date slice on a bad value. Used by the
// withdrawn-confirmation (`done`) view + the signup rejoin-block screen to render the dignified date copy.

export function formatWithdrawalDate(iso: string, locale: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso.slice(0, 10)
  try {
    return d.toLocaleDateString(locale === 'hi' ? 'hi-IN-u-nu-latn' : 'en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso.slice(0, 10)
  }
}
