// Security-headers + honeypot plugin (Story 1.14, AC-4 — FR-92).
//
// ── Source-tree variance (deliberate, recorded) ───────────────────────────────
// The architecture source tree (L4255-4280) lists plugins/{zod-openapi,swagger,
// session,jwt,rate-limit,cookie} + middleware/{...} but NO honeypot / security-
// headers home. This plugin is a DELIBERATE source-tree variance — the same class
// as `packages/edge` in Story 1.13 (recorded in ADR-0010 + completion notes). It is
// recorded in the Story 1.14 completion notes + Project Structure Notes.
//
// Two concerns:
//   1. X-Robots-Tag noindex header — a global onRequest hook stamping
//      `X-Robots-Tag: noindex, nofollow` on EVERY response (see the hook for why
//      onRequest, not onSend). This is the HTTP-header form FR-92 names — stronger
//      than, and complementary to, the `<meta name="robots">` already in
//      apps/admin/index.html:7 (that only covers the SPA shell; the header covers
//      every API/admin response, including JSON, 404s, and errors, which crawlers
//      also see).
//   2. Honeypot routes — synthetic paths a legitimate client never requests,
//      advertised only as bot-bait. A hit returns a BENIGN response (so the trap
//      does not tip off the scanner) and emits an `abuse.honeypot` audit signal via
//      the existing Story 1.10 hash-chain seam. Naturally rare → one line per hit
//      (no dedupe; unlike rate_limit.exceeded). The global per-IP ceiling is the
//      backstop against a bot hammering a trap.
//
// ── ⛔ WHAT A HONEYPOT HIT DOES **NOT** PROVE (Story 11a.4, AC4) ───────────────
// Recorded here because a surface that overstates its reach is worse than one that
// admits its gaps — the overstatement is what stops anyone closing them.
//
//   (1) ⛔ A HIT IS A **SIGNAL**, ⛔ NOT AN ENFORCEMENT. Nothing is blocked, rate-
//       limited, or denied as a consequence of a hit. The line lands in the audit
//       chain and that is ALL that happens. ⛔ Do not describe these routes as
//       "blocking" or "stopping" scrapers.
//
//   (2) ⛔ THE RECORDED `ip` IS **CALLER-SUPPLIED**, SO IT IS ⛔ **NOT EVIDENCE**.
//       `honeypotHandler` reads `request.ip`; apps/api runs `trustProxy: true`
//       (server.ts), under which `request.ip` resolves to the LEFTMOST
//       `X-Forwarded-For` entry. ⛔ Nothing proxies these paths — a scanner reaches
//       them DIRECTLY — so it can set that header itself, and rotating it defeats
//       both per-IP correlation and the per-IP rate-limit ceiling.
//       ⇒ ⛔ NEVER write that this plugin "flags scraping IPs". It records a
//       caller-chosen string next to a real event.
//       ⚠ Same defect class as Decision 2026-08-21-145 cl.2 (the `/members`
//       X-Forwarded-For finding). ⛔ The fix there — apps/public forwarding only
//       `Astro.clientAddress` and discarding the inbound chain — does ⛔ NOT reach
//       these paths, because nothing proxies them.
//       ⛔ `trustProxy` is ⛔ NOT re-tuned to fix this: that would alter `request.ip`
//       and origin checks for EVERY route in the app (Decision 2026-08-20-143 cl.9's
//       standing fence).
//
//   ⚠ AND A PRECONDITION THAT IS STILL OPEN: whether apps/api is internet-reachable
//   at all is the open network-topology question carried in
//   _bmad-output/implementation-artifacts/deferred-work.md — which states in terms
//   that it and the IP-provenance limit ⛔ must be answered TOGETHER, not twice.
//   Until it is answered, a zero hit-count proves ⛔ nothing about scanner activity.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';

/** The HTTP-header form of the noindex directive (FR-92). */
export const X_ROBOTS_TAG_VALUE = 'noindex, nofollow';

