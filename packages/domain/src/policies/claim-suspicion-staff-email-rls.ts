// RLS policy declarations for `claim_suspicion_staff_emails` — Story 6.25, migration 0152 (Task 1.2). SELECT + INSERT + UPDATE —
// the UPDATE leg is the compare-and-set `attempting` → final (and the re-claim / transient note).
//
// TENANT-ISOLATED, the `claim-suspicion-notice-rls.ts` template — PER-COMMAND, ⛔ never `FOR ALL` (which would carry a DELETE
// leg: ⛔ no staff-email row is ever deleted by `twt_app`; the only deletion is the `ON DELETE cascade` from `claims`).
// Story 1.6's closed-failure construct: an unset scope → '' → nullif → NULL → 0 rows.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimSuspicionStaffEmails } from '../schema/claim_suspicion_staff_emails.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const claimSuspicionStaffEmailsTenantIsolationSelect = pgPolicy('claim_suspicion_staff_emails_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(claimSuspicionStaffEmails);

export const claimSuspicionStaffEmailsTenantIsolationInsert = pgPolicy('claim_suspicion_staff_emails_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(claimSuspicionStaffEmails);

export const claimSuspicionStaffEmailsTenantIsolationUpdate = pgPolicy('claim_suspicion_staff_emails_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(claimSuspicionStaffEmails);
