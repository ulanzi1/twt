// The `apps/public` → `apps/api` per-claim Sahyog Vivran client — Story 11b.3 (Task 3/4; AC1, AC6).
//
// The THIRD cross-app hop on the public surfaces, mirroring `sahyog.server.ts` in every respect that
// matters. `*.server.ts` marks this server-only: it is never part of a client island's module graph.
//
// ── ⭐ WHY THE READ IS OVER HTTP AT ALL — AND WHY THE ANSWER IS **NOT** "the decrypt" HERE ───────
// D6(a), and `2026-08-20-143` cl.1 before it, gave THREE reasons for the sibling routes: a Tier-1 KYC
// decrypt (KMS deps), an anti-enumeration ceiling (a rate-limit store) and an abuse counter (the
// BYPASSRLS service pool). ⚠ ⛔ THE FIRST DOES NOT APPLY TO THIS ROUTE — it selects no Tier-1 column
// and costs ZERO KMS round-trips, which is the whole purchase of the D6(b) split.
// ⭐ THE OTHER TWO STILL DO, and on THIS route the ceiling is the load-bearing one: the identifier is
// SEQUENTIAL (`P-YYYY-MM-###`), controls 2 and 3 are structurally N/A (D11(a)), so `limits.search` is
// the ONLY bound on walking it. ⛔ Do not "simplify" this into a `withPublicScope` read — that has
// been rejected twice already, at 11a.3 and by the standing test, and here it would delete the only
// bound this surface has.
//
// ⛔ THIS MODULE, AND EVERY OTHER MODULE IN `apps/public`, IMPORTS NO ENCRYPTION SYMBOL AND HOLDS NO
// KEY REFERENCE OF ANY KIND. `tests/no-kms-in-public.test.ts` asserts that absence across the whole
// app. ⚠ That scan is deliberately NOT comment-stripped, so this comment names the forbidden tokens
// only by description — ⛔ writing them out here would trip the scan, which is the scan working.
//
// ── ⚠ THE FORWARDED ADDRESS IS NOT A NICETY ────────────────────────────────────────────────────
// ⭐ `buildForwardedFor` IS REUSED VERBATIM, ⛔ never re-implemented. `2026-08-21-145` cl.2 ruled that
// ONLY `Astro.clientAddress` is forwarded and the inbound `X-Forwarded-For` chain is DISCARDED, never
// appended: `apps/api` runs `trustProxy: true` and keys on the LEFTMOST entry, so appending handed an
// attacker the rate-limit key. ⛔ A second copy of that logic here is exactly how the two drift, and
// this one would drift silently — no render breaks when the ceiling disappears.

import type { PublicSahyogVivranResponse } from '@twt/contracts';

import { API_ORIGIN } from './directory.server.js';
import { ACTIVE_PARIWAR_ID } from './pariwar.server.js';

export { buildForwardedFor } from './directory.server.js';

/**
 * How long to wait before giving up.
 *
 * ⛔ ONE ATTEMPT, NO RETRY — the same rule, for the same reason. A retry storm on a public page turns
 * a slow API into a self-inflicted outage: every visitor multiplying load on the thing that is
 * already struggling. The dignified failure state is the correct answer, ⛔ not a second request.
 */
const REQUEST_TIMEOUT_MS = 4000;

/**
 * What the page gets back.
 *
 * ⭐⛔ THE FOUR-STATE CONTRACT, AND ON A SINGLE-ITEM ROUTE IT GAINS A FOURTH MEMBER THE INDEX DOES
 * NOT HAVE — `'not_found'`. ⚠ It must ⛔ NEVER be folded into `'unreachable'` / `'timeout'` /
 * `'bad_response'`: telling a visitor *"we could not load this"* when the honest answer is *"there is
 * no such drive"* reports a 404 to every crawler and uptime monitor as a server fault, and telling
 * them *"no such drive"* during an upstream blip is the single most misleading thing this surface
 * could say about a family's drive. ⭐ That conflation is the exact defect AC7 exists to prevent one
 * surface over ([[project_epic9_confirmed_producer_is_live]] is a different lesson; this is 11b.1's).
 *
 * ⚠⛔ AND `'not_found'` IS ITSELF A COLLAPSE, DELIBERATELY: the API answers 404 for *"no such
 * drive"*, *"exists but is not visible at this surface's predicate"* and *"this Pariwar's public
 * surfaces are switched off"*, identically. ⛔ Do not try to distinguish them here — a distinguishable
 * miss is an ENUMERATION ORACLE on a SEQUENTIAL identifier.
 */
