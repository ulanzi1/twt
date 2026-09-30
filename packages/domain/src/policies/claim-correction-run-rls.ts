// RLS policy declarations for `claim_correction_runs` — Story 6.19b, migration 0127 (Task 1 (b)). SELECT + INSERT + UPDATE — the UPDATE leg ends a run (0127's column-level grant narrows it to `ended_at` / `end_reason`).
//
// TENANT-ISOLATED, modelled on `claim-contact-rls.ts` — PER-COMMAND, ⛔ never `FOR ALL` (which would carry a DELETE
// leg: ⛔ nothing in the correction chase is ever deleted by `twt_app`; the only deletion is the `ON DELETE cascade`
// from `claims`). Story 1.6's closed-failure construct: an unset scope → '' → nullif → NULL → 0 rows.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimCorrectionRuns } from '../schema/claim_correction_chase.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const claimCorrectionRunsTenantIsolationSelect = pgPolicy('claim_correction_runs_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(claimCorrectionRuns);

export const claimCorrectionRunsTenantIsolationInsert = pgPolicy('claim_correction_runs_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(claimCorrectionRuns);

export const claimCorrectionRunsTenantIsolationUpdate = pgPolicy('claim_correction_runs_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(claimCorrectionRuns);
