// RLS policy declarations for `marketplace_partner_form_totals` — Story 12.5b (Task 1; Decision `2026-11-22-489` QE12 (A)), migration 0217.
//
// TENANT-ISOLATED, INSERT-ONLY — select / insert (⛔ `for: 'all'`, ⛔ UPDATE, ⛔ DELETE): a correction is a NEW entry.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { marketplacePartnerFormTotals } from '../schema/marketplace_partner_form_totals.js';
import { appRole } from './_roles.js';

export const marketplacePartnerFormTotalsTenantIsolationSelect = pgPolicy('marketplace_partner_form_totals_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(marketplacePartnerFormTotals);

export const marketplacePartnerFormTotalsTenantIsolationInsert = pgPolicy('marketplace_partner_form_totals_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(marketplacePartnerFormTotals);
