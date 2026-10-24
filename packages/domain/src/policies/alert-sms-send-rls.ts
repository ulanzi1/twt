// RLS policy declarations for `alert_sms_sends` — Story 5.11b, migration 0184 (Task 1). SELECT + INSERT + UPDATE — the UPDATE leg
// is the compare-and-set `attempting` → final (and `deferred` → `attempting`), narrowed by 0184's column grant.
//
// TENANT-ISOLATED, the `claim-suspicion-notice-rls.ts` template — PER-COMMAND, ⛔ never `FOR ALL` (which would carry a DELETE leg:
// ⛔ send record is ever deleted — it is ⛔ pruned). Story 1.6's closed-failure construct: an unset scope → '' → nullif → NULL → 0 rows.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { alertSmsSends } from '../schema/alert_sms_sends.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const alertSmsSendsTenantIsolationSelect = pgPolicy('alert_sms_sends_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(alertSmsSends);

export const alertSmsSendsTenantIsolationInsert = pgPolicy('alert_sms_sends_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(alertSmsSends);

export const alertSmsSendsTenantIsolationUpdate = pgPolicy('alert_sms_sends_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(alertSmsSends);
