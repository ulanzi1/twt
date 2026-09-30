// RLS policy declarations for `claim_correction_reminders` — Story 6.19b, migration 0128 (Task 1 (c)). SELECT + INSERT + UPDATE — the UPDATE leg is the compare-and-set `attempting` → final.
//
// TENANT-ISOLATED, modelled on `claim-contact-rls.ts` — PER-COMMAND, ⛔ never `FOR ALL` (which would carry a DELETE
// leg: ⛔ nothing in the correction chase is ever deleted by `twt_app`; the only deletion is the `ON DELETE cascade`
// from `claims`). Story 1.6's closed-failure construct: an unset scope → '' → nullif → NULL → 0 rows.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimCorrectionReminders } from '../schema/claim_correction_chase.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const claimCorrectionRemindersTenantIsolationSelect = pgPolicy('claim_correction_reminders_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(claimCorrectionReminders);

export const claimCorrectionRemindersTenantIsolationInsert = pgPolicy('claim_correction_reminders_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(claimCorrectionReminders);

export const claimCorrectionRemindersTenantIsolationUpdate = pgPolicy('claim_correction_reminders_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(claimCorrectionReminders);
