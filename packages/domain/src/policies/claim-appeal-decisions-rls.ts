// RLS policy declarations for the appeal decision-metadata table — Story 6.16 (Task 1).
//
// TENANT-ISOLATED read + write for `claim_appeal_decisions` — mirrors `claim-verifier-decisions-rls.ts`
// EXACTLY. SYMMETRIC. Story 1.6 closed-failure construct: unset scope → 0 rows (fail-closed).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimAppealDecisions } from '../schema/claim_appeal_decisions.js';
import { appRole } from './_roles.js';

export const claimAppealDecisionsTenantIsolationSelect = pgPolicy('claim_appeal_decisions_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(claimAppealDecisions);

export const claimAppealDecisionsTenantIsolationWrite = pgPolicy('claim_appeal_decisions_tenant_isolation_write', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(claimAppealDecisions);
