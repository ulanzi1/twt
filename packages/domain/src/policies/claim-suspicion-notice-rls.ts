// RLS policy declarations for `claim_suspicion_notices` — Story 6.24b, migration 0151 (Task 1.2). SELECT + INSERT + UPDATE — the UPDATE leg is the compare-and-set `attempting` → final.
//
// TENANT-ISOLATED, the `claim-correction-reminder-rls.ts` template — PER-COMMAND, ⛔ never `FOR ALL` (which would carry a
// DELETE leg: ⛔ no notice is ever deleted by `twt_app`; the only deletion is the `ON DELETE cascade` from `claims`).
// Story 1.6's closed-failure construct: an unset scope → '' → nullif → NULL → 0 rows.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimSuspicionNotices } from '../schema/claim_suspicion_notices.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const claimSuspicionNoticesTenantIsolationSelect = pgPolicy('claim_suspicion_notices_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(claimSuspicionNotices);

export const claimSuspicionNoticesTenantIsolationInsert = pgPolicy('claim_suspicion_notices_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(claimSuspicionNotices);

export const claimSuspicionNoticesTenantIsolationUpdate = pgPolicy('claim_suspicion_notices_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(claimSuspicionNotices);
