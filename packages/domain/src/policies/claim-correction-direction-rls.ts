// RLS policy declarations for `claim_correction_directions` — Story 6.19c, migration 0132 (Task 1). SELECT + INSERT + UPDATE — the UPDATE leg records the response and the opened run (0132's column grant narrows it).
//
// TENANT-ISOLATED, modelled on `claim-correction-letter-rls.ts` — PER-COMMAND, ⛔ never `FOR ALL` (which would carry a
// DELETE leg: ⛔ nothing here is ever deleted by `twt_app`; the only deletion is the `ON DELETE cascade` from
// `claims`). Story 1.6's closed-failure construct: an unset scope → '' → nullif → NULL → 0 rows.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimCorrectionDirections } from '../schema/claim_correction_closure.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const claimCorrectionDirectionsTenantIsolationSelect = pgPolicy('claim_correction_directions_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(claimCorrectionDirections);

export const claimCorrectionDirectionsTenantIsolationInsert = pgPolicy('claim_correction_directions_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(claimCorrectionDirections);

export const claimCorrectionDirectionsTenantIsolationUpdate = pgPolicy('claim_correction_directions_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(claimCorrectionDirections);
