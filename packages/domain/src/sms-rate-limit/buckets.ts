// Per-member transactional-SMS send rate-limit accessor — Story 5.6 (Task 5; Story 1.14 flood-control).
//
// The reusable, `Db`-based atomic bucket increment for `sms_rate_buckets`. There is NO existing domain-
// package accessor to mirror: the proven atomic-bucket logic lives in
// apps/api/src/modules/auth/member/otp-rate-limit.ts (`makeOtpSendThrottle`), which uses RAW `pg` pool
// queries embedded in a Fastify preHandler — NOT a reusable `Db`-based function. This is a FRESH domain-
// package design that PORTS that file's atomic INSERT … ON CONFLICT DO UPDATE shape (the only correct
// implementation across concurrent requests + replicas) into a transport-free primitive, using the same
// drizzle upsert-and-return idiom as validity-cache/epoch.ts's `bumpCohortEpoch`.
//
// SEPARATE budget by construction: this counter keys per MEMBER in the dedicated `sms_rate_buckets` table,
// so a transactional-alert-SMS flood can NEVER consume the security-critical OTP send budget (which lives in
// `otp_rate_buckets`, keyed per phone) — nor the reverse.

import { lt, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import { smsRateBuckets } from '../schema/sms_rate_buckets.js';

/** Inputs for one atomic budget check-and-consume. */
export interface CheckAndConsumeSmsBudgetInput {
  /** A MEMBER-scoped key (member id / blind index) — never a plaintext phone. */
  readonly memberKey: string;
  /** The rolling window width in ms (the bucket epoch = floor(now / windowMs)). */
  readonly windowMs: number;
  /** The maximum sends permitted per member per window. */
  readonly maxPerWindow: number;
  /** The current time (injected — never `Date.now()` inside, so callers/tests stay deterministic). */
  readonly now: Date;
}

/** The outcome of a check-and-consume: whether this send is within budget + the post-increment count. */
export interface SmsBudgetDecision {
  readonly allowed: boolean;
  /** The count AFTER this send's atomic increment (1 on the first send in the window). */
  readonly count: number;
  /** The window slot this send landed in (floor(now / windowMs)). */
  readonly bucketEpoch: number;
}

/**
 * Atomically consume one unit of a member's per-window SMS budget and report whether it was within budget.
 * The INSERT … ON CONFLICT DO UPDATE increments the `(member_key, bucket_epoch)` row by exactly one — even
 * under concurrent sends / multiple replicas — and returns the new count; `allowed` is `count <=
 * maxPerWindow`. The row is consumed (incremented) REGARDLESS of `allowed` so an over-budget burst can't be
 * masked by discarding the write (mirrors the otp-bucket "increment then decide" discipline).
 *
 * `expires_at` is set to the END OF THE NEXT bucket so the row outlives its window (for audit) before it can
 * be vacuumed by `sms_rate_buckets_expires_idx` (see `deleteExpiredSmsRateBuckets`).
 */
export async function checkAndConsumeSmsBudget(
  db: Db,
  input: CheckAndConsumeSmsBudgetInput,
): Promise<SmsBudgetDecision> {
  if (input.windowMs <= 0) throw new Error('checkAndConsumeSmsBudget: windowMs must be positive');
  if (input.maxPerWindow <= 0) throw new Error('checkAndConsumeSmsBudget: maxPerWindow must be positive');

  const nowMs = input.now.getTime();
  const bucketEpoch = Math.floor(nowMs / input.windowMs);
  // Conservatively outlive the window by one full bucket (mirrors otp-rate-limit.ts's `(bucket + 2)`).
  const expiresAt = new Date((bucketEpoch + 2) * input.windowMs);

  const rows = await db
    .insert(smsRateBuckets)
    .values({ memberKey: input.memberKey, bucketEpoch, count: 1, expiresAt })
    .onConflictDoUpdate({
      target: [smsRateBuckets.memberKey, smsRateBuckets.bucketEpoch],
      set: { count: sql`${smsRateBuckets.count} + 1` },
    })
    .returning({ count: smsRateBuckets.count });

  const count = rows[0]?.count ?? 1;
  return { allowed: count <= input.maxPerWindow, count, bucketEpoch };
}

/**
 * Vacuum expired rate-bucket rows: `DELETE FROM sms_rate_buckets WHERE expires_at < now`. There is no active
 * OTP-bucket vacuum job to wire into (the otp-bucket note documents periodic cleanup as sufficient at low
 * write volume), so this is exposed for a future periodic vacuum path to call; it is NOT wired to a job here.
 * Returns the number of rows removed.
 */
export async function deleteExpiredSmsRateBuckets(db: Db, now: Date): Promise<number> {
  const result = await db.delete(smsRateBuckets).where(lt(smsRateBuckets.expiresAt, now)).returning({
    memberKey: smsRateBuckets.memberKey,
  });
  return result.length;
}
