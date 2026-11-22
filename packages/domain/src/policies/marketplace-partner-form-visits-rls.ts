// RLS policy declarations for `marketplace_partner_form_visits` — Story 12.5b (Task 1; Decision `2026-11-22-489` QE1, QE8), migration 0217.
//
// TENANT-ISOLATED, three per-command policies (⛔ `for: 'all'`; ⛔ UPDATE — a visit row never changes):
//   · SELECT — erasure's and the export's reads;
//   · INSERT — `openPartnerFormVisit`; `withCheck` blocks recording into another tenant;
//   · DELETE — AT BIRTH: erasure (`anonymizeMember`) runs as `twt_app` under FORCE RLS, and a DELETE with ⛔ matching policy matches 0 rows
//     SILENTLY (`-279` A12). The second FOR DELETE policy in the migrations, after 0167's.
// The W15 purge runs on the jobs login, which BYPASSES RLS (roster Row 26) and holds its own GRANT (0217, G24).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { marketplacePartnerFormVisits } from '../schema/marketplace_partner_form_visits.js';
import { appRole } from './_roles.js';

export const marketplacePartnerFormVisitsTenantIsolationSelect = pgPolicy('marketplace_partner_form_visits_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(marketplacePartnerFormVisits);

export const marketplacePartnerFormVisitsTenantIsolationInsert = pgPolicy('marketplace_partner_form_visits_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(marketplacePartnerFormVisits);

export const marketplacePartnerFormVisitsTenantIsolationDelete = pgPolicy('marketplace_partner_form_visits_tenant_isolation_delete', {
  as: 'permissive',
  for: 'delete',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(marketplacePartnerFormVisits);
