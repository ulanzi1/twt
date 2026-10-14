// RLS policy declarations for the workplace tables — Story 6.36a, migration 0161 (`2026-10-14-330` SW2, SW3, SW9).
// SELECT + INSERT + UPDATE, PER-COMMAND (⛔ never `FOR ALL` — ⛔ a DELETE leg: ⛔ nothing here is ever deleted; the only deletion
// is `workplace_requests`' `ON DELETE cascade` from `members`). The UPDATE legs are narrowed by 0161's column grants and are
// load-bearing: the import's upsert / delisting, the rename, the request moves and the erasure scrub (AC9) match 0 rows
// under FORCE without them (`-279` A12).
// Story 1.6 closed-failure construct (unset scope → '' → nullif → NULL → 0 rows, quiet fail-closed).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { workplaceDistricts } from '../schema/workplace_districts.js';
import { workplaceImportBatches } from '../schema/workplace_import_batches.js';
import { workplaceRequests } from '../schema/workplace_requests.js';
import { workplaces } from '../schema/workplaces.js';
import { appRole } from './_roles.js';

const SCOPE = sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`;

export const workplaceImportBatchesTenantIsolationSelect = pgPolicy('workplace_import_batches_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(workplaceImportBatches);

export const workplaceImportBatchesTenantIsolationInsert = pgPolicy('workplace_import_batches_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(workplaceImportBatches);

export const workplaceImportBatchesTenantIsolationUpdate = pgPolicy('workplace_import_batches_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(workplaceImportBatches);

export const workplaceDistrictsTenantIsolationSelect = pgPolicy('workplace_districts_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(workplaceDistricts);

export const workplaceDistrictsTenantIsolationInsert = pgPolicy('workplace_districts_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(workplaceDistricts);

export const workplaceDistrictsTenantIsolationUpdate = pgPolicy('workplace_districts_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(workplaceDistricts);

export const workplacesTenantIsolationSelect = pgPolicy('workplaces_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(workplaces);

export const workplacesTenantIsolationInsert = pgPolicy('workplaces_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(workplaces);

export const workplacesTenantIsolationUpdate = pgPolicy('workplaces_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(workplaces);

export const workplaceRequestsTenantIsolationSelect = pgPolicy('workplace_requests_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: SCOPE,
}).link(workplaceRequests);

export const workplaceRequestsTenantIsolationInsert = pgPolicy('workplace_requests_tenant_isolation_insert', {
  as: 'permissive',
  for: 'insert',
  to: appRole,
  withCheck: SCOPE,
}).link(workplaceRequests);

export const workplaceRequestsTenantIsolationUpdate = pgPolicy('workplace_requests_tenant_isolation_update', {
  as: 'permissive',
  for: 'update',
  to: appRole,
  using: SCOPE,
  withCheck: SCOPE,
}).link(workplaceRequests);
