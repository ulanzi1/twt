// The `apps/public` → `apps/api` Sahyog Drive client — Story 11b.1 (Task 3; AC1, AC6, AC8).
//
// The SECOND cross-app hop on this surface, mirroring `directory.server.ts` in every respect that
// matters. `*.server.ts` marks this server-only: it is never part of a client island's module graph.
//
// ── ⭐ WHY THE READ IS OVER HTTP AT ALL, RATHER THAN A LOCAL DB READ ────────────────────────────
// D6(a), and `2026-08-20-143` cl.1 before it. Capability, ⛔ not taste: rendering a named drive row
// needs a Tier-1 KYC decrypt (KMS deps), an anti-enumeration ceiling (a rate-limit store) and an
// abuse counter (the BYPASSRLS service pool). `apps/public` has NONE of the three, and giving it the
// first would mean handing the internet-facing SSR process decrypt capability over a KEK shared by
// EVERY Tier-1 field class. ⛔ Do not "simplify" this into a `withPublicScope` read — that has been
// rejected twice already, at 11a.3 and by the standing test.
//
// ⛔ THIS MODULE, AND EVERY OTHER MODULE IN `apps/public`, IMPORTS NO ENCRYPTION SYMBOL AND HOLDS NO
// KEY REFERENCE OF ANY KIND. `tests/no-kms-in-public.test.ts` asserts that absence across the whole
// app. ⚠ That scan is deliberately NOT comment-stripped, so this comment names the forbidden tokens
// only by description — ⛔ writing them out here would trip the scan, which is the scan working.
//
// ── ⚠ THE FORWARDED ADDRESS IS NOT A NICETY ────────────────────────────────────────────────────
// ⭐ `buildForwardedFor` IS REUSED VERBATIM from `directory.server.ts`, ⛔ never re-implemented.
// `2026-08-21-145` cl.2 ruled that ONLY `Astro.clientAddress` is forwarded and the inbound
// `X-Forwarded-For` chain is DISCARDED, never appended: `apps/api` runs `trustProxy: true` and keys
// on the LEFTMOST entry, so appending handed an attacker both the rate-limit key and a fresh
// abuse-counter window per request. ⛔ A second copy of that logic here is exactly how the two
// drift, and this one would drift silently — no render breaks when the ceiling disappears.

import type { PublicSahyogDriveResponse } from '@twt/contracts';

import { API_ORIGIN } from './directory.server.js';
import { ACTIVE_PARIWAR_ID } from './pariwar.server.js';

export { buildForwardedFor } from './directory.server.js';

/**
 * How long to wait before giving up.
 *
 * ⛔ ONE ATTEMPT, NO RETRY — the same rule, for the same reason. A retry storm on a public page
 * turns a slow API into a self-inflicted outage: every visitor multiplying load on the thing that
 * is already struggling. The dignified failure state is the correct answer, ⛔ not a second request.
 */
const REQUEST_TIMEOUT_MS = 4000;

/**
 * What the page gets back.
 *
 * ⚠ `ok: false` IS AN OUTAGE, ⛔ NEVER "there are no drives". Those are different statements about
 * the trust and the page must never make the second one on the first one's evidence — the whole
 * purpose of this surface is that someone can check whether this trust moves money, so rendering
 * "no drives" during an upstream blip is the single most misleading thing it could do.
 */
export type SahyogDriveFetchResult =
  | { readonly ok: true; readonly data: PublicSahyogDriveResponse }
  | {
      readonly ok: false;
      /**
       * ⭐ `'rejected'` IS AN INPUT REFUSAL AND IS ⛔ NOT AN OUTAGE — the API read the request and
       * returned a 4xx, so the visitor's filter was malformed and the fix is theirs. The caller
       * MUST present it as AC7's REJECTION state (400 + `no-store` + fixable-input copy).
       *
       * ⚠ The other three are all genuine upstream failure and are the OUTAGE state (503 +
       * `Retry-After`). ⛔ Never fold `'rejected'` in with them: telling a visitor their own typo
       * is "a problem on our side" is what AC7's four-state contract exists to prevent, and it
       * reports a user-caused 4xx to crawlers and uptime monitors as a server fault.
       */
      readonly reason: 'unreachable' | 'timeout' | 'bad_response' | 'rejected';
    };

/** The three ruled filter dimensions (D2(a)). ⛔ There is no fourth, and ⛔ no name filter. */
export interface SahyogDriveFilters {
  district?: string;
  closedFrom?: string;
  closedTo?: string;
  poolCode?: string;
}

export interface SahyogDriveFetchOptions extends SahyogDriveFilters {
  page: number;
  limit: number;
  /**
   * The visitor's address as THIS process observed it (`Astro.clientAddress`), via
   * {@link buildForwardedFor}. ⛔ NOT the inbound chain.
   *
   * ⚠ REQUIRED, and required EXPLICITLY: an optional parameter here would make the safe-looking
   * call site the one that silently collapses every visitor into one rate-limit bucket.
   * `null` means "no address observed" ⇒ the header is OMITTED, ⛔ never sent empty (an empty
   * header reads to `proxy-addr` as "no chain" and falls back to the SSR socket).
   */
  forwardedFor: string | null;
}

/**
 * Fetch one page of the public Sahyog Drive.
 *
 * ⛔ NEVER THROWS. A public page must not 500 because an upstream is slow — it renders the outage
 * state, which the caller is required to present as an OUTAGE and ⛔ never as an empty index.
 */
