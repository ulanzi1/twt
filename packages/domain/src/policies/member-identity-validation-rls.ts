// RLS policy declarations for `member_identity_validations` (Story 3.13, Task 1; DL1) — a copy of 6.39's
// `claim-membership-check-rls.ts`.
//
// TENANT-ISOLATED, and ⛔ never one `FOR ALL` policy: a `FOR ALL` policy carries a DELETE leg, and the table is
// append-only — an identity check is never deleted; a later check supersedes it. SELECT + INSERT + a tenant-scoped
// UPDATE leg, which the COLUMN-LEVEL grants in migration 0218 narrow to the two supersession columns (the writer) and
// `note_ciphertext` (the DPDPA-RTBF scrub, DL14 — ⚠ without this UPDATE leg the scrub matches 0 rows under FORCE, the
// 6.23a trap). A column-aware trigger backs the grant for every role, and a one-way trigger keeps a superseded act
// from being revived.
// ⛔ No `twt_service` leg: every read and write runs in the caller's Pariwar scope.
//
// Uses Story 1.6's closed-failure construct (unset scope → '' → nullif → NULL → 0 rows, quiet fail-closed).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { memberIdentityValidations } from '../schema/member_identity_validations.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const memberIdentityValidationsTenantIsolationSelect = pgPolicy('member_identity_validations_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(memberIdentityValidations);

export const memberIdentityValidationsTenantIsolationInsert = pgPolicy('member_identity_validations_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(memberIdentityValidations);

export const memberIdentityValidationsTenantIsolationUpdate = pgPolicy('member_identity_validations_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(memberIdentityValidations);
