// RLS policy declarations for `member_moderation_actions` — Story 10.10 (Task 2).
//
// TENANT-ISOLATED read + APPEND-ONLY write — mirrors `member-addresses-rls.ts` /
// `member-postings-rls.ts` (the append-only history posture), NOT the `member_withdrawals`
// single-row-per-member posture. There is deliberately NO update/delete policy and the migration
// GRANTs only SELECT + INSERT: a recorded moderation decision is immutable.
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
