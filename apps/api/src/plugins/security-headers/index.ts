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

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';

/** The HTTP-header form of the noindex directive (FR-92). */
export const X_ROBOTS_TAG_VALUE = 'noindex, nofollow';

/**
 * Synthetic bot-bait paths. A legitimate client (the admin SPA, the generated
 * api-client) never requests these — they target common scanner fingerprints
 * (WordPress, phpMyAdmin, dotfiles). Kept OUT of the OpenAPI doc (`schema.hide`)
 * and exempt from the forced-pagination + login-wall guards by allowlist.
 */
export const HONEYPOT_PATHS = [
  '/wp-login.php',
  '/wp-admin',
  '/xmlrpc.php',
  '/.env',
  '/admin.php',
  '/phpmyadmin',
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

/** Emit the abuse signal + return a benign 200 that does not reveal the trap. */
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
