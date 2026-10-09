// The sign-in RETURN PATH — Story 6.25 (Task 4.4; AC3; `2026-10-09-299` RE9 A).
//
// The staff email (`-262` FQ3 A) links to `/p/<pariwarId>/nominee-refusals`. A signed-out admin — the common case for an emailed
// link — is sent to `/login`; without a return path, sign-in lands them on `/audit/integrity` (F18). ⇒ the refusal list (and ONLY
// it) redirects to `/login?next=<its own path>`, and `LoginPage` follows `next` after sign-in IFF it is EXACTLY that list's
// same-origin RELATIVE path for a well-formed Pariwar id. Anything else — an absolute URL, `//evil`, another route, a path with a
// query or a trailing segment — falls back to `/audit/integrity` as before (⛔ an open redirect).

const NOMINEE_REFUSALS_PATH = /^\/p\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/nominee-refusals$/;

/** The refusal list's own path — what it passes as `next`. ⭐ Lower-cased (round 3): a re-cased link (`/p/2B7C…/…`) renders the
 * list, so its `next` must still pass the lower-case allowlist (which stays strict) — else sign-in lands on `/audit/integrity`. */
export function nomineeRefusalsPath(pariwarId: string): string {
  return `/p/${pariwarId.toLowerCase()}/nominee-refusals`;
}

/**
 * ⭐ THE `/login` route's `validateSearch` (`router.tsx` uses THIS function — round 3, so a test runs the real one): `next` is
 * carried only as a STRING, as given — TanStack's default parser `JSON.parse`s each value first, so `?next=123` arrives a number
 * and is dropped here. The ALLOWLIST (`allowedNextPariwarId`) is applied by `LoginPage`, ⛔ here.
 */
export function validateLoginSearch(search: Record<string, unknown>): { next?: string } {
  return typeof search['next'] === 'string' ? { next: search['next'] } : {};
}

/** The Pariwar id of an ALLOWLISTED `next`, or `null` (⇒ the default landing page). */
export function allowedNextPariwarId(next: unknown): string | null {
  if (typeof next !== 'string') return null;
  const m = NOMINEE_REFUSALS_PATH.exec(next);
  return m ? m[1]! : null;
}
