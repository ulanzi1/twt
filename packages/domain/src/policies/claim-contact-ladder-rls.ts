// RLS policy declarations for the delivery ladder — Story 6.37c, migration 0169 (Task 1; LD2). SELECT + INSERT + UPDATE
// — the UPDATE leg is narrowed by 0169's column grant (the step / state / escalation columns only — ⛔ identity).
//
// TENANT-ISOLATED, modelled on `claim-certificate-reminder-rls.ts` — PER-COMMAND, ⛔ never `FOR ALL` (which would carry a
// DELETE leg: ⛔ a ladder is ever deleted by `twt_app`; the only deletion is the `ON DELETE cascade` from `claims`).
// Story 1.6's closed-failure construct: an unset scope → '' → nullif → NULL → 0 rows.
// ⚠ Jobs' production role is roster Row 26 (OPEN) — under its leading option these are what the ladder sweep runs under.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimContactLadders } from '../schema/claim_contact_ladders.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const claimContactLaddersTenantIsolationSelect = pgPolicy('claim_contact_ladders_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(claimContactLadders);

export const claimContactLaddersTenantIsolationInsert = pgPolicy('claim_contact_ladders_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(claimContactLadders);

export const claimContactLaddersTenantIsolationUpdate = pgPolicy('claim_contact_ladders_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(claimContactLadders);
