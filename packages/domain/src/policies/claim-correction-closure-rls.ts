// RLS policy declarations for `claim_correction_closures` — Story 6.19c, migration 0131 (Task 1). SELECT + INSERT + UPDATE — the UPDATE leg records each decision, the review, the outbox (0131's column grant narrows it).
//
// TENANT-ISOLATED, modelled on `claim-correction-letter-rls.ts` — PER-COMMAND, ⛔ never `FOR ALL` (which would carry a
// DELETE leg: ⛔ nothing here is ever deleted by `twt_app`; the only deletion is the `ON DELETE cascade` from
// `claims`). Story 1.6's closed-failure construct: an unset scope → '' → nullif → NULL → 0 rows.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimCorrectionClosures } from '../schema/claim_correction_closure.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const claimCorrectionClosuresTenantIsolationSelect = pgPolicy('claim_correction_closures_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(claimCorrectionClosures);

export const claimCorrectionClosuresTenantIsolationInsert = pgPolicy('claim_correction_closures_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(claimCorrectionClosures);

export const claimCorrectionClosuresTenantIsolationUpdate = pgPolicy('claim_correction_closures_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(claimCorrectionClosures);
