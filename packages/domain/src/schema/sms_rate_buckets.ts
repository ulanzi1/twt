// `sms_rate_buckets` — Postgres-backed per-MEMBER transactional-SMS send rate counter
// (Story 5.6, Task 5; Story 1.14 flood-control). Mirrors `otp_rate_buckets` exactly —
// the same atomic INSERT ... ON CONFLICT DO UPDATE bucket pattern — but keyed per
// MEMBER (`member_key`), and DELIBERATELY SEPARATE from the OTP buckets.
//
// Why a SEPARATE table (do NOT share otp_rate_buckets): a transactional-alert-SMS flood
// must NEVER consume the security-critical OTP send budget (and vice-versa). Sharing the
// counter would let a burst of fallback alert SMS exhaust the budget a member needs to
// receive a login / step-up OTP — a security regression. Two tables = two independent
// budgets, by construction.
//
// Keyed on `(member_key, bucket_epoch)` where:
//   member_key   = a member-scoped key (member id / blind index) — NOT a plaintext phone.
//   bucket_epoch = Math.floor(now / windowMs) — the window slot.
// `expires_at` is set to the end of the next bucket so rows can be vacuumed by the
// expires_idx after they are no longer needed. No TTL trigger is wired here; a periodic
// DELETE WHERE expires_at < now() is sufficient (low write volume — mirrors the otp-bucket note).

import { bigint, index, integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

export const smsRateBuckets = pgTable(
  'sms_rate_buckets',
  {
    memberKey: text('member_key').notNull(),
    bucketEpoch: bigint('bucket_epoch', { mode: 'number' }).notNull(),
    count: integer('count').notNull().default(1),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.memberKey, t.bucketEpoch] }),
    // Cleanup scan: DELETE FROM sms_rate_buckets WHERE expires_at < now().
    index('sms_rate_buckets_expires_idx').on(t.expiresAt),
  ],
);
