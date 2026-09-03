// The public-site origin + the links into it (Story 10.19, Task 8).
//
// Extracted from `niyamavali-link.ts`, which owned this resolution alone until a second consumer
// appeared. `EXPO_PUBLIC_PUBLIC_SITE_ORIGIN` mirrors `EXPO_PUBLIC_API_URL` in `lib/member-api.ts:13`
// and matches the public app's `PUBLIC_SITE_ORIGIN`. CODE-defaulted to production — `eas.json`
// carries no env blocks, so non-default environments set the var at build time via EAS environment
// or `.env.local`.
//
// ── Why this matters to Story 10.19 (AC10) ────────────────────────────────────────────────────────
// A terminated member must keep reaching PUBLIC TRUST CONTENT with no session and no
// re-authentication. In this app that content is not an in-app route — every route outside the
// `(auth)` group is behind the root session guard (`app/_layout.tsx:112-117`) — it is the public
// Astro site (`apps/public/src/pages/`: the home page, the Niyamavali, the Terms, the blog). So the
// requirement is satisfied by an OUTBOUND link, and the AC is that nothing in this story breaks it.
// ⛔ Do not "improve" this into an in-app WebView behind the session guard; that would put public
// content back behind the very gate this story closes.

const publicSiteOrigin = (process.env.EXPO_PUBLIC_PUBLIC_SITE_ORIGIN ?? 'https://twt.org').replace(
  /\/$/,
  '',
)

/** The public site's home page — Trust information readable with no account and no session. */
export function publicSiteHomeUrl(locale: string): string {
  return `${publicSiteOrigin}/?lang=${encodeURIComponent(locale)}`
}

/**
 * Build the public Niyamavali URL for `clauseId` in `locale`. The clauseId is SERVER-returned (the
 * lock-in-status read), never hardcoded in the widget — keeping the policy source server-authoritative.
 */
export function niyamavaliClauseUrl(clauseId: string, locale: string): string {
  return `${publicSiteOrigin}/niyamavali?clause=${encodeURIComponent(clauseId)}&lang=${encodeURIComponent(locale)}`
}

/**
 * ⭐⭐ THE PUBLIC SAHYOG VIVRAN URL for ONE drive — Story 11b.10 (AC4, D4).
 *
 * `2026-09-03-184` **(A)** (Trustee-ratified) ruled that a `live` drive SHOULD be publicly
 * reachable, and **(B)** removed the only way there was to address one. ⇒ this is the member app's
 * half of the inbound path: the My Pool tab's entry opens it with `Linking.openURL`.
 *
 * ⛔⛔ **THE TOKEN IS SERVER-RETURNED.** It rides `useActiveContributionQuery`'s response
 * (`sahyogVivranToken`) — the same discipline `niyamavaliClauseUrl` above states for `clauseId`:
 * *"SERVER-returned … never hardcoded in the widget"*. ⚠ Here it is load-bearing rather than tidy:
 * the client deriving an address from `poolId` or `poolCanonicalIdentifier` would re-create the
 * guessability D2 removed, INSIDE the client, where nothing server-side could bound it.
 * ⛔ Do ⛔ NOT add an overload that takes a pool id or a canonical identifier.
 *
 * ⛔ THE TOKEN IS ⛔ NOT A CREDENTIAL. It bounds DISCOVERY, ⛔ not AUTHORISATION (D1): the page
 * answers 200 to anyone holding a valid address, with no session at all — which is exactly why this
 * works as an OUTBOUND link from an app whose browser surface holds no member token
 * ([[project_no_browser_member_token_surface]]).
 *
 * ⚠ AND WHY AN OUTBOUND LINK RATHER THAN AN IN-APP SCREEN: the same reason stated at the top of
 * this module. Every route outside `(auth)` sits behind the root session guard, so an in-app view of
 * PUBLIC trust content would put that content back behind a gate. ⛔ Do not "improve" this into a
 * WebView.
 */
export function sahyogVivranUrl(sahyogVivranToken: string, locale: string): string {
  return `${publicSiteOrigin}/sahyog-vivran/${encodeURIComponent(sahyogVivranToken)}?lang=${encodeURIComponent(locale)}`
}
