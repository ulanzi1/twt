// RLS policy declarations for `claim_correction_marks` — Story 6.19b, migration 0126 (Task 1 (a)). APPEND-ONLY: SELECT + INSERT only — ⛔ no UPDATE leg (a mark change is a NEW row, the latest wins, D25).
//
// TENANT-ISOLATED, modelled on `claim-contact-rls.ts` — PER-COMMAND, ⛔ never `FOR ALL` (which would carry a DELETE
// leg: ⛔ nothing in the correction chase is ever deleted by `twt_app`; the only deletion is the `ON DELETE cascade`
// from `claims`). Story 1.6's closed-failure construct: an unset scope → '' → nullif → NULL → 0 rows.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimCorrectionMarks } from '../schema/claim_correction_chase.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const claimCorrectionMarksTenantIsolationSelect = pgPolicy('claim_correction_marks_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(claimCorrectionMarks);

export const claimCorrectionMarksTenantIsolationInsert = pgPolicy('claim_correction_marks_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(claimCorrectionMarks);
