// RLS policy declarations for `member_moderation_appeals` — Story 10.22 (Task 4; AC4).
//
// Niyamavali §8.8, ratified by Decision `2026-08-15-121`.
//
// TENANT-ISOLATED read + APPEND-ONLY filing + a NARROW decision/scrub update — the
// `member-moderation-grounds-rls.ts` posture, not `member_data_rights_corrections`'s single `FOR ALL`.
// ⛔ There is deliberately NO DELETE policy and no `FOR ALL` policy: a recorded appeal is immutable,
// exactly as the moderation decision it appeals is. A `FOR ALL` policy would silently carry a DELETE
// leg that no requirement asks for.
//
// ── The UPDATE leg, and why it does not break append-only ───────────────────────────────────────
// Two things must be writable after insert, and only two:
//   1. THE DECISION — `status`, `outcome`, `reasoned_outcome_ciphertext`, `decided_by_actor_id`,
//      `decided_by_display`, `decided_at`. §8.8 requires a reasoned outcome, and the outcome is
//      recorded on the appeal it determines. Migration 0107's
//      `member_moderation_appeals_decision_coherence_check` makes those six mutually all-or-nothing,
//      and the app-layer write is guarded on `status = 'open'`, so in practice the decision is
//      written exactly once.
//   2. THE DPDPA-RTBF SCRUB — `grounds_ciphertext` and `reasoned_outcome_ciphertext` (AC9). Shipped
//      AT BIRTH rather than as a follow-up: migration 0091 learned the hard way that a Tier-1 column
//      on a SELECT/INSERT-only table is structurally UN-ERASABLE (an RTBF is a SOFT delete, so the
//      `ON DELETE cascade` FK never fires), and 0092 had to come back and fix it.
//
// ⭐ The COLUMN-LEVEL GRANTs in migration 0107 are what keep this policy from being a general edit
// capability. Postgres tracks column privileges by attribute, so `member_id`, `pariwar_id`,
// `moderation_action_id`, `filed_via`, `helpdesk_ticket_id` and `filed_at` are un-writable by the app
// role at all — the FILING is immutable by privilege, not by convention. This policy scopes the
// tenant; the grant scopes the columns. Both are required.
//
// ── No `twt_service` leg at all ─────────────────────────────────────────────────────────────────
// Unlike `member_moderation_actions` there is no pre-scope reader here: the signup rejoin guard reads
// the ACTIONS table on the BYPASSRLS service pool and has no business with appeals. `twt_service` gets
// nothing — not even SELECT.
//
// Uses Story 1.6's closed-failure construct (unset scope → '' → nullif → NULL → 0 rows, quiet
// fail-closed) — identical to its two moderation siblings.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { memberModerationAppeals } from '../schema/member_moderation_appeals.js';
import { appRole } from './_roles.js';

export const memberModerationAppealsTenantIsolationSelect = pgPolicy(
  'member_moderation_appeals_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberModerationAppeals);

export const memberModerationAppealsTenantIsolationInsert = pgPolicy(
  'member_moderation_appeals_tenant_isolation_insert',
  {
    as: 'permissive',
    for: 'insert',
    to: appRole,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberModerationAppeals);

/**
 * The §8.8 decision write AND the DPDPA-RTBF scrub — the only two writes after filing. Tenant-scoped
 * on BOTH legs, so a decision (or an RTBF) in one Pariwar can never reach another's rows. See the
 * header for why this is not a general edit capability.
 */
export const memberModerationAppealsTenantIsolationUpdate = pgPolicy(
  'member_moderation_appeals_tenant_isolation_update',
  {
    as: 'permissive',
    for: 'update',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberModerationAppeals);
