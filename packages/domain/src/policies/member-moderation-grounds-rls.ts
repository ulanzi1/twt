// RLS policy declarations for `member_moderation_grounds` — Story 10.20 (Task 4; WS-E).
//
// TENANT-ISOLATED read + APPEND-ONLY write, mirroring `member-moderation-actions-rls.ts`. There is
// deliberately NO DELETE policy: a recorded ground is immutable, exactly as the decision it attaches
// to is.
//
// ── The ONE UPDATE leg, and why it does not break that ──────────────────────────────────────────
// `note_ciphertext` is Tier-1 PII — admin-authored prose about what a member allegedly did. On the
// sibling table this was learned the hard way: 0091 shipped SELECT+INSERT-only, which made the
// rationale structurally UN-ERASABLE (an RTBF is a SOFT delete, so the `ON DELETE cascade` FK never
// fires, and with no UPDATE privilege the DPDPA scrub could not be written at all), and 0092 had to
// come back and fix it. This table therefore ships the narrow UPDATE leg AT BIRTH: a column-level
// `GRANT UPDATE ("note_ciphertext")` plus the tenant-scoped policy below.
//
// Everything else about the ground — `code`, `is_primary`, `supersedes_ground_id`, `added_by`,
// `added_by_display`, `added_at` — stays un-writable by the app role, so the append-only guarantee
// holds exactly where it is load-bearing and is relaxed only where it collided with the member's
// erasure right. In particular the column-level grant is what keeps the PRIMARY ground immutable:
// clearing `is_primary` would need an UPDATE privilege that does not exist.
//
// ── No `twt_service` leg at all ─────────────────────────────────────────────────────────────────
// Unlike `member_moderation_actions`, this table has no pre-scope reader. The signup rejoin guard
// reads `action` and `rejoin_permitted_at` from the ACTIONS table on the BYPASSRLS service pool and
// has no business here, so `twt_service` gets nothing — not even SELECT.
//
// Uses Story 1.6's closed-failure construct (unset scope → '' → nullif → NULL → 0 rows, quiet
// fail-closed) — identical to `member-moderation-actions-rls.ts`.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { memberModerationGrounds } from '../schema/member_moderation_grounds.js';
import { appRole } from './_roles.js';

export const memberModerationGroundsTenantIsolationSelect = pgPolicy(
  'member_moderation_grounds_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberModerationGrounds);

export const memberModerationGroundsTenantIsolationInsert = pgPolicy(
  'member_moderation_grounds_tenant_isolation_insert',
  {
    as: 'permissive',
    for: 'insert',
    to: appRole,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberModerationGrounds);

/**
 * The DPDPA-RTBF note scrub ONLY. Tenant-scoped on BOTH legs, so an RTBF in one Pariwar can never
 * reach another's rows — and the column-level GRANT is what keeps this from being a general edit
 * capability over the ground record. See the header.
 */
export const memberModerationGroundsTenantIsolationUpdate = pgPolicy(
  'member_moderation_grounds_tenant_isolation_update',
  {
    as: 'permissive',
    for: 'update',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberModerationGrounds);
