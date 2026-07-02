// RLS policy declarations for `member_withdrawals` — Story 3.10 (Task 1).
//
// TENANT-ISOLATED read + write — mirrors `member-addresses-rls.ts` / `member-kyc-profiles-rls.ts`,
// NOT the global identity-auth carve-out. A member's withdrawal record belongs to exactly one
// Pariwar; the in-scope confirm write runs under that Pariwar's `app.pariwar_id`.
//
// ── DEVIATION from the append-only Life Events tables ─────────────────────────────────────────────
// The migration GRANT is SELECT + INSERT + UPDATE (contrast member_addresses/member_postings, which
// are INSERT-only immutable history). UPDATE is permitted because the `aadhaar_hmac` seam column is
// designed to be backfilled by a later UPDATE (Story 3.3a) and RTBF/anonymization (Story 3.12) may
// touch the row. The `for: 'all'` write policy already covers INSERT + UPDATE; the migration GRANT is
// what actually widens the privilege beyond the append-only tables.
//
// ── The signup rejoin-lock READ is NOT served by these policies ──────────────────────────────────
// The rejoin check at signup runs PRE-scope on the BYPASSRLS servicePool (member-auth.repo.ts) — no
// `app.pariwar_id` is set there, so RLS is bypassed by design (the resolveMembersByMobile posture).
// These policies govern only the in-scope confirm write + any in-scope read.
//
// Uses Story 1.6's closed-failure construct (unset scope → '' → nullif → NULL → 0 rows, quiet
// fail-closed) — identical to `member-addresses-rls.ts`.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { memberWithdrawals } from '../schema/member_withdrawals.js';
import { appRole } from './_roles.js';

export const memberWithdrawalsTenantIsolationSelect = pgPolicy(
  'member_withdrawals_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberWithdrawals);

export const memberWithdrawalsTenantIsolationWrite = pgPolicy(
  'member_withdrawals_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberWithdrawals);
