// RLS policy declarations for `report_exports` — Story 10.7 (Task 1).
//
// TENANT-ISOLATED read + write — mirrors `data-exports-rls.ts`, NOT the global identity-auth carve-out.
// A report export belongs to exactly one Pariwar; the job's generation write + the API's status/download
// reads run under that Pariwar's `app.pariwar_id`.
//
// ── DEVIATION from the append-only Life Events tables ─────────────────────────────────────────────
// The migration GRANT is SELECT + INSERT + UPDATE (contrast the INSERT-only immutable history tables).
// UPDATE is permitted because the row transitions status, the job writes the artifact, the download
// stamps `consumed_at`, and the TTL vacuum zeroes the artifact. The `for: 'all'` write policy already
// covers INSERT + UPDATE; the migration GRANT is what widens the privilege beyond the append-only tables.
//
// Uses Story 1.6's closed-failure construct (unset scope → '' → nullif → NULL → 0 rows, quiet
// fail-closed) — identical to `data-exports-rls.ts`.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { reportExports } from '../schema/report_exports.js';
import { appRole } from './_roles.js';

export const reportExportsTenantIsolationSelect = pgPolicy('report_exports_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(reportExports);

export const reportExportsTenantIsolationWrite = pgPolicy('report_exports_tenant_isolation_write', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(reportExports);
