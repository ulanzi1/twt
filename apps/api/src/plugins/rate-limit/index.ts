// @fastify/rate-limit registration (AC-5 + the §2.2 "rate-limited per actor + per
// IP" discipline for step-up + the §2.11 Layer-2 per-endpoint policy, Story 1.14).
//
// Three concerns, one registration:
//   1. A permissive GLOBAL per-IP ceiling (defense-in-depth against scripted abuse).
//   2. NAMED per-endpoint thresholds (read/search/write — write stricter than read,
//      §2.11) keyed PER-SESSION (session actor when present, else IP). Routes opt in
//      with `config: { rateLimit: named.read }` — mirrors the LOGIN_RATE / stepUpRate
//      inline shape, but centralised so the ceilings have one home.
//   3. A GLOBAL audit emit on every trip (`rate_limit.exceeded`) + an ErrorResponse
//      envelope on the 429.
//
// ── Inheritance (verified) ────────────────────────────────────────────────────
// @fastify/rate-limit merges a per-route `config.rateLimit` over the global params
// with `Object.assign({}, global, routeConfig)` (mergeParams), so a per-route limit
// INHERITS the global `onExceeded` + `errorResponseBuilder` it does not override.
// One global wiring therefore covers the login / step-up / audit-list per-route
// limits too — proven by rate-limit.spec.ts (a per-route trip fires the global
// audit emit). NB: `ban` does NOT inherit (mergeParams resets it per route).
//
// ── Audit-flood avoidance (CR-B-1 precedent) ──────────────────────────────────
// A tripped limit can reject many requests in a window; @fastify/rate-limit calls
// `onExceeded` on EACH rejected request. We emit ONE `rate_limit.exceeded` line per
// key-per-window via a window-bucketed Map (lazily pruned) so the trail stays
// queryable for anomaly detection.
//
// ── KEY CAVEAT: in-memory store is PER-INSTANCE (no Redis, §1.4) ───────────────
// The default store is in-memory; with a future multi-instance deploy the effective
// ceiling is `max × instanceCount`. Acceptable for the bootstrap primitive
// (Cloudflare Layer-1 is the real cross-instance IP limiter; these are bootstrap
// ceilings). Distributed store is a deferred item at the Add-Redis trigger.

import fastifyRateLimit from '@fastify/rate-limit';
import type { FastifyContextConfig, FastifyInstance, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { ForbiddenError, TooManyRequestsError } from '../../http-errors.js';

/** A concrete per-route rate-limit config (the non-`false` arm of the route config). */
export type RouteRateLimit = Exclude<FastifyContextConfig['rateLimit'], false | undefined>;

/**
 * Per-session keyGenerator: the session actor when authenticated, else the IP. The
 * rate-limit hook runs AFTER @fastify/session (server.ts order), so `request.session`
 * is loaded — same ordering the step-up per-actor keyGen relies on.
 */
export function perSessionKey(request: FastifyRequest): string {
  return request.session?.userId ?? request.ip;
}

/** The named per-endpoint thresholds (read/search/write), all per-session-keyed. */
export interface NamedRateLimits {
  readonly read: RouteRateLimit;
  readonly search: RouteRateLimit;
  readonly write: RouteRateLimit;
}

/**
 * Build the named-threshold registry from config. Routes set
 * `config: { rateLimit: named.read }` instead of inline literals. Only `max` /
 * `timeWindow` / `keyGenerator` are set here — `onExceeded` + `errorResponseBuilder`
 * are inherited from the global registration (see header).
 */
export function namedRateLimits(deps: AppDeps): NamedRateLimits {
  const timeWindow = '1 minute';
  return {
    read: { max: deps.config.readRateMax, timeWindow, keyGenerator: perSessionKey },
    search: { max: deps.config.searchRateMax, timeWindow, keyGenerator: perSessionKey },
    write: { max: deps.config.writeRateMax, timeWindow, keyGenerator: perSessionKey },
  };
}

const WINDOW_MS = 60_000; // matches the '1 minute' timeWindow

/**
 * Build the global `onExceeded` audit emitter. Emits ONE `rate_limit.exceeded`
 * audit line per key-per-window (CR-B-1 dedupe) through the existing
 * `deps.auditSink.emit` seam (Story 1.10 hash-chain). The dedupe Map is lazily
 * pruned so memory stays bounded under sustained abuse.
 */
function makeRateLimitAuditEmitter(deps: AppDeps): (request: FastifyRequest, key: string) => void {
  const emitted = new Map<string, number>(); // bucketKey → emit epoch-ms (for pruning)
  return function onExceeded(request: FastifyRequest, key: string): void {
    const now = deps.clock().getTime();
    const bucketKey = `${key}:${Math.floor(now / WINDOW_MS)}`;
    if (emitted.has(bucketKey)) return; // already audited this key this window
    emitted.set(bucketKey, now);
    // Lazy prune: evict entries from windows two-or-more ago.
    for (const [k, t] of emitted) {
      if (now - t > WINDOW_MS * 2) emitted.delete(k);
    }
    deps.auditSink.emit({
      type: 'rate_limit.exceeded',
      actorId: request.session?.userId ?? null,
      traceId: request.requestContext?.traceId,
      context: {
        ip: request.ip,
        routeUrl: request.routeOptions?.url ?? null,
        key,
      },
      at: deps.clock(),
    });
  };
}

export async function registerRateLimit(app: FastifyInstance, deps: AppDeps): Promise<void> {
  await app.register(fastifyRateLimit, {
    global: true,
    max: deps.config.globalRateMax,
    timeWindow: '1 minute',
    // Inherited by per-route limits (see header) — one audit + one envelope wiring.
    onExceeded: makeRateLimitAuditEmitter(deps),
    // The 429 body must match the project ErrorResponse envelope. Returning an
    // ApiError instance lets the existing errorMappingHandler stamp the
    // status + `{ error: { code, message, request_id } }` (request_id = traceId).
    errorResponseBuilder: (_request, context) => {
      const message = `Rate limit exceeded. Retry after ${context.after}.`;
      return context.ban
        ? new ForbiddenError(message, 'rate_limit.banned')
        : new TooManyRequestsError(message, 'rate_limit.exceeded');
    },
  });
}
