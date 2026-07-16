// RLS policy declarations for the Stage-2 appeal panel votes table — Story 6.16 (Task 1).
//
// TENANT-ISOLATED read + write for `claim_appeal_panel_votes` — mirrors `claim-r9-votes-rls.ts` EXACTLY.
// SYMMETRIC. Story 1.6 closed-failure construct: unset scope → 0 rows (fail-closed).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimAppealPanelVotes } from '../schema/claim_appeal_panel_votes.js';
import { appRole } from './_roles.js';

export const claimAppealPanelVotesTenantIsolationSelect = pgPolicy('claim_appeal_panel_votes_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(claimAppealPanelVotes);

export const claimAppealPanelVotesTenantIsolationWrite = pgPolicy('claim_appeal_panel_votes_tenant_isolation_write', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(claimAppealPanelVotes);
