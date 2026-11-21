// RLS policy declarations for `marketplace_lead_handoffs` — Story 12.5 (Task 1.2; Decision `2026-11-21-483` QE4), migration 0215.
//
// TENANT-ISOLATED, three per-command policies (⛔ `for: 'all'`, which would admit DELETE; the guard refuses a DELETE anyway):
//   · SELECT — 12.3's status read (`getLeadHandoffStatus`) and erasure's WHERE;
//   · INSERT — `recordLeadHandoff` in 12.3's lead transaction (W1); `withCheck` blocks recording into another tenant;
//   · UPDATE — AT BIRTH (`-279` A12): erasure (W11) and the staff requeue (W13) run as `twt_app` under FORCE RLS, and a missing UPDATE
//     policy would make the scrub match 0 rows silently.
// The sweep runs on the jobs login, which BYPASSES RLS (roster Row 26), so its statements carry `pariwar_id` themselves (TR11).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { marketplaceLeadHandoffs } from '../schema/marketplace_lead_handoffs.js';
import { appRole } from './_roles.js';

/** SELECT isolation: a query under `app.pariwar_id = X` reads only that Pariwar's handoffs. */
export const marketplaceLeadHandoffsTenantIsolationSelect = pgPolicy('marketplace_lead_handoffs_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(marketplaceLeadHandoffs);

/** INSERT isolation: `withCheck` blocks recording a handoff into another tenant. */
export const marketplaceLeadHandoffsTenantIsolationInsert = pgPolicy('marketplace_lead_handoffs_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(marketplaceLeadHandoffs);

/** UPDATE isolation — erasure (W11) and the requeue (W13). `withCheck` blocks moving a row to another tenant (the guard refuses it too). */
export const marketplaceLeadHandoffsTenantIsolationUpdate = pgPolicy('marketplace_lead_handoffs_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(marketplaceLeadHandoffs);