/**
 * Synthetic bot-bait paths. A legitimate client (the admin SPA, the generated
 * api-client) never requests these — they are advertised only as bot-bait.
 *
 * Two families, kept DISTINCT because they fingerprint different intents:
 *   • CMS-scanner bait (Story 1.14) — WordPress, phpMyAdmin, dotfiles. A generic
 *     vulnerability sweep.
 *   • Contact/PII-export bait (Story 11a.4, AC4) — paths a scraper hunting a
 *     CONTACT LIST or a member export would probe. This is the FR-93 channel-
 *     integrity concern: harvesting the trust's contact details invites spam that
 *     could degrade a helpline grieving families depend on. ⚠ That is a
 *     CHANNEL-INTEGRITY concern, ⛔ NOT a privacy one — ⛔ no member contact field
 *     is public on any surface, and ⛔ these routes serve no data at all.
 *
 * ⚠ Kept OUT of the OpenAPI doc via `schema: { hide: true }`.
 *
 * ⛔ CORRECTION (Story 11a.4): this comment used to say these paths are "exempt
 * from the forced-pagination + login-wall guards by allowlist". That is right for
 * the LOGIN-WALL guard (login-wall.spec.ts derives its allowlist from this array)
 * and ⛔ WRONG for the forced-pagination guard: that guard walks the OpenAPI
 * surface, and `hide: true` keeps these routes out of it entirely. The guard never
 * sees them, so there is ⛔ nothing to exempt and ⛔ no allowlist involved.
 *
 * ⚠ BOTH consumers DERIVE from this array (login-wall.spec.ts:120 maps it;
 * security-headers.spec.ts asserts against its `.length`), so adding a path needs
 * ⛔ NO allowlist edit anywhere. If a spec turns red on an addition, fix the
 * DERIVATION — ⛔ never hardcode a parallel list.
 */
export const HONEYPOT_PATHS = [
  // ── CMS-scanner fingerprints (Story 1.14) ──────────────────────────────────
  '/wp-login.php',
  '/wp-admin',
  '/xmlrpc.php',
  '/.env',
  '/admin.php',
  '/phpmyadmin',
  // ── Contact / PII-export harvesting bait (Story 11a.4, AC4) ────────────────
  // ⚠ These serve the SAME bare `{status: 'ok'}` as every path above — ⛔ NOT a
  // plausible fake contact payload. D4 = (a): the value of a honeypot is the audit
  // signal, ⛔ not the payload, and a fabricated phone/email in a response body
  // would trip this project's own naked-PII discipline if it ever reached a
  // scanned render.
  '/staff-directory.csv',
  '/contacts.json',
  '/member-contacts.xlsx',
  '/members/export',
  '/api/v1/members/emails',
] as const;

/**
 * Stamp `X-Robots-Tag: noindex, nofollow` on every response.
 *
 * ── Why onRequest, not onSend (FR-92 says "header"; the hook phase is ours) ────
 * The header is response-body-independent, so setting it at onRequest is correct and
 * STRICTLY safer than onSend. An async onSend hook introduces a microtask hop in the
 * send pipeline, which the existing logout handler's `void reply.status(204).send()`
 * (a fire-and-forget send from an async handler that returns void) turns into a
 * DOUBLE-SEND → ERR_HTTP_HEADERS_SENT. onRequest runs before anything is sent, so the
 * header lands on the reply (and persists through 204s, 404s, the 429 envelope, and
 * 500s) with zero send-pipeline interaction. This is the "load-bearing regression"
 * trap Story 1.14 Dev Notes flagged — avoided by construction, not patched after.
 * Registered before rate-limit (server.ts) so even a 429 carries the header.
 */
export function registerSecurityHeaders(app: FastifyInstance): void {
  app.addHook('onRequest', (_request, reply, done) => {
    void reply.header('X-Robots-Tag', X_ROBOTS_TAG_VALUE);
    done();
  });
}

/**
 * Emit the abuse signal + return a benign 200 that does not reveal the trap.
 *
 * ⚠ `request.ip` is recorded because it is the best available correlator, ⛔ not
 * because it is trustworthy. Under `trustProxy: true` on an unproxied path it is
 * CALLER-SUPPLIED — see limit (2) in this module's header. Treat an `abuse.honeypot`
 * line as evidence that a probe HAPPENED, ⛔ never as evidence of WHO sent it.
 */
function honeypotHandler(deps: AppDeps) {
  return function handler(request: FastifyRequest, reply: FastifyReply): FastifyReply {
    deps.auditSink.emit({
      type: 'abuse.honeypot',
      actorId: request.session?.userId ?? null,
      traceId: request.requestContext?.traceId,
      context: {
        ip: request.ip,
        path: request.url,
        method: request.method,
        // user-agent is non-secret + useful for fingerprinting the scanner.
        userAgent: request.headers['user-agent'] ?? null,
      },
      at: deps.clock(),
    });
    return reply.status(200).send({ status: 'ok' });
  };
}

/**
 * Register the honeypot trap routes. Hidden from the OpenAPI doc; each emits
 * `abuse.honeypot` on a hit. Registered for GET (the method scanners probe with).
 */
export function registerHoneypot(app: FastifyInstance, deps: AppDeps): void {
  const handler = honeypotHandler(deps);
  for (const path of HONEYPOT_PATHS) {
    app.get(path, { schema: { hide: true } }, handler);
  }
}
