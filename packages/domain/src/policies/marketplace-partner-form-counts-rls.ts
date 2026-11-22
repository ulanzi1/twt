// RLS policy declarations for `marketplace_partner_form_counts` — Story 12.5b (Task 1; Decision `2026-11-22-489` QE13), migration 0217.
//
// TENANT-ISOLATED, three per-command policies (⛔ `for: 'all'`; ⛔ DELETE): `countPartnerFormEvent`'s UPSERT needs INSERT and UPDATE
// (`count` only — the column grant), and the admin detail read SELECT.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { marketplacePartnerFormCounts } from '../schema/marketplace_partner_form_counts.js';
import { appRole } from './_roles.js';

export const marketplacePartnerFormCountsTenantIsolationSelect = pgPolicy('marketplace_partner_form_counts_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(marketplacePartnerFormCounts);

export const marketplacePartnerFormCountsTenantIsolationInsert = pgPolicy('marketplace_partner_form_counts_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(marketplacePartnerFormCounts);

export const marketplacePartnerFormCountsTenantIsolationUpdate = pgPolicy('marketplace_partner_form_counts_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(marketplacePartnerFormCounts);
