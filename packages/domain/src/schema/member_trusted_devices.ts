// `member_trusted_devices` — member trusted-device bindings (Story 3.2, Task 3).
//
// GLOBAL member-identity/auth carve-out (R2): device binding is decided at
// `/otp/verify`, before any Pariwar scope. Max 2 devices per member (§2.2 line
// 1337); binding a 3rd DROPS THE OLDEST (`bound_at`) + revokes its refresh chain.
// At login the OTP itself authorizes the replacement (R6) — there is no established
// session to step-up against; the §2.2 "3rd device requires step-up" applies to an
// active-session "manage devices" surface (later epic), not the initial login flow.
//
// `device_id` is the stable client-supplied identifier (§2.4 line 1421-1422 —
// hardware-backed where available, software fallback; we commit revocability +
// audit-on-rotation, not a specific mechanism). `pariwar_id` is INFORMATIONAL.

import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { MemberId, PariwarId } from '../ids/index.js';

export const memberTrustedDevices = pgTable(
  'member_trusted_devices',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Plain uuid (no FK to the RLS-forced `members`; this global table is pre-scope).
    memberId: uuid('member_id').$type<MemberId>().notNull(),

    // The stable client-supplied device identifier.
    deviceId: text('device_id').notNull(),

    // Informational only — the member's Pariwar at bind time. NOT an RLS key.
    pariwarId: uuid('pariwar_id').$type<PariwarId>(),

    deviceLabel: text('device_label'),

    boundAt: timestamp('bound_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // Device-cap scan + oldest-first eviction (`ORDER BY bound_at`).
    index('member_trusted_devices_member_idx').on(t.memberId),
    // One binding row per (member, device) — re-login on a bound device refreshes it.
    uniqueIndex('member_trusted_devices_member_device_uq').on(t.memberId, t.deviceId),
  ],
);

export type MemberTrustedDeviceRow = typeof memberTrustedDevices.$inferSelect;
export type MemberTrustedDeviceInsert = typeof memberTrustedDevices.$inferInsert;