export type SahyogVivranFetchResult =
  | { readonly ok: true; readonly data: PublicSahyogVivranResponse }
  | {
      readonly ok: false;
      /**
       * ⭐ `'not_found'` — a real 404: this drive is not on the public record. The caller renders the
       * shell's 404, ⛔ never an outage state.
       * ⭐ `'rejected'` — any OTHER 4xx: the API read the request and refused it (a malformed
       * identifier). ⛔ Not an outage either; the caller renders the same 404, because a
       * distinguishable *"malformed"* answer is an enumeration signal.
       * ⚠ The remaining three are genuine upstream failure and are the OUTAGE state.
       */
      readonly reason: 'not_found' | 'rejected' | 'unreachable' | 'timeout' | 'bad_response';
    };

export interface SahyogVivranFetchOptions {
  /**
   * ⭐⭐ THE DRIVE'S OPAQUE PUBLIC ADDRESS TOKEN, from the route parameter, passed through UNCHANGED
   * — Story 11b.10 (AC1, `2026-09-03-184` (B)). ⚠ This used to be the `P-YYYY-MM-###`; that
   * identifier is SEQUENTIAL, so it made the surface walkable by counting.
   * ⛔ Do ⛔ NOT add an identifier arm beside it: there is EXACTLY ONE public address form.
   */
  driveToken: string;
  /**
   * The visitor's address as THIS process observed it (`Astro.clientAddress`), via
   * {@link buildForwardedFor}. ⛔ NOT the inbound chain.
   *
   * ⚠ REQUIRED, and required EXPLICITLY: an optional parameter here would make the safe-looking call
   * site the one that silently collapses every visitor into one rate-limit bucket — and on THIS route
   * that bucket is the ONLY bound on walking a sequential identifier. `null` means "no address
   * observed" ⇒ the header is OMITTED, ⛔ never sent empty.
   */
  forwardedFor: string | null;
}

/**
 * Fetch one drive's Sahyog Vivran.
 *
 * ⛔ NEVER THROWS. A public page must not 500 because an upstream is slow — it renders the outage
 * state, which the caller is required to present as an OUTAGE and ⛔ never as "no such drive".
 *
 * ⚠ THE ADDRESS IS PATH-ENCODED, ⛔ not interpolated raw. It arrives from a URL segment, so a value
 * containing `/` or `?` would otherwise re-shape the upstream request.
 */
export async function fetchSahyogVivran(
  opts: SahyogVivranFetchOptions,
): Promise<SahyogVivranFetchResult> {
  const url = new URL(
    `/api/v1/p/${ACTIVE_PARIWAR_ID}/public-pages/sahyog-vivran/${encodeURIComponent(
      opts.driveToken,
    )}`,
    API_ORIGIN,
  );
  // ⛔ NO query parameters are ever added. The API's query schema is EMPTY and `.strict()`, so any
  // parameter is a 400 — which is the point (control 5: no export affordance, no onward parameter).

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        // ⭐ ⛔ Do not remove: without this the rate limit keys on the SSR proxy, and one global
        // bucket protects nobody. ⚠ OMITTED when null, ⛔ never empty.
        ...(opts.forwardedFor !== null ? { 'x-forwarded-for': opts.forwardedFor } : {}),
      },
      signal: controller.signal,
    });

    // ⭐⛔ 404 IS ITS OWN REASON, ⛔ NOT AN OUTAGE AND ⛔ NOT A REJECTION. It is the ordinary answer
    // for an address that names nothing publishable — including a REAL drive addressed with the
    // WRONG token, which the API collapses into this same answer BYTE-IDENTICALLY (11b.10 AC1) —
    // and it is the ONE 4xx this surface expects.
    if (res.status === 404) return { ok: false, reason: 'not_found' };
    if (!res.ok) {
      return {
        ok: false,
        reason: res.status >= 400 && res.status < 500 ? 'rejected' : 'bad_response',
      };
    }

    // ⭐⛔ THE BODY PARSE HAS ITS **OWN** TRY/CATCH, AND THAT IS A DELIBERATE DIVERGENCE FROM
    // `sahyog.server.ts`. There, a `res.json()` throw (an HTML proxy error page served with a 200, a
    // truncated body) falls into the OUTER catch and is classified `'unreachable'` — which is false:
    // the origin was reached and answered. ⚠ Both reasons render the same OUTAGE state, so nothing
    // user-visible differs — but a diagnostic that says "unreachable" about a host that replied sends
    // the first responder to the network when the fault is upstream of the JSON.
    // ⛔ The sibling is ⛔ NOT swept here (that is scope creep with its own fallback trigger); this
    // module simply does not repeat it.
    let body: unknown;
    try {
      body = (await res.json()) as unknown;
    } catch {
      return { ok: false, reason: 'bad_response' };
    }
    if (!isSahyogVivranResponse(body)) return { ok: false, reason: 'bad_response' };
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
 * ⚠ Deliberately a hand-written structural check rather than a Zod re-parse: `@twt/contracts`' schema
 * is the authority at the API boundary, and importing it for a SECOND validation here would add a
 * parse of the same shape on every render for no additional guarantee. What this defends against is a
 * MALFORMED or wrong-shaped body (a proxy error page, an HTML 502), ⛔ not a contract violation the
 * API-side schema already rejects.
 *
 * ⭐⛔ EVERY BOUNDED FIELD IS CHECKED AGAINST ITS LITERAL SET, ⛔ never `typeof === 'string'` — the
 * 11b.1 review finding, twice over. `framingFor` and the status/disposition mappers all switch on
 * these values, and a bare `string` check lets an unknown token reach a `default:` branch that throws
 * INSIDE the render, defeating this module's own "⛔ NEVER THROWS" guarantee one function later.
 */
