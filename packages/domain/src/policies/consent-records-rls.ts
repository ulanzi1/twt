// RLS policy declarations for `consent_records` — Story 2.7 (Task 1).
//
// TENANT-ISOLATED read + write — mirrors `terms-and-conditions-versions-rls.ts` /
// `clause-versions-rls.ts`, NOT the `pariwar-passport-rls.ts` cross-readable
// carve-out. Rationale (ADR-0020 / Story 2.7 Dev Notes §"RLS posture"): consent is
// per-tenant; a member's consents are read under that Pariwar's `app.pariwar_id`.
// The `pariwar_passport` cross-readable carve-out stays the SINGLE positive
// exception to the Story 1.6 leak invariant.
//
// Uses Story 1.6's exact closed-failure construct
// `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`:
// unset scope → '' → nullif → NULL → `pariwar_id = NULL` is "no match" → 0 rows
// (quiet fail-closed), rather than erroring on a `''::uuid` cast.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { consentRecords } from '../schema/consent_records.js';
import { appRole } from './_roles.js';

/**
 * SELECT isolation: a query under `app.pariwar_id = X` reads only rows whose
 * `pariwar_id = X` (so `consentExists` / `listConsents` resolve only that Pariwar's
 * consents). Unset session variable → nullif → NULL → 0 rows.
 */
export const consentRecordsTenantIsolationSelect = pgPolicy(
  'consent_records_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(consentRecords);

/**
 * Write isolation (`for: 'all'` covers the grant INSERT + the revoke UPDATE; there
 * is NO delete — a consent is revoked via `revoked_at` mutate, never row-deleted,
 * AC3). `withCheck` defends against an INSERT/UPDATE that would create/move a row
 * owned by a different tenant.
 */
export const consentRecordsTenantIsolationWrite = pgPolicy(
  'consent_records_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(consentRecords);
