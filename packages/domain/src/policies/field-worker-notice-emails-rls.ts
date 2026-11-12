// RLS policy declarations for `field_worker_notice_emails` — Story 13.1g (Task 1.2; migration 0206; ADR-0045).
//
// PER-COMMAND (⛔ never `FOR ALL`; ⛔ no DELETE leg) — 0187's approver-email outbox, narrowed by 0206's column grants to the claim /
// finish columns. ⚠ These policies bind `twt_app` ONLY: the jobs sweep and child run on the jobs login (BYPASSRLS — `withPariwarScope`
// sets the GUC and no role), where they do ⛔ not apply; there every statement carries an explicit `pariwar_id` predicate
// (`field-worker/notice-email.ts`, AD3 (c)). They are proved by the policy regression spec under `twt_app`, and bind Row 26's RLS-bound
// posture should it be chosen (AD13).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { fieldWorkerNoticeEmails } from '../schema/field_worker_notice_emails.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const fieldWorkerNoticeEmailsTenantIsolationSelect = pgPolicy('field_worker_notice_emails_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(fieldWorkerNoticeEmails);

export const fieldWorkerNoticeEmailsTenantIsolationInsert = pgPolicy('field_worker_notice_emails_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(fieldWorkerNoticeEmails);

export const fieldWorkerNoticeEmailsTenantIsolationUpdate = pgPolicy('field_worker_notice_emails_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(fieldWorkerNoticeEmails);
