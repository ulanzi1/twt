// The sign-in RETURN PATH — Story 6.25 (Task 4.4; AC3; `2026-10-09-299` RE9 A).
//
// The staff email (`-262` FQ3 A) links to `/p/<pariwarId>/nominee-refusals`. A signed-out admin — the common case for an emailed
// link — is sent to `/login`; without a return path, sign-in lands them on `/audit/integrity` (F18). ⇒ the refusal list redirects to
// `/login?next=<its own path>`, and `LoginPage` follows `next` after sign-in IFF it is EXACTLY one of the ALLOWLISTED routes'
// same-origin RELATIVE paths for a well-formed Pariwar id. Anything else — an absolute URL, `//evil`, another route, a path with a
// query or a trailing segment — falls back to `/audit/integrity` as before (⛔ an open redirect).
// Story 6.22 (code review 2026-11-02, RC10) adds ONE more allowlisted route: the District Admin's fraud work-list, which already
// redirected here with a `next` that was silently dropped.
// Story 13.1g (decision `2026-11-12-463` AD10) adds a THIRD: the field worker Move requests page, which the move-notice email links to.
// Story 3.13 (code review 2026-11-26, P5) adds a FOURTH and a FIFTH: the identity-check queue and ONE member's identity check. Their
// pages already redirected here with a `next` that was silently dropped (the defect RC10 fixed for the fraud work-list); the
// detail's return carries the member id too, so `LoginReturn` is a union by route.

const NOMINEE_REFUSALS_PATH = /^\/p\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/nominee-refusals$/;

/** The refusal list's own path — what it passes as `next`. ⭐ Lower-cased (round 3): a re-cased link (`/p/2B7C…/…`) renders the
 * list, so its `next` must still pass the lower-case allowlist (which stays strict) — else sign-in lands on `/audit/integrity`. */
export function nomineeRefusalsPath(pariwarId: string): string {
  return `/p/${pariwarId.toLowerCase()}/nominee-refusals`;
}

/**
 * ⭐ THE `/login` route's `validateSearch` (`router.tsx` uses THIS function — round 3, so a test runs the real one): `next` is
 * carried only as a STRING, as given — TanStack's default parser `JSON.parse`s each value first, so `?next=123` arrives a number
 * and is dropped here. The ALLOWLIST (`allowedNextReturn`) is applied by `LoginPage`, ⛔ here.
 */
export function validateLoginSearch(search: Record<string, unknown>): { next?: string } {
  return typeof search['next'] === 'string' ? { next: search['next'] } : {};
}

/** The Pariwar id of an ALLOWLISTED nominee-refusals `next`, or `null` (⇒ the default landing page). `allowedNextReturn` builds its refusals branch on this. */
export function allowedNextPariwarId(next: unknown): string | null {
  if (typeof next !== 'string') return null;
  const m = NOMINEE_REFUSALS_PATH.exec(next);
  return m ? m[1]! : null;
}

const FRAUD_INVESTIGATIONS_PATH = /^\/p\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/fraud-investigations$/;

// ⚠ Its OWN one-line literal (⛔ a shared fragment): the jobs template test reads each route's literal from this file as text.
const FIELD_WORKER_REQUESTS_PATH = /^\/p\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/field-workers\/requests$/;

// ⚠ Each of the two identity-check literals is its OWN one-line literal too (⛔ a shared fragment, ⛔ a wrapped line). Lower-case ids only.
const IDENTITY_CHECKS_PATH = /^\/p\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/identity-checks$/;
const IDENTITY_CHECK_PATH = /^\/p\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/identity-checks\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

/** Where sign-in returns to: one of the FIVE allowlisted routes, the Pariwar it is for, and (a member's identity check only) the member. */
export type LoginReturn =
  | {
      readonly to:
        | '/p/$pariwarId/nominee-refusals'
        | '/p/$pariwarId/fraud-investigations'
        | '/p/$pariwarId/field-workers/requests'
        | '/p/$pariwarId/identity-checks';
      readonly pariwarId: string;
    }
  | { readonly to: '/p/$pariwarId/identity-checks/$memberId'; readonly pariwarId: string; readonly memberId: string };

/** The ALLOWLISTED destination of `next`, or `null` (⇒ the default landing page). ⭐ What `LoginPage` follows. */
export function allowedNextReturn(next: unknown): LoginReturn | null {
  if (typeof next !== 'string') return null;
  const refusalsPariwarId = allowedNextPariwarId(next);
  if (refusalsPariwarId !== null) return { to: '/p/$pariwarId/nominee-refusals', pariwarId: refusalsPariwarId };
  const fraud = FRAUD_INVESTIGATIONS_PATH.exec(next);
  if (fraud) return { to: '/p/$pariwarId/fraud-investigations', pariwarId: fraud[1]! };
  const requests = FIELD_WORKER_REQUESTS_PATH.exec(next);
  if (requests) return { to: '/p/$pariwarId/field-workers/requests', pariwarId: requests[1]! };
  const checks = IDENTITY_CHECKS_PATH.exec(next);
  if (checks) return { to: '/p/$pariwarId/identity-checks', pariwarId: checks[1]! };
  const check = IDENTITY_CHECK_PATH.exec(next);
  if (check) return { to: '/p/$pariwarId/identity-checks/$memberId', pariwarId: check[1]!, memberId: check[2]! };
  return null;
}

/** Story 6.22 (DL10 (iv)) — the District Admin's work-list of claims flagged for investigation. */
export function fraudInvestigationsPath(pariwarId: string): string {
  return `/p/${pariwarId.toLowerCase()}/fraud-investigations`;
}

/** Story 3.13 (DL13) — the identity-check queue, and one member's identity check. */
export function identityChecksPath(pariwarId: string): string {
  return `/p/${pariwarId.toLowerCase()}/identity-checks`;
}
export function identityCheckPath(pariwarId: string, memberId: string): string {
  return `/p/${pariwarId.toLowerCase()}/identity-checks/${memberId.toLowerCase()}`;
}

/** Story 13.1g (AD10) — the field worker Move requests page (13.1d): the move-notice email's link, and what its own sign-in redirects pass. */
export function fieldWorkerRequestsPath(pariwarId: string): string {
  return `/p/${pariwarId.toLowerCase()}/field-workers/requests`;
}
