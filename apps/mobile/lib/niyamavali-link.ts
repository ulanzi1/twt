// Public Niyamavali deep-link builder (Story 3.7, Task 6).
//
// The lock-in clock widget's tap-target opens the public Niyamavali render (Story 2.5,
// apps/public/src/pages/niyamavali.astro) deep-linked to the relevant clause. That page reads
// `?clause=<clauseId>&lang=<locale>` (niyamavali.astro:43 `clause`, :29 `lang`); a malformed clause
// falls through to its unknown-clause view, so no client-side guard is needed beyond URL-encoding.
//
// The public-site origin is sourced from EXPO_PUBLIC_PUBLIC_SITE_ORIGIN (mirrors EXPO_PUBLIC_API_URL
// in lib/member-api.ts:13; matches the public app's PUBLIC_SITE_ORIGIN). It is CODE-defaulted to
// production — eas.json carries no env blocks (not even EXPO_PUBLIC_API_URL), so for non-default
// environments operators set the var at build time via EAS environment or .env.local.

const publicSiteOrigin = (process.env.EXPO_PUBLIC_PUBLIC_SITE_ORIGIN ?? 'https://twt.org').replace(
  /\/$/,
  '',
)

/**
 * Build the public Niyamavali URL for `clauseId` in `locale`. The clauseId is SERVER-returned (the
 * lock-in-status read), never hardcoded in the widget — keeping the policy source server-authoritative.
 */
export function niyamavaliClauseUrl(clauseId: string, locale: string): string {
  return `${publicSiteOrigin}/niyamavali?clause=${encodeURIComponent(clauseId)}&lang=${encodeURIComponent(locale)}`
}
