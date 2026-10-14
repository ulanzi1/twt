// RLS policy declarations for the inspector's discrepancy SHOWINGS — Story 6.27d, migration 0160 (PM25 (a)).
// SELECT + INSERT, PER-COMMAND (⛔ never `FOR ALL`; ⛔ an UPDATE or DELETE leg: a showing is ⛔ never changed, and the only
// deletion is the `ON DELETE cascade` from `claims` / `claim_ground_inspections` — 0160's trigger refuses any other).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimGroundInspectionDiscrepancyShowings } from '../schema/claim_ground_inspection_discrepancies.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const claimGroundInspectionDiscrepancyShowingsTenantIsolationSelect = pgPolicy(
  'claim_gi_discrepancy_showings_tenant_isolation_select',
  { as: 'permissive', for: 'select', to: appRole, using: SCOPE },
).link(claimGroundInspectionDiscrepancyShowings);

export const claimGroundInspectionDiscrepancyShowingsTenantIsolationInsert = pgPolicy(
  'claim_gi_discrepancy_showings_tenant_isolation_insert',
  { as: 'permissive', for: 'insert', to: appRole, withCheck: SCOPE },
).link(claimGroundInspectionDiscrepancyShowings);
