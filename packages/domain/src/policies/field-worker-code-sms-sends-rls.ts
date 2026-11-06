// RLS policy declarations for the field-worker code SMS send record (Story 13.1b, AD8) — migration 0202.
// `field_worker_code_sms_sends`: SELECT + INSERT, PER-COMMAND (⛔ `FOR ALL`, ⛔ an UPDATE or DELETE leg) — `twt_app` holds neither grant:
// the API only ever writes `due`, and only the sweep's login moves a row (0199 is the shape).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { fieldWorkerCodeSmsSends } from '../schema/field_worker_code_sms_sends.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const fieldWorkerCodeSmsSendsTenantIsolationSelect = pgPolicy('field_worker_code_sms_sends_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(fieldWorkerCodeSmsSends);

export const fieldWorkerCodeSmsSendsTenantIsolationInsert = pgPolicy('field_worker_code_sms_sends_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(fieldWorkerCodeSmsSends);
