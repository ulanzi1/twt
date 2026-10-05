// RLS policy declarations for the warning-reason list — Story 6.23a, migration 0142 (Task 1; NW16).
// SELECT + INSERT + UPDATE — the UPDATE leg is narrowed by 0142's column grant (`replaced_at` only) and is load-bearing:
// without it the replacement stamp AND `lockActiveApprovalWarningReason`'s `FOR SHARE` (Trap 16) silently match 0 rows
// under FORCE (`2026-10-04-279` A12).
//
// TENANT-ISOLATED, modelled on `claim-certificate-reminder-rls.ts` — PER-COMMAND, ⛔ never `FOR ALL` (a DELETE leg: ⛔ a
// reason is never deleted — NW16). Story 1.6's closed-failure construct: an unset scope → '' → nullif → NULL → 0 rows.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { approvalWarningReasons } from '../schema/approval_warning_reasons.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const approvalWarningReasonsTenantIsolationSelect = pgPolicy(
  'approval_warning_reasons_tenant_isolation_select',
  { as: 'permissive', for: 'select', to: appRole, using: SCOPE },
).link(approvalWarningReasons);

export const approvalWarningReasonsTenantIsolationInsert = pgPolicy(
  'approval_warning_reasons_tenant_isolation_insert',
  { as: 'permissive', for: 'insert', to: appRole, withCheck: SCOPE },
).link(approvalWarningReasons);

export const approvalWarningReasonsTenantIsolationUpdate = pgPolicy(
  'approval_warning_reasons_tenant_isolation_update',
  { as: 'permissive', for: 'update', to: appRole, using: SCOPE, withCheck: SCOPE },
).link(approvalWarningReasons);
