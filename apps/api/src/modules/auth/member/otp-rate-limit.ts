// Member OTP send throttle (Story 3.2, Task 6, §2.11 line 3484).
//
// The AC requires OTP SEND throttled PER-PHONE (5 / 15-min window) keyed on the
// NORMALIZED MOBILE from the request body. @fastify/rate-limit's keyGenerator runs
// at `onRequest` — BEFORE body parsing — so the mobile is not yet available there
// (its perSessionKey works only because the session loads at onRequest). So the
// per-phone budget is enforced as a PRE-HANDLER (the body is parsed + validated by
// then), window-bucketed via Postgres (P31 / D4 — replaces the in-process Map, which
// was correct only for single-process deployments and had a global-counter reset bug).
//
// Independent budgets: a legit member on a fresh device must not be locked by an
// unrelated IP window (§2.2 line 1364-1367) — the per-phone budget keys on the phone.
// The global cap (independent budget, `__global__` key) is a bulk-attack tripwire.
//
// Why Postgres-backed: the in-process Map (P3/P4) had two bugs:
//   P3 — global counter incremented before the check, so rejected requests consumed
//         the global budget regardless.
//   P4 — bucket rotation reset globalCount to 0 without re-summing surviving per-phone
//         entries, allowing a burst at bucket boundaries.
// An atomic INSERT ... ON CONFLICT DO UPDATE resolves both: the DB is the single
// source of truth and increments are atomic even across concurrent requests / replicas.

import type { FastifyRequest, preHandlerHookHandler } from 'fastify';

import type { AppDeps } from '../../../context.js';
import { TooManyRequestsError } from '../../../http-errors.js';
import { normalizeMobile } from '../shared/mobile-index.js';

const GLOBAL_KEY = '__global__';
/** The global send cap is a generous multiple of the per-phone cap (bulk-attack tripwire). */
const GLOBAL_CAP_MULTIPLIER = 200;

/**
 * Build an OTP-send throttle keyed by `keyOf(request)`. The per-key budget is
 * `otpPerPhoneMax` per `otpPerPhoneWindowMs`; an independent global budget (the
 * `__global__` row) is the bulk-attack tripwire. Both increment atomically via the
 * Postgres bucket table (correct across concurrent requests + replicas).
 */
function makeOtpSendThrottle(
  deps: AppDeps,
  keyOf: (request: FastifyRequest) => string,
): preHandlerHookHandler {
  const windowMs = deps.config.otpPerPhoneWindowMs;
  const perPhoneMax = deps.config.otpPerPhoneMax;
  const globalMax = perPhoneMax * GLOBAL_CAP_MULTIPLIER;

  return async function preHandler(request: FastifyRequest): Promise<void> {
    const now = deps.clock().getTime();
    const bucket = Math.floor(now / windowMs);
    // expires_at is set conservatively to the end of the NEXT bucket so rows outlive
    // their window for audit purposes, then can be vacuumed by the expires_idx.
    const expiresAt = new Date((bucket + 2) * windowMs).toISOString();

    const phoneKey = keyOf(request);

    // Atomic increment: INSERT ... ON CONFLICT DO UPDATE returns the new count.
    // Both per-phone and global rows are incremented in parallel — a request
    // rejected for over-phone still increments the global counter (intentional:
    // spam on many phones still drains the global budget).
    const [phoneRow, globalRow] = await Promise.all([
      deps.pool.query<{ count: number }>(
        `INSERT INTO otp_rate_buckets (phone_key, bucket_epoch, count, expires_at)
           VALUES ($1, $2, 1, $3)
           ON CONFLICT (phone_key, bucket_epoch) DO UPDATE
             SET count = otp_rate_buckets.count + 1
           RETURNING count`,
        [phoneKey, bucket, expiresAt],
      ),
      deps.pool.query<{ count: number }>(
        `INSERT INTO otp_rate_buckets (phone_key, bucket_epoch, count, expires_at)
           VALUES ($1, $2, 1, $3)
           ON CONFLICT (phone_key, bucket_epoch) DO UPDATE
             SET count = otp_rate_buckets.count + 1
           RETURNING count`,
        [GLOBAL_KEY, bucket, expiresAt],
      ),
    ]);

    const phoneCount = phoneRow.rows[0]?.count ?? 1;
    const globalCount = globalRow.rows[0]?.count ?? 1;

    const overPhone = phoneCount > perPhoneMax;
    const overGlobal = globalCount > globalMax;
    if (overPhone || overGlobal) {
      deps.auditSink.emit({
        type: 'rate_limit.exceeded',
        actorId: null,
        traceId: request.requestContext?.traceId,
        context: {
          ip: request.ip,
          routeUrl: request.routeOptions?.url ?? null,
          scope: overPhone ? 'otp_per_phone' : 'otp_global',
        },
        at: deps.clock(),
      });
      throw new TooManyRequestsError(
        'Too many OTP requests. Please wait before retrying.',
        'rate_limit.exceeded',
      );
    }
  };
}

/**
 * Per-PHONE login-OTP send throttle (5 / 15-min). Keyed on the NORMALIZED MOBILE from
 * the request body (parsed by the pre-handler stage), falling back to the IP if absent.
 */
export function memberOtpSendThrottle(deps: AppDeps): preHandlerHookHandler {
  return makeOtpSendThrottle(deps, (request) => {
    const body = request.body as { mobile?: string } | undefined;
    return (body?.mobile ? normalizeMobile(body.mobile) : null) ?? request.ip;
  });
}

/**
 * Per-MEMBER step-up-OTP send throttle (PR-Patch-1). `/step-up/request` carries no
 * mobile in the body and runs behind `requireMemberSession`, so it is keyed on the
 * authenticated member id (namespaced `stepup:` so it never collides with a login
 * phone-key). Without this an authenticated token-holder could SMS-bomb the member,
 * bounded only by the global per-IP ceiling.
 */
export function memberStepUpSendThrottle(deps: AppDeps): preHandlerHookHandler {
  return makeOtpSendThrottle(deps, (request) => {
    const memberId = request.requestContext?.actorId;
    return memberId ? `stepup:${memberId}` : request.ip;
  });
}
