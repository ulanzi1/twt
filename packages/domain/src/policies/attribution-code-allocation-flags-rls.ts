// RLS policy declarations for the allocation-exhaustion flags (Story 13.2, AC2) — migration 0199.
// `attribution_code_allocation_flags`: SELECT + INSERT, PER-COMMAND (⛔ `FOR ALL`, ⛔ an UPDATE or DELETE leg) — the table is append-only for every role (a guard trigger — replica mode or DDL is the only bypass)
// (0199's grant + guard triggers; I3).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { attributionCodeAllocationFlags } from '../schema/attribution_code_allocation_flags.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const attributionCodeAllocationFlagsTenantIsolationSelect = pgPolicy('attribution_code_allocation_flags_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(attributionCodeAllocationFlags);

export const attributionCodeAllocationFlagsTenantIsolationInsert = pgPolicy('attribution_code_allocation_flags_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(attributionCodeAllocationFlags);
