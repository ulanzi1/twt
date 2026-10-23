// RLS policy declarations for the family memorial's three tables — Story 11b.4, migration 0181 (MA9 / MA15).
// SELECT + INSERT + UPDATE on each, PER-COMMAND (⛔ never `FOR ALL`; ⛔ no DELETE leg — a version, a decision and a
// withdrawal are ⛔ never deleted). Each UPDATE leg is narrowed by 0181's column-level grant to the Tier-1 ciphertext
// columns ONLY and is load-bearing: without it `anonymizeMember`'s scrub silently updates 0 rows under FORCE
// (`2026-10-04-279` A12).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { memorialReviewDecisions } from '../schema/memorial_review_decisions.js';
import { memorialSubmissions } from '../schema/memorial_submissions.js';
import { memorialWithdrawals } from '../schema/memorial_withdrawals.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const memorialSubmissionsTenantIsolationSelect = pgPolicy('memorial_submissions_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(memorialSubmissions);

export const memorialSubmissionsTenantIsolationInsert = pgPolicy('memorial_submissions_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(memorialSubmissions);

export const memorialSubmissionsTenantIsolationUpdate = pgPolicy('memorial_submissions_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(memorialSubmissions);

export const memorialReviewDecisionsTenantIsolationSelect = pgPolicy(
  'memorial_review_decisions_tenant_isolation_select',
  { as: 'permissive', for: 'select', to: appRole, using: SCOPE },
).link(memorialReviewDecisions);

export const memorialReviewDecisionsTenantIsolationInsert = pgPolicy(
  'memorial_review_decisions_tenant_isolation_insert',
  { as: 'permissive', for: 'insert', to: appRole, withCheck: SCOPE },
).link(memorialReviewDecisions);

export const memorialReviewDecisionsTenantIsolationUpdate = pgPolicy(
  'memorial_review_decisions_tenant_isolation_update',
  { as: 'permissive', for: 'update', to: appRole, using: SCOPE, withCheck: SCOPE },
).link(memorialReviewDecisions);

export const memorialWithdrawalsTenantIsolationSelect = pgPolicy('memorial_withdrawals_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(memorialWithdrawals);

export const memorialWithdrawalsTenantIsolationInsert = pgPolicy('memorial_withdrawals_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(memorialWithdrawals);

export const memorialWithdrawalsTenantIsolationUpdate = pgPolicy('memorial_withdrawals_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(memorialWithdrawals);