function isSahyogVivranResponse(body: unknown): body is PublicSahyogVivranResponse {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  const d = b['drive'];
  if (typeof d !== 'object' || d === null) return false;
  const r = d as Record<string, unknown>;

  if (typeof r['poolLetterCode'] !== 'string' || r['poolLetterCode'].length === 0) return false;
  if (typeof r['poolCanonicalIdentifier'] !== 'string') return false;
  if (
    r['driveStatus'] !== 'collecting' &&
    r['driveStatus'] !== 'active' &&
    r['driveStatus'] !== 'archive'
  ) {
    return false;
  }
  if (r['closedAt'] !== null && typeof r['closedAt'] !== 'string') return false;
  // ⚠ `null` is VALID (no posting row) and is ⛔ not a degraded read. But `''` is NOT: the contract is
  // `.min(1).nullable()`, and an empty string would survive as a "present" district and render a
  // visually BLANK cell where the design says "Not recorded" (the 11a.3 finding).
  if (r['district'] !== null && (typeof r['district'] !== 'string' || r['district'].length === 0)) {
    return false;
  }
  // ⚠ Matches the wire contract's `.int().nonnegative()` — a non-integer or negative value is as
  // malformed as a non-number, and letting it through renders a nonsense count publicly.
  if (
    typeof r['confirmedContributionCount'] !== 'number' ||
    !Number.isInteger(r['confirmedContributionCount']) ||
    r['confirmedContributionCount'] < 0
  ) {
    return false;
  }
  // ⚠ `null` is VALID and load-bearing — it means the drive is still collecting, or that no
  // expectation was ever set (zero assignees). The page deliberately says nothing for it.
  if (
    r['fundingOutcome'] !== null &&
    r['fundingOutcome'] !== 'fully_funded' &&
    r['fundingOutcome'] !== 'under_funded' &&
    r['fundingOutcome'] !== 'partial'
  ) {
    return false;
  }

  // ⭐ STORY 11b.3a — THE NOMINEE BANK ACCOUNTS. ⚠ Checked BEFORE the appeal block's early `return
  // true`: putting it after would leave the whole array unvalidated on every drive that was never
  // reversed, which is most of them (the vacuous-leg shape, in a validator).
  if (!isNomineeBankAccounts(r['nomineeBankAccounts'])) return false;

  const rev = r['appealReversal'];
  if (rev === null) return true;
  if (typeof rev !== 'object') return false;
  const a = rev as Record<string, unknown>;
  if (a['reversedAtStage'] !== 1 && a['reversedAtStage'] !== 2 && a['reversedAtStage'] !== 3) {
    return false;
  }
  if (
    a['dispositionCategory'] !== 'new_evidence_presented' &&
    a['dispositionCategory'] !== 'procedural_correction' &&
    a['dispositionCategory'] !== 'reconsideration_on_merits'
  ) {
    return false;
  }
  return typeof a['reversedAt'] === 'string';
}

