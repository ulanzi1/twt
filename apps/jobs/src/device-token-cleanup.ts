// Push device-token stale/invalid cleanup cron — Story 5.2 (Task 5; AC5).
//
// A Class C pg-boss cron that prunes `member_device_tokens` rows that are `stale` past 7d or `invalid`
// past 30d (provisional operational defaults — NOT policy- or legal-derived; may be revised in the
// retention-matrix review). Reclaims dead Tier-1 ciphertext for tokens the app-open rebuild superseded or
// a Firebase not-registered error killed. Runs on the BYPASSRLS service `pool` cross-tenant
// (member_device_tokens is FORCE-RLS), a single idempotent DELETE.
//
// Mirrors registerDigiLockerCertRefreshCron's REGISTRATION shape (createQueue → work → schedule in IST);
// the retention logic differs (that job is a refresh/upsert, this is a prune). "Class C" is
// architecture.md's classification (§1.4), not a literal string in this file.

import { deviceToken } from '@twt/domain';
import { QUEUE_NAMES, type QueueClient, type Job } from '@twt/queue';
import type pg from 'pg';

/** Default daily cadence (IST) — operations policy, overridable via env. */
export const DEFAULT_DEVICE_TOKEN_CLEANUP_CRON = '15 3 * * *'; // 03:15 IST daily
export const DEVICE_TOKEN_CLEANUP_TZ = 'Asia/Kolkata';

export interface DeviceTokenCleanupDeps {
  /** BYPASSRLS service pool (cross-tenant DELETE). */
  readonly pool: pg.Pool;
  /** Prune `stale` tokens older than this many seconds (default 7d). Must be >= 0. */
  readonly staleMaxAgeSeconds?: number;
  /** Prune `invalid` tokens older than this many seconds (default 30d). Must be >= 0. */
  readonly invalidMaxAgeSeconds?: number;
}

/** The worker body: a single idempotent prune. Returns the number of rows deleted. */
export async function runDeviceTokenCleanup(deps: DeviceTokenCleanupDeps): Promise<number> {
  const staleMaxAgeSeconds = deps.staleMaxAgeSeconds ?? deviceToken.DEVICE_TOKEN_STALE_MAX_AGE_SECONDS;
  const invalidMaxAgeSeconds = deps.invalidMaxAgeSeconds ?? deviceToken.DEVICE_TOKEN_INVALID_MAX_AGE_SECONDS;
  // A 0/negative override would purge fresh or ALL tokens (age comparisons against `now() - 0 seconds`
  // match everything) — reject it here rather than silently over-pruning.
  if (staleMaxAgeSeconds < 0 || invalidMaxAgeSeconds < 0) {
    throw new RangeError(
      `[jobs] device-token-cleanup: staleMaxAgeSeconds/invalidMaxAgeSeconds must be >= 0 (got ${staleMaxAgeSeconds}, ${invalidMaxAgeSeconds})`,
    );
  }
  return deviceToken.purgeExpiredDeviceTokens(deps.pool, staleMaxAgeSeconds, invalidMaxAgeSeconds);
}

/**
 * Register the device-token cleanup queue + worker + cron on the pg-boss client. Mirrors the
 * DIGILOCKER_CERT_REFRESH registration in boot.ts.
 */
export async function registerDeviceTokenCleanupCron(
  boss: QueueClient,
  deps: DeviceTokenCleanupDeps,
  opts: { cron?: string; tz?: string } = {},
): Promise<void> {
  const cron = opts.cron ?? DEFAULT_DEVICE_TOKEN_CLEANUP_CRON;
  const tz = opts.tz ?? DEVICE_TOKEN_CLEANUP_TZ;
  await boss.createQueue(QUEUE_NAMES.DEVICE_TOKEN_CLEANUP);
  await boss.work(QUEUE_NAMES.DEVICE_TOKEN_CLEANUP, async (jobs: Job[]) => {
    try {
      const deleted = await runDeviceTokenCleanup(deps);
      console.info('[jobs] device-token-cleanup', JSON.stringify({ jobs: jobs.length, deleted }));
      return { deleted };
    } catch (err) {
      // Surface the failure explicitly (pg-boss's retry/failure handling reads the thrown error) rather
      // than letting an unhandled rejection inside the worker callback fail ambiguously.
      console.error('[jobs] device-token-cleanup failed', err);
      throw err;
    }
  });
  await boss.schedule(QUEUE_NAMES.DEVICE_TOKEN_CLEANUP, cron, {}, { tz });
}
