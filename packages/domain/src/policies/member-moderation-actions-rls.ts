// RLS policy declarations for `member_moderation_actions` — Story 10.10 (Task 2).
//
// TENANT-ISOLATED read + APPEND-ONLY write — mirrors `member-addresses-rls.ts` /
// `member-postings-rls.ts` (the append-only history posture), NOT the `member_withdrawals`
// single-row-per-member posture. There is deliberately NO DELETE policy: a recorded moderation
// decision is immutable.
//
// ── The ONE UPDATE leg, and why it does not break that (migration 0092, review follow-up) ────────
// `rationale_ciphertext` is Tier-1 PII, and 0091's SELECT+INSERT-only posture made it structurally
// UN-ERASABLE: an RTBF is a SOFT delete, so the `ON DELETE cascade` FK never fires, and with no
// UPDATE privilege the DPDPA scrub could not be written at all. 0092 therefore grants UPDATE on the
// RATIONALE COLUMN ONLY (a Postgres column-level privilege) plus the tenant-scoped policy below.
// The decision itself — `action`, `reason_code`, `actor_id`, `actor_display`, `rejoin_permitted_at`,
// `acted_at` — remains un-writable by the app role, so immutability holds exactly where it is
// load-bearing and is relaxed only where it collided with the member's erasure right.
//
// ── The signup rejoin-lock READ is NOT served by these policies ─────────────────────────────────
// The FR-56 → FR-6 rejoin check at signup runs PRE-scope on the BYPASSRLS `servicePool`
// (`member-auth.repo.ts`) — no `app.pariwar_id` is set there, so RLS is bypassed by design (the
// `resolveMembersByMobile` / `member_withdrawals` posture, unchanged). These policies govern only
// the in-scope moderation write + the in-scope admin reads.
//
// Uses Story 1.6's closed-failure construct (unset scope → '' → nullif → NULL → 0 rows, quiet
// fail-closed) — identical to `member-withdrawals-rls.ts`.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { memberModerationActions } from '../schema/member_moderation_actions.js';
import { appRole } from './_roles.js';

export const memberModerationActionsTenantIsolationSelect = pgPolicy(
  'member_moderation_actions_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberModerationActions);

export const memberModerationActionsTenantIsolationInsert = pgPolicy(
  'member_moderation_actions_tenant_isolation_insert',
  {
    as: 'permissive',
    for: 'insert',
    to: appRole,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberModerationActions);

/**
 * The DPDPA-RTBF rationale scrub ONLY (migration 0092). Tenant-scoped on BOTH legs, so an RTBF in
 * one Pariwar can never reach another's rows — and the column-level GRANT is what keeps this from
 * being a general edit capability over the decision record. See the header.
 */
export const memberModerationActionsTenantIsolationUpdate = pgPolicy(
  'member_moderation_actions_tenant_isolation_update',
  {
    as: 'permissive',
    for: 'update',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberModerationActions);
