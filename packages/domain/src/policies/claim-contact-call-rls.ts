// RLS policy declarations for the District Admin's call record — Story 6.37c, migration 0169 (Task 1; LD10). SELECT +
// INSERT ONLY: the record is APPEND-ONLY (⛔ UPDATE, ⛔ DELETE — ⛔ granted, so ⛔ a policy for them either).
//
// TENANT-ISOLATED, PER-COMMAND (⛔ `FOR ALL`). Story 1.6's closed-failure construct: an unset scope → 0 rows.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimContactCalls } from '../schema/claim_contact_calls.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const claimContactCallsTenantIsolationSelect = pgPolicy('claim_contact_calls_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(claimContactCalls);

export const claimContactCallsTenantIsolationInsert = pgPolicy('claim_contact_calls_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(claimContactCalls);