/**
 * ⭐ THE NOMINEE ACCOUNTS — Story 11b.3a (AC2, AC4), ⭐⛔ **REDUCED TO ONE FIELD BY STORY 11b.11.**
 *
 * ⛔⛔ **THIS CHECK IS FOR ABSENCE, ⛔ not merely for what the body carries — and 11b.11 makes it
 * MORE of that, ⛔ not less.**
 *
 * ⭐⛔ **WHAT IT CHECKED UNTIL 11b.11, kept as the record.** The wire was a
 * `z.discriminatedUnion('masked', …)`, so this function branched on `masked`: on the MASKED arm it
 * refused a body carrying `accountNumber`, `accountHolderName` or `vpa` (AC4 — *"the full value never
 * crosses the wire once masked"*) and checked `accountNumberLast4` against `^\d{4}$`, because a
 * longer string would be the reduction having silently not happened; on the FULL arm it required
 * `accountHolderName`, `accountNumber` and `vpa` to be PRESENT (⛔ not merely well-typed-if-present),
 * refused the masked arm's key, and validated `bankName` / `branch` / `ifsc`.
 *
 * ⭐⭐ `2026-09-04-190` **cl.1** (Trustee-ratified) and `2026-09-04-191` **cl.1** withdraw all five
 * coordinates from `public`; `-190` **cl.2** keeps the nominee's NAME. ⇒ both arms became identical
 * and 11b.11 **D1(b)** collapsed the wire. ⛔ There is no `masked` discriminator to branch on.
 * ⛔⛔ **MASKING WAS ⛔ NOT DELETED** (`-190` cl.4) — the machinery lives in `@twt/domain` and has
 * ⛔ NO PUBLIC CONSUMER. ⛔ Do ⛔ not read this simplification as masking having been removed.
 *
 * ⭐ **THE ABSENCE CHECK IS NOW UNCONDITIONAL, WHICH IS STRICTLY STRONGER:** every withdrawn key —
 * and the `masked` flag itself — is refused on EVERY account, in EVERY state, rather than on one arm
 * of a union. ⇒ a boundary regression that re-introduces any of them is caught AT THE PAGE rather
 * than published. ⚠ A `typeof === 'object'` check alone would let it straight through.
 *
 * ⚠ AT MOST TWO, matching the substrate's composite PK `{1, 2}`. ⛔ Not a page size and ⛔ not a
 * pagination affordance — see the contract's own note.
 */
function isNomineeBankAccounts(value: unknown): boolean {
  if (!Array.isArray(value) || value.length > 2) return false;
  for (const item of value) {
    if (typeof item !== 'object' || item === null) return false;
    const a = item as Record<string, unknown>;
    if (a['accountRank'] !== 1 && a['accountRank'] !== 2) return false;
    // ⛔⛔ THE WITHDRAWN KEYS, REFUSED UNCONDITIONALLY. ⛔ Absence, ⛔ not "null is fine": the
    // contract's `.strict()` shape has no key for any of these, so a body carrying one is a boundary
    // regression that would publish what `2026-09-04-190` cl.1 / `2026-09-04-191` cl.1 withdrew.
    // ⚠ `masked` is in the list because the wire may ⛔ not advertise a control it no longer
    // exercises (11b.11 D1(b)) — a body still carrying it is describing a shape nobody authored.
    for (const withdrawn of [
      'accountNumber',
      'accountNumberLast4',
      'ifsc',
      'vpa',
      'bankName',
      'branch',
      'masked',
    ]) {
      if (withdrawn in a) return false;
    }
    // ⛔ PRESENT, ⛔ not merely well-typed-if-present (review 2026-09-03). The contract REQUIRES this
    // key; a boundary regression that OMITS it (rather than sending `null`) is the exact "catch it at
    // the page rather than publish it" case this validator exists for, and a "well-typed if present"
    // check waves it straight through. ⭐ `null` is legal — a soft decrypt failure renders NOTHING.
    if (!('accountHolderName' in a)) return false;
    const holder = a['accountHolderName'];
    if (holder !== null && (typeof holder !== 'string' || holder.length === 0)) return false;
  }
  return true;
}
