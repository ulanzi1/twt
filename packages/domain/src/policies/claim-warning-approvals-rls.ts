// RLS policy declarations for the approval-over-warning record — Story 6.23a, migration 0143 (Task 1; NW13).
// SELECT + INSERT + UPDATE — the UPDATE leg is narrowed by 0143's column grant (`note_ciphertext`, for the DPDPA-RTBF
// scrub ONLY) and is load-bearing: without it `anonymizeMember`'s scrub silently updates 0 rows under FORCE
// (`2026-10-04-279` A12).
//
// TENANT-ISOLATED, modelled on `claim-certificate-reminder-rls.ts` — PER-COMMAND, ⛔ never `FOR ALL` (a DELETE leg: ⛔ a
// record is never deleted; the only deletion is the `ON DELETE cascade` from `claims` / `claim_verifier_decisions`).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimWarningApprovals } from '../schema/claim_warning_approvals.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const claimWarningApprovalsTenantIsolationSelect = pgPolicy(
  'claim_warning_approvals_tenant_isolation_select',
  { as: 'permissive', for: 'select', to: appRole, using: SCOPE },
).link(claimWarningApprovals);

export const claimWarningApprovalsTenantIsolationInsert = pgPolicy(
  'claim_warning_approvals_tenant_isolation_insert',
  { as: 'permissive', for: 'insert', to: appRole, withCheck: SCOPE },
).link(claimWarningApprovals);

export const claimWarningApprovalsTenantIsolationUpdate = pgPolicy(
  'claim_warning_approvals_tenant_isolation_update',
  { as: 'permissive', for: 'update', to: appRole, using: SCOPE, withCheck: SCOPE },
).link(claimWarningApprovals);
