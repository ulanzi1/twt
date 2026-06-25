// `otp_rate_buckets` — Postgres-backed per-phone OTP send rate counter (Story 3.2,
// patch P31 / D4). Replaces the in-process Map in otp-rate-limit.ts, which was
// process-local (incorrect for multi-replica) and had a global-counter reset bug on
// bucket rotation (P4). The atomic INSERT ... ON CONFLICT DO UPDATE ensures each
// request increments exactly once, even under concurrent load.
//
// Keyed on `(phone_key, bucket_epoch)` where:
//   phone_key   = normalized mobile or `__global__` for the global cap row.
//   bucket_epoch = Math.floor(Date.now() / windowMs) — the window slot.
// `expires_at` is set to the end of the next bucket so rows can be vacuumed by the
// expires_idx after they are no longer needed. No TTL trigger is wired here; periodic
// DELETE WHERE expires_at < now() is sufficient (low write volume).

import { bigint, index, integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

export const otpRateBuckets = pgTable(
  'otp_rate_buckets',
  {
    phoneKey: text('phone_key').notNull(),
    bucketEpoch: bigint('bucket_epoch', { mode: 'number' }).notNull(),
    count: integer('count').notNull().default(1),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.phoneKey, t.bucketEpoch] }),
    // Cleanup scan: DELETE FROM otp_rate_buckets WHERE expires_at < now().
    index('otp_rate_buckets_expires_idx').on(t.expiresAt),
  ],
);
