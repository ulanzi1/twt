// RLS policy declarations for the per-Pariwar appeal-config table — Story 6.16 (Task 1).
//
// TENANT-ISOLATED read + write for `pariwar_appeal_config` — standard inline tenant-isolation on pariwar_id
// (mirror pariwar_wa_config / claims-rls). SYMMETRIC. Story 1.6 closed-failure construct: unset scope → 0
// rows (fail-closed) — a Pariwar with no readable config falls back to DEFAULT_APPEAL_STAGE_SLA_DAYS +
// pending_legal_review (the fail-closed go-live default, D-G).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { pariwarAppealConfig } from '../schema/pariwar_appeal_config.js';
import { appRole } from './_roles.js';

export const pariwarAppealConfigTenantIsolationSelect = pgPolicy('pariwar_appeal_config_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(pariwarAppealConfig);

export const pariwarAppealConfigTenantIsolationWrite = pgPolicy('pariwar_appeal_config_tenant_isolation_write', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(pariwarAppealConfig);
