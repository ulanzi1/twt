// RLS policy declarations for the inspector's discrepancy NOTES — Story 6.27d, migration 0160 (PM25 (a), PM17 d's half).
// SELECT + INSERT + UPDATE, PER-COMMAND (⛔ never `FOR ALL`; ⛔ a DELETE leg: a note is ⛔ never deleted but by cascade).
// The UPDATE leg is narrowed by 0160's column grant (`note_ciphertext`) and its erasure-arm trigger, and is load-bearing:
// without it `anonymizeMember`'s scrub silently updates 0 rows under FORCE (`2026-10-04-279` A12).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimGroundInspectionDiscrepancyNotes } from '../schema/claim_ground_inspection_discrepancies.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const claimGroundInspectionDiscrepancyNotesTenantIsolationSelect = pgPolicy(
  'claim_gi_discrepancy_notes_tenant_isolation_select',
  { as: 'permissive', for: 'select', to: appRole, using: SCOPE },
).link(claimGroundInspectionDiscrepancyNotes);

export const claimGroundInspectionDiscrepancyNotesTenantIsolationInsert = pgPolicy(
  'claim_gi_discrepancy_notes_tenant_isolation_insert',
  { as: 'permissive', for: 'insert', to: appRole, withCheck: SCOPE },
).link(claimGroundInspectionDiscrepancyNotes);

export const claimGroundInspectionDiscrepancyNotesTenantIsolationUpdate = pgPolicy(
  'claim_gi_discrepancy_notes_tenant_isolation_update',
  { as: 'permissive', for: 'update', to: appRole, using: SCOPE, withCheck: SCOPE },
).link(claimGroundInspectionDiscrepancyNotes);
