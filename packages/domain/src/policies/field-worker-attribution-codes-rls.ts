// RLS policy declarations for the attribution-code registry (Story 13.2, AC1) — migration 0199.
// `field_worker_attribution_codes`: SELECT + INSERT, PER-COMMAND (⛔ `FOR ALL`, ⛔ an UPDATE or DELETE leg) — the table is append-only for every role (a guard trigger — replica mode or DDL is the only bypass)
// (0199's grant + guard triggers; I3).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { fieldWorkerAttributionCodes } from '../schema/field_worker_attribution_codes.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const fieldWorkerAttributionCodesTenantIsolationSelect = pgPolicy('field_worker_attribution_codes_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(fieldWorkerAttributionCodes);

export const fieldWorkerAttributionCodesTenantIsolationInsert = pgPolicy('field_worker_attribution_codes_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(fieldWorkerAttributionCodes);