export async function fetchSahyogDrive(
  opts: SahyogDriveFetchOptions,
): Promise<SahyogDriveFetchResult> {
  const url = new URL(
    `/api/v1/p/${ACTIVE_PARIWAR_ID}/public-pages/sahyog-drive`,
    API_ORIGIN,
  );
  url.searchParams.set('page', String(opts.page));
  url.searchParams.set('limit', String(opts.limit));
  // ⛔ Only the three ruled dimensions are ever forwarded, and only when set. The API's `.strict()`
  // schema would refuse anything else — which is the point — but sending it would still be a bug
  // here, not there.
  if (opts.district !== undefined) url.searchParams.set('district', opts.district);
  if (opts.closedFrom !== undefined) url.searchParams.set('closedFrom', opts.closedFrom);
  if (opts.closedTo !== undefined) url.searchParams.set('closedTo', opts.closedTo);
  if (opts.poolCode !== undefined) url.searchParams.set('poolCode', opts.poolCode);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        // ⭐ ⛔ Do not remove: without this the rate limit and every abuse signal key on the SSR
        // proxy, and one global bucket protects nobody. ⚠ OMITTED when null, ⛔ never empty.
        ...(opts.forwardedFor !== null ? { 'x-forwarded-for': opts.forwardedFor } : {}),
      },
      signal: controller.signal,
    });
    // ⭐⛔ AN INPUT REFUSAL IS NOT AN OUTAGE (Review finding, 2026-08-27; ✅ RULED AC7 GOVERNS,
    // BigDev 2026-08-27). A 4xx means the API READ the request and REFUSED it — the visitor's
    // filter was malformed. A 5xx, a timeout or an unreachable origin means the surface is down.
    // ⚠ Collapsing the two made the page tell a visitor who typed a space into the District box
    // *"This is a problem on our side, not a statement about the trust's activity"* at HTTP 503 —
    // reporting a user's typo to them, and to every crawler and uptime monitor, as a server fault.
    // ⚠ AC8's *"`ok:false` presented as an OUTAGE"* is read as meaning TRANSPORT FAILURE; AC7's
    // four-state contract governs, and the two states are ⛔ not interchangeable.
    // ⛔ Do not collapse this back: the first review pass patched two triggering INPUTS and left
    // the shape, and the shape was found again by the next pass.
    if (!res.ok) {
      return {
        ok: false,
        reason: res.status >= 400 && res.status < 500 ? 'rejected' : 'bad_response',
      };
    }

    const body = (await res.json()) as unknown;
    if (!isSahyogDriveResponse(body)) return { ok: false, reason: 'bad_response' };
    return { ok: true, data: body };
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError';
    return { ok: false, reason: aborted ? 'timeout' : 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A typed parse of the response.
 *
 * ⚠ Deliberately a hand-written structural check rather than a Zod re-parse: `@twt/contracts`'
 * schema is the authority at the API boundary, and importing it for a SECOND validation here would
 * add a parse of the same shape on every render for no additional guarantee. What this defends
 * against is a MALFORMED or wrong-shaped body (a proxy error page, an HTML 502), ⛔ not a contract
 * violation the API-side schema already rejects.
 */
function isSahyogDriveResponse(body: unknown): body is PublicSahyogDriveResponse {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b['items'])) return false;
  if (typeof b['page'] !== 'number' || typeof b['limit'] !== 'number') return false;
  if (typeof b['total'] !== 'number') return false;
  return b['items'].every((row: unknown) => {
    if (typeof row !== 'object' || row === null) return false;
    const r = row as Record<string, unknown>;
    return (
      // ⚠ `null` is a VALID name here and is not a degraded read — it is the consent gate's normal
      // verdict. ⛔ Treating a null name as a bad response would turn every unconsented drive into
      // an outage, which inverts AC2 exactly.
      // ⚠ ⛔ BUT `''` IS NOT A VALID NAME (Review finding, 2026-08-27). The contract is
      // `z.string().min(1).nullable()` and the API maps `name === '' ? null : name` precisely
      // because `shielded_name` returns `''` for a mononym. An empty string is truthy-DISTINCT
      // from null here, so it would survive as a "present" name and render a blank name cell —
      // the announced-omission signal AC2 forbids, arriving through the one field it matters most
      // for. Accept `null` or a NON-EMPTY string, nothing between.
      (r['deceasedMemberName'] === null ||
        (typeof r['deceasedMemberName'] === 'string' && r['deceasedMemberName'].length > 0)) &&
      typeof r['poolLetterCode'] === 'string' &&
      typeof r['poolCanonicalIdentifier'] === 'string' &&
      (r['status'] === 'active' || r['status'] === 'archive') &&
      (r['closedAt'] === null || typeof r['closedAt'] === 'string') &&
      (r['district'] === null || typeof r['district'] === 'string') &&
      typeof r['confirmedContributionCount'] === 'number' &&
      // ⚠ VALIDATED AGAINST THE LITERAL SET, ⛔ not `typeof === 'string'` (Review finding,
      // 2026-08-27). `framingFor` switches on this value and its `default:` branch THROWS, inside
      // `buildSahyogView`, which the `.astro` frontmatter calls unguarded — so a bare `string`
      // check let any unknown token through and defeated this module's own "⛔ NEVER THROWS"
      // guarantee one function later. ⭐ `status` immediately above was already checked this way;
      // the two are now symmetric.
      // ⚠ `null` is VALID and load-bearing: it means no expectation was ever set for the drive
      // (zero assigned contributors) and the row deliberately says nothing.
      (r['fundingOutcome'] === null ||
        r['fundingOutcome'] === 'fully_funded' ||
        r['fundingOutcome'] === 'under_funded' ||
        r['fundingOutcome'] === 'partial')
    );
  });
}
