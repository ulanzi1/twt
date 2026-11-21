// RLS policy declarations for `claim_membership_checks` (Story 6.39, Task 1; DL1).
//
// TENANT-ISOLATED, and ⛔ never one `FOR ALL` policy: a `FOR ALL` policy carries a DELETE leg, and the table is
// append-only — a check is never deleted; a re-check supersedes it. SELECT + INSERT + a tenant-scoped UPDATE leg,
// which the COLUMN-LEVEL grants in migration 0212 narrow to the two supersession columns (the writer) and
// `note_ciphertext` (the DPDPA-RTBF scrub, DL14 — ⚠ without this UPDATE leg the scrub matches 0 rows under FORCE,
// the 6.23a trap). A column-aware trigger backs the grant for every role, and a one-way trigger keeps a superseded
// check from being revived.
// ⛔ No `twt_service` leg: every read and write runs in the caller's Pariwar scope.
//
// Uses Story 1.6's closed-failure construct (unset scope → '' → nullif → NULL → 0 rows, quiet fail-closed).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimMembershipChecks } from '../schema/claim_membership_checks.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const claimMembershipChecksTenantIsolationSelect = pgPolicy('claim_membership_checks_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(claimMembershipChecks);

export const claimMembershipChecksTenantIsolationInsert = pgPolicy('claim_membership_checks_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(claimMembershipChecks);

export const claimMembershipChecksTenantIsolationUpdate = pgPolicy('claim_membership_checks_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(claimMembershipChecks);
