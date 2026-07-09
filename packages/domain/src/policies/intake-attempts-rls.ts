// RLS policy declarations for `intake_attempts` + `convergence_overrides` — Story 6.4
// (Task 1). The ICP substrate tables.
//
// TENANT-ISOLATED read + write — mirrors `claims-rls.ts` EXACTLY, NOT the
// `pariwar-passport-rls.ts` cross-readable carve-out. An intake attempt (and its
// override ledger line) belongs to exactly one Pariwar; each row is read/written under
// that Pariwar's `app.pariwar_id`.
//
// Uses Story 1.6's exact closed-failure construct
// `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`:
// unset scope → '' → nullif → NULL → `pariwar_id = NULL` is "no match" → 0 rows
// (quiet fail-closed), rather than erroring on a `''::uuid` cast.
//
// NOTE: unlike `claims`, there is NO write-rejection trigger on these tables —
// `intake_attempts.attempt_status` is a PLAIN projected column, not an event-sourced
// state cache (Story 6.4 Task 1). RLS is the only DB-level guard here.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { intakeAttempts } from '../schema/intake_attempts.js';
import { convergenceOverrides } from '../schema/convergence_overrides.js';
import { appRole } from './_roles.js';

/** SELECT isolation for `intake_attempts` (mirror `claims_tenant_isolation_select`). */
export const intakeAttemptsTenantIsolationSelect = pgPolicy(
  'intake_attempts_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(intakeAttempts);

/** Write isolation for `intake_attempts` (`for: 'all'` — INSERT of a new attempt + the
 * pending → converged/overridden_separate status projection). */
export const intakeAttemptsTenantIsolationWrite = pgPolicy(
  'intake_attempts_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(intakeAttempts);

/** SELECT isolation for `convergence_overrides` (the AC4 override ledger). */
export const convergenceOverridesTenantIsolationSelect = pgPolicy(
  'convergence_overrides_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(convergenceOverrides);

/** Write isolation for `convergence_overrides` (append-only ledger INSERT). */
export const convergenceOverridesTenantIsolationWrite = pgPolicy(
  'convergence_overrides_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(convergenceOverrides);
