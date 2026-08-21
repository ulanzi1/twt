// The `apps/public` → `apps/api` directory client — Story 11a.3 (Task 5; AC1, AC6).
//
// ⭐ THE FIRST CROSS-APP HOP ON THIS SURFACE. Before this story `apps/public/src` contained ZERO
// `fetch(` calls. That is worth stating because it means every hazard below is new here, and none
// of it is covered by an existing pattern in this app.
//
// `*.server.ts` marks this server-only: it is never part of a client island's module graph.
//
// ── ⭐ WHY THE READ IS OVER HTTP AT ALL, RATHER THAN A LOCAL DB READ ────────────────────────────
// `2026-08-20-143` cl.1 (D1(a)). Capability, ⛔ not taste: rendering a member row needs a Tier-1 KYC
// decrypt (KMS deps), an anti-enumeration ceiling (a rate-limit store) and an abuse audit line (the
// BYPASSRLS service pool). `apps/public` has NONE of the three, and giving it the first would mean
// handing the internet-facing SSR process decrypt capability over a KEK shared by EVERY Tier-1 field
// class — mobile, device tokens, KYC. ⛔ Do not "simplify" this into a `withPublicScope` read.
//
// ── ⭐ AC1'S ABSENCE PROOF LIVES HERE ───────────────────────────────────────────────────────────
// ⛔ THIS MODULE, AND EVERY OTHER MODULE IN `apps/public`, IMPORTS NO ENCRYPTION SYMBOL AND HOLDS NO
// KEY REFERENCE OF ANY KIND. `tests/no-kms-in-public.test.ts` asserts that absence across the whole
// app, because an absence nobody checks is an absence that regresses.
// ⚠ That scan is deliberately NOT comment-stripped, so this comment names the forbidden tokens only
// by description — ⛔ writing them out here would trip the scan, which is the scan working.
//
// ── ⚠ TRAP 2 — THE FORWARDED ADDRESS IS NOT A NICETY ───────────────────────────────────────────
// This call is made SERVER-SIDE, so `apps/api` sees the SSR process's address on every request
// unless the visitor's own address is forwarded. `perSessionKey` falls through to `request.ip` for
// an unauthenticated caller, so without the header below **all directory traffic on earth shares
// one rate-limit bucket** and every abuse signal names the proxy. ⛔ Removing the forwarding does
// not break a single render — it silently deletes the anti-enumeration ceiling.

import type { PublicDirectoryResponse } from '@twt/contracts';

import { ACTIVE_PARIWAR_ID } from './pariwar.server.js';

/**
 * Where `apps/api` lives, from the environment.
 *
 * ⚠ VALIDATED AT MODULE LOAD, ⛔ NOT MID-REQUEST. A malformed origin must fail the boot, loudly,
 * rather than surface as a mysterious per-request failure state that looks like an outage.
 * Declared in `turbo.json` `globalEnv` beside `PUBLIC_PARIWAR_ID` / `PUBLIC_SITE_ORIGIN`.
 */
const DEFAULT_API_ORIGIN = 'http://127.0.0.1:3000';

export const API_ORIGIN: string = (() => {
  const raw = process.env.PUBLIC_API_ORIGIN ?? DEFAULT_API_ORIGIN;
  try {
    return new URL(raw).origin;
  } catch {
    throw new Error(
      `PUBLIC_API_ORIGIN is not a valid absolute URL: ${JSON.stringify(raw)}. ` +
        `⛔ The public Member Directory cannot render without an API origin, and a malformed one ` +
        `must fail at boot rather than mid-request.`,
    );
  }
})();

/**
 * How long to wait before giving up.
 *
 * ⛔ ONE ATTEMPT, NO RETRY. A retry storm on a public page turns a slow API into a self-inflicted
 * outage — every visitor multiplying load on the thing that is already struggling. The dignified
 * failure state below is the correct answer, ⛔ not a second request.
 */
const REQUEST_TIMEOUT_MS = 4000;

/** What the page gets back. ⚠ `ok: false` is an OUTAGE, ⛔ never "the directory is empty". */
export type DirectoryFetchResult =
  | { readonly ok: true; readonly data: PublicDirectoryResponse }
  | { readonly ok: false; readonly reason: 'unreachable' | 'timeout' | 'bad_response' };

export interface DirectoryFetchOptions {
  page: number;
  limit: number;
  /**
   * The visitor's address as THIS process observed it (`Astro.clientAddress`), from
   * {@link buildForwardedFor}. ⛔ NOT the inbound `X-Forwarded-For` chain, which is caller-supplied
   * and therefore forgeable — see that function's header.
   *
   * ⚠ REQUIRED, and required EXPLICITLY: an optional parameter here would make the safe-looking
   * call site the one that silently collapses every visitor into one rate-limit bucket.
   * `null` means "no address observed" ⇒ the header is OMITTED, ⛔ never sent empty.
   */
  forwardedFor: string | null;
}

