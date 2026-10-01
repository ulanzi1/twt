// RLS policy declarations for `claim_closure_letters` — Story 6.19c, migration 0134 (Task 1). SELECT + INSERT + UPDATE — the UPDATE leg records a letter's delivery + screenshot (0134's column grant narrows it).
//
// TENANT-ISOLATED, modelled on `claim-correction-letter-rls.ts` — PER-COMMAND, ⛔ never `FOR ALL` (which would carry a
// DELETE leg: ⛔ nothing here is ever deleted by `twt_app`; the only deletion is the `ON DELETE cascade` from
// `claims`). Story 1.6's closed-failure construct: an unset scope → '' → nullif → NULL → 0 rows.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimClosureLetters } from '../schema/claim_correction_closure.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const claimClosureLettersTenantIsolationSelect = pgPolicy('claim_closure_letters_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(claimClosureLetters);

export const claimClosureLettersTenantIsolationInsert = pgPolicy('claim_closure_letters_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(claimClosureLetters);

export const claimClosureLettersTenantIsolationUpdate = pgPolicy('claim_closure_letters_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(claimClosureLetters);
