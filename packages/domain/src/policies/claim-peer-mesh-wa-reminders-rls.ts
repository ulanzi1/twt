// RLS policy declarations for the WhatsApp reminder's record — Story 6.31, migration 0171 (WR1).
// SELECT + INSERT + UPDATE, PER-COMMAND (⛔ never `FOR ALL` — ⛔ a DELETE leg: a reminder row is ⛔ never deleted; the only
// deletion is the `ON DELETE cascade` from the ping / the selection). The UPDATE leg is narrowed by 0171's column grant (the
// delivery columns only).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimPeerMeshWaReminders } from '../schema/claim_peer_mesh_wa_reminders.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const claimPeerMeshWaRemindersTenantIsolationSelect = pgPolicy('claim_peer_mesh_wa_reminders_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(claimPeerMeshWaReminders);

export const claimPeerMeshWaRemindersTenantIsolationInsert = pgPolicy('claim_peer_mesh_wa_reminders_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(claimPeerMeshWaReminders);

export const claimPeerMeshWaRemindersTenantIsolationUpdate = pgPolicy('claim_peer_mesh_wa_reminders_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(claimPeerMeshWaReminders);
