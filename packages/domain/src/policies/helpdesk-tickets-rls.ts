// RLS policy declarations for `helpdesk_tickets` — Story 10.1 (Task 2).
//
// TENANT-ISOLATED read + write — mirrors `alerts-rls.ts` / `pools-rls.ts`. A ticket belongs
// to exactly one Pariwar; it is read/written under that Pariwar's `app.pariwar_id`. Uses Story
// 1.6's fail-closed `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`
// construct (unset scope → NULL → 0 rows).
//
// Orthogonal to the `helpdesk_tickets.current_state` write-rejection trigger (AC4): RLS
// isolates BY TENANT; the trigger blocks state-cache writes not from the projector, regardless
// of tenant. Both apply to every INSERT/UPDATE.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { helpdeskTickets } from '../schema/helpdesk_tickets.js';
import { appRole } from './_roles.js';

/** SELECT isolation: a query under `app.pariwar_id = X` reads only that Pariwar's tickets. */
export const helpdeskTicketsTenantIsolationSelect = pgPolicy('helpdesk_tickets_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(helpdeskTickets);

/** INSERT isolation — the projector's genesis write of the initial ticket row. `withCheck` blocks
 *  creating a ticket into another tenant. Deliberately NOT `for: 'all'`: this table is event-derived
 *  and append-preferred (current_state is projector-only, see the DB trigger); `all` would also grant
 *  DELETE, letting a tenant-scoped caller orphan a ticket's events_log stream with no guard. */
export const helpdeskTicketsTenantIsolationInsert = pgPolicy('helpdesk_tickets_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(helpdeskTickets);

/** UPDATE isolation — the projector's update of the cached `current_state` (guarded separately by
 *  the `app.helpdesk_state_writer` trigger) and any future field update (e.g. `routed_to_actor_id`
 *  on pick-up). `withCheck` blocks moving a ticket into another tenant. No DELETE policy exists —
 *  see the INSERT policy's comment above. */
export const helpdeskTicketsTenantIsolationUpdate = pgPolicy('helpdesk_tickets_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(helpdeskTickets);
