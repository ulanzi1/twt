// RLS policy declarations for `data_exports` — Story 3.11 (Task 1).
//
// TENANT-ISOLATED read + write — mirrors `member-withdrawals-rls.ts` / `member-addresses-rls.ts`,
// NOT the global identity-auth carve-out. An export belongs to exactly one Pariwar; the job's
// generation write + the API's status/download reads run under that Pariwar's `app.pariwar_id`.
//
// ── DEVIATION from the append-only Life Events tables ─────────────────────────────────────────────
// The migration GRANT is SELECT + INSERT + UPDATE (contrast member_addresses/member_postings, which
// are INSERT-only immutable history). UPDATE is permitted because the row transitions status, the job
// writes the artifact, the download stamps `consumed_at`, and the TTL vacuum zeroes the artifact. The
// `for: 'all'` write policy already covers INSERT + UPDATE; the migration GRANT is what actually
// widens the privilege beyond the append-only tables.
//
// Uses Story 1.6's closed-failure construct (unset scope → '' → nullif → NULL → 0 rows, quiet
// fail-closed) — identical to `member-withdrawals-rls.ts`.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { dataExports } from '../schema/data_exports.js';
import { appRole } from './_roles.js';

export const dataExportsTenantIsolationSelect = pgPolicy('data_exports_tenant_isolation_select', {
  as: 'permissive',
  for: 'select',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(dataExports);

export const dataExportsTenantIsolationWrite = pgPolicy('data_exports_tenant_isolation_write', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
}).link(dataExports);
