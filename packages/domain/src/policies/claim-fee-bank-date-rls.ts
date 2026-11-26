// RLS policy declarations for `claim_fee_bank_dates` (Story 6.39a, Task 1.1; DL1).
//
// TENANT-ISOLATED, and ⛔ never one `FOR ALL` policy: a `FOR ALL` policy carries a DELETE leg, and the table is
// append-only — a record is never deleted; a new record supersedes it. SELECT + INSERT + a tenant-scoped UPDATE leg,
// which the COLUMN-LEVEL grants in migration 0219 narrow to the two supersession columns (the writer) and
// `note_ciphertext` (the DPDPA-RTBF scrub — ⚠ without this UPDATE leg the scrub matches 0 rows under FORCE, the 6.23a
// trap). A column-aware trigger backs the grant for every role, and a one-way trigger keeps a superseded record from
// being revived.
// ⛔ No `twt_service` leg: every read and write runs in the caller's Pariwar scope.
//
// Uses Story 1.6's closed-failure construct (unset scope → '' → nullif → NULL → 0 rows, quiet fail-closed).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimFeeBankDates } from '../schema/claim_fee_bank_dates.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const claimFeeBankDatesTenantIsolationSelect = pgPolicy('claim_fee_bank_dates_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(claimFeeBankDates);

export const claimFeeBankDatesTenantIsolationInsert = pgPolicy('claim_fee_bank_dates_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(claimFeeBankDates);

export const claimFeeBankDatesTenantIsolationUpdate = pgPolicy('claim_fee_bank_dates_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(claimFeeBankDates);
