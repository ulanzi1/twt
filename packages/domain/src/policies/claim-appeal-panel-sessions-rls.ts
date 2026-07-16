// RLS policy declarations for the Stage-2 appeal panel session table — Story 6.16 (Task 1).
//
// TENANT-ISOLATED read + write for `claim_appeal_panel_sessions` — mirrors `claim-r9-voting-sessions-rls.ts`
// EXACTLY. SYMMETRIC. Story 1.6 closed-failure construct: unset scope → 0 rows (fail-closed).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimAppealPanelSessions } from '../schema/claim_appeal_panel_sessions.js';
import { appRole } from './_roles.js';

export const claimAppealPanelSessionsTenantIsolationSelect = pgPolicy(
  'claim_appeal_panel_sessions_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(claimAppealPanelSessions);

export const claimAppealPanelSessionsTenantIsolationWrite = pgPolicy(
  'claim_appeal_panel_sessions_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(claimAppealPanelSessions);
