// RLS policy declarations for the claimant's WhatsApp step — Story 6.37d, migration 0172 (WS8, WS10).
// `claim_contact_wa_sends`: SELECT + INSERT + UPDATE, PER-COMMAND (⛔ never `FOR ALL` — ⛔ a DELETE leg: a send row is ⛔ never
// deleted; the only deletion is the `ON DELETE cascade` from the ladder / the claim). The UPDATE leg is narrowed by 0172's
// column grant (the send columns only). `claim_contact_wa_stops`: SELECT + INSERT only — APPEND-ONLY.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimContactWaSends, claimContactWaStops } from '../schema/claim_contact_wa_sends.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const claimContactWaSendsTenantIsolationSelect = pgPolicy('claim_contact_wa_sends_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(claimContactWaSends);

export const claimContactWaSendsTenantIsolationInsert = pgPolicy('claim_contact_wa_sends_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(claimContactWaSends);

export const claimContactWaSendsTenantIsolationUpdate = pgPolicy('claim_contact_wa_sends_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(claimContactWaSends);

export const claimContactWaStopsTenantIsolationSelect = pgPolicy('claim_contact_wa_stops_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(claimContactWaStops);

export const claimContactWaStopsTenantIsolationInsert = pgPolicy('claim_contact_wa_stops_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(claimContactWaStops);
