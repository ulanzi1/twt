// RLS policy declaration for the `idempotency_keys` table — Story 1.12 (DD-2).
//
// Architecture §1.2 L715-770 — RLS is the typed-constraint enforcement of
// Cross-Cutting #1. Story 1.6 invariant: every table `twt_app` touches is
// RLS-forced. idempotency_keys is FORCE-RLS like every other twt_app table.
//
// ── USING(true) WITH CHECK(true) carve-out — the WRITABLE global variant ───────
// Like audit_integrity_checks (Story 1.11a), idempotency_keys has NO `pariwar_id`
// dimension — it is a GLOBAL infra primitive (DD-2), so there is nothing to
// tenant-scope. But UNLIKE the read-only audit verdict ledger, twt_app WRITES this
// table in the apps/api request path (claim / recordResult). So the carve-out is a
// permissive `ALL` policy with BOTH `USING(true)` (read/update/delete visibility)
// AND `WITH CHECK(true)` (insert/update admission): every twt_app session may
// read and write every key. Callers namespace keys (embedding the tenant id where
// needed) — isolation is a key-naming convention, not a row predicate (DD-2's
// rejected alternative was a pariwar_id column + scoped RLS).
//
// FORCE RLS (migration 0013) keeps the table inside the Story 1.6 regime
// regardless. Background workers connect via the BYPASSRLS service login, which is
// exempt from this policy anyway; they rely on the twt_service table GRANT (0013),
// since BYPASSRLS waives RLS evaluation but NOT table-privilege checks.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { idempotencyKeys } from '../schema/idempotency_keys.js';
import { appRole } from './_roles.js';

/**
 * Permissive ALL carve-out: any `twt_app` session may read AND write every
 * idempotency key. `USING(true)` (visible to read/update/delete) +
 * `WITH CHECK(true)` (admits insert/update) because the keyed store is GLOBAL
 * infra written in the request path; there is no tenant dimension to scope on.
 * FORCE RLS (migration 0013) keeps the table inside the Story 1.6 RLS regime.
 */
export const idempotencyKeysGlobalAll = pgPolicy('idempotency_keys_global_all', {
  as: 'permissive',
  for: 'all',
  to: appRole,
  using: sql`true`,
  withCheck: sql`true`,
}).link(idempotencyKeys);
