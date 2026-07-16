// RLS policy declarations for the appeal-journey anchor table — Story 6.16 (Task 1).
//
// TENANT-ISOLATED read + write for `claim_appeals` — mirrors `claim-verifier-decisions-rls.ts` EXACTLY. An
// appeal-journey row belongs to exactly one Pariwar; every access runs under that Pariwar's `app.pariwar_id`.
// SYMMETRIC (no 6.13 asymmetry). Story 1.6 closed-failure construct: unset scope → 0 rows (fail-closed).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimAppeals } from '../schema/claim_appeals.js';
import { appRole } from './_roles.js';

export const claimAppealsTenantIsolationSelect = pgPolicy('claim_appeals_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(claimAppeals);

export const claimAppealsTenantIsolationWrite = pgPolicy('claim_appeals_tenant_isolation_write', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(claimAppeals);