/**
 * Build the `X-Forwarded-For` value to send onward.
 *
 * ⭐ SENDS ONLY THE VISITOR ADDRESS THIS PROCESS OBSERVED. ⛔ The inbound chain is DISCARDED, never
 * appended to. `2026-08-21-145` cl.2.
 *
 * ── ⛔ WHY THE STANDARD LOSES TO THE THREAT MODEL HERE ────────────────────────────────────────
 * This function previously APPENDED the observed address to the inbound chain, reasoning that
 * appending "is the standard's own semantics" and that dropping upstream hops discards information
 * an operator might want. Both statements are true, and together they were a security hole:
 *
 *   · `apps/api` runs `trustProxy: true`, under which `request.ip` resolves to the **LEFTMOST**
 *     entry of `X-Forwarded-For` — VERIFIED, not assumed: `@fastify/proxy-addr` under trust-all
 *     over `'1.2.3.4, 9.9.9.9'` returns `1.2.3.4`.
 *   · The inbound chain on a public SSR request is whatever the BROWSER chose to send.
 *   ⇒ appending put an ATTACKER-CHOSEN value in the position `apps/api` keys on. One header —
 *     `X-Forwarded-For: 10.0.0.<n>`, rotated per request — gave every request a fresh rate-limit
 *     bucket AND a fresh abuse-counter window, defeating AC6.3, AC6.4 and Trap 2 at once, and
 *     thrashing `MAX_TRACKED_KEYS` so genuine visitors' counters were evicted.
 *
 * ⛔ This is NOT the deferred "someone calls `apps/api` directly, bypassing the SSR hop" item —
 * that one is an infra control (network ACL / mTLS) and does not touch this path. This attack goes
 * THROUGH the legitimate hop, so no network control at the boundary can see it.
 *
 * ⛔ `trustProxy` is NOT the fix and is deliberately untouched (Trap 3: a global is not re-tuned on
 * a surface story). The fix is to stop feeding it a value the caller controls.
 *
 * ⚠ The discarded-hops cost is REAL and accepted: when a genuine CDN/proxy sits in front of
 * `apps/public`, `Astro.clientAddress` is that proxy and the true client address is lost to
 * `apps/api`. That is a KNOWN LIMIT of running the anti-enumeration key off this process's own
 * observation, and it is the tradeoff the ruling took — a key we can trust that is sometimes too
 * coarse beats a key that is precise and forgeable. Re-examine when a CDN is actually configured
 * (the same trigger as Trap 4's edge-cache dependency).
 *
 * ⛔ RETURNS `null`, NEVER `''`, when there is no address to send. An empty header reads to
 * `proxy-addr` as "no chain", so it falls back to the socket address — the SSR process itself —
 * collapsing every such visitor into ONE bucket: precisely the failure this module exists to
 * prevent, arriving silently. The caller must OMIT the header rather than send an empty one.
 *
 * PURE — exported so it is testable without a server.
 */
export function buildForwardedFor(
  clientAddress: string | null | undefined,
): string | null {
  const client = (clientAddress ?? '').trim();
  return client.length > 0 ? client : null;
}

/**
 * Fetch one page of the public Member Directory.
 *
 * ⛔ NEVER THROWS. A public page must not 500 because an upstream is slow — it renders the outage
 * state, which the caller is required to present as an OUTAGE and ⛔ never as an empty membership.
 */
export async function fetchMemberDirectory(
  opts: DirectoryFetchOptions,
): Promise<DirectoryFetchResult> {
  const url = new URL(
    `/api/v1/p/${ACTIVE_PARIWAR_ID}/public-pages/member-directory`,
    API_ORIGIN,
  );
  url.searchParams.set('page', String(opts.page));
  url.searchParams.set('limit', String(opts.limit));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        // ⭐ TRAP 2. ⛔ Do not remove: without this the rate limit and every abuse signal key on
        // the SSR proxy, and one global bucket protects nobody.
        // ⚠ OMITTED when null, ⛔ never sent as an empty string — an empty header reads to
        // `proxy-addr` as "no chain" and falls back to the socket address (the SSR process),
        // which is the exact collapse this header exists to prevent, arriving silently.
        ...(opts.forwardedFor !== null ? { 'x-forwarded-for': opts.forwardedFor } : {}),
      },
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, reason: 'bad_response' };

    const body = (await res.json()) as unknown;
    if (!isDirectoryResponse(body)) return { ok: false, reason: 'bad_response' };
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
 * against is a MALFORMED or wrong-shaped body (a proxy error page, an HTML 502), ⛔ not a
 * contract violation the API-side schema already rejects.
 */
function isDirectoryResponse(body: unknown): body is PublicDirectoryResponse {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  if (!Array.isArray(b['items'])) return false;
  if (typeof b['page'] !== 'number' || typeof b['limit'] !== 'number') return false;
  if (typeof b['total'] !== 'number') return false;
  return b['items'].every((row: unknown) => {
    if (typeof row !== 'object' || row === null) return false;
    const r = row as Record<string, unknown>;
    return (
      typeof r['name'] === 'string' &&
      (r['district'] === null || typeof r['district'] === 'string') &&
      (r['status'] === 'active' || r['status'] === 'waiting-period')
    );
  });
}
