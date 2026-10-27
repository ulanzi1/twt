// RLS policy declarations for the memorial take-down's three tables — Story 11b.4a, migration 0187 (`-412` MP7 / MP8 / MP10).
// PER-COMMAND (⛔ never `FOR ALL`; ⛔ no DELETE leg). The requests and outcomes are append-only (SELECT + INSERT only); the approver
// email outbox carries 6.25's UPDATE leg, narrowed by 0187's column-level grant to the claim / finish columns.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { memorialTakedownApproverEmails } from '../schema/memorial_takedown_approver_emails.js';
import { memorialTakedownOutcomes, memorialTakedownRequests } from '../schema/memorial_takedown_requests.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const memorialTakedownRequestsTenantIsolationSelect = pgPolicy('memorial_takedown_requests_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(memorialTakedownRequests);

export const memorialTakedownRequestsTenantIsolationInsert = pgPolicy('memorial_takedown_requests_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(memorialTakedownRequests);

export const memorialTakedownOutcomesTenantIsolationSelect = pgPolicy('memorial_takedown_outcomes_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(memorialTakedownOutcomes);

export const memorialTakedownOutcomesTenantIsolationInsert = pgPolicy('memorial_takedown_outcomes_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(memorialTakedownOutcomes);

export const memorialTakedownApproverEmailsTenantIsolationSelect = pgPolicy(
  'memorial_takedown_approver_emails_tenant_isolation_select',
  { as: 'permissive', for: 'select', to: appRole, using: SCOPE },
).link(memorialTakedownApproverEmails);

export const memorialTakedownApproverEmailsTenantIsolationInsert = pgPolicy(
  'memorial_takedown_approver_emails_tenant_isolation_insert',
  { as: 'permissive', for: 'insert', to: appRole, withCheck: SCOPE },
).link(memorialTakedownApproverEmails);

export const memorialTakedownApproverEmailsTenantIsolationUpdate = pgPolicy(
  'memorial_takedown_approver_emails_tenant_isolation_update',
  { as: 'permissive', for: 'update', to: appRole, using: SCOPE, withCheck: SCOPE },
).link(memorialTakedownApproverEmails);
