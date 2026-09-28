// RLS policy declarations for `claim_contacts` + `claim_contact_nominees` — Story 6.19a (Task 1; D5).
//
// TENANT-ISOLATED, modelled on `claim-nominee-bank-rls.ts`, but PER-COMMAND (the 0122 idiom): SELECT, INSERT and
// UPDATE only — ⛔ never `FOR ALL`, which would carry a DELETE leg (W4: a write never deletes a row it does not
// carry; the only deletion is the `ON DELETE cascade` from `claims`). Story 1.6's closed-failure construct: an
// unset scope → '' → nullif → NULL → 0 rows, so a cross-tenant `claim_case_id` guess resolves to empty.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimContactNominees, claimContacts } from '../schema/claim_contacts.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const claimContactsTenantIsolationSelect = pgPolicy('claim_contacts_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(claimContacts);

export const claimContactsTenantIsolationInsert = pgPolicy('claim_contacts_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(claimContacts);

export const claimContactsTenantIsolationUpdate = pgPolicy('claim_contacts_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(claimContacts);

export const claimContactNomineesTenantIsolationSelect = pgPolicy('claim_contact_nominees_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(claimContactNominees);

export const claimContactNomineesTenantIsolationInsert = pgPolicy('claim_contact_nominees_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(claimContactNominees);

export const claimContactNomineesTenantIsolationUpdate = pgPolicy('claim_contact_nominees_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(claimContactNominees);
