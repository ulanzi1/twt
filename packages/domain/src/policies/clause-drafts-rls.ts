// RLS policy declarations for the `clause_drafts` table — Story 2.4 (Task 1).
//
// TENANT-ISOLATED read + write — mirrors `clause-versions-rls.ts`. Drafts are
// pre-publish internal trustee state (pending content + sign-off attribution),
// NEVER cross-readable: the `pariwar_passport` cross-readable carve-out stays the
// single positive exception to the Story 1.6 leak invariant (the clause-versions-rls
// rationale applies identically — a tenant's drafts are even more private than its
// published clauses).
//
// Uses Story 1.6's exact closed-failure construct
// `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`:
// unset scope → '' → nullif → NULL → `pariwar_id = NULL` is "no match" → 0 rows
// (quiet fail-closed), rather than erroring on a `''::uuid` cast.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { clauseDrafts } from '../schema/clause_drafts.js';
import { appRole } from './_roles.js';

/**
 * SELECT isolation: a query under `app.pariwar_id = X` reads only rows whose
 * `pariwar_id = X` (so the non-author reviewer loads only their own tenant's
 * drafts). Unset session variable → nullif → NULL → 0 rows.
 */
export const clauseDraftsTenantIsolationSelect = pgPolicy(
  'clause_drafts_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(clauseDrafts);

/**
 * Write isolation (`for: 'all'` covers insert | update | delete). UPDATE is
 * legitimate here (the draft is edited + transitions through the state machine);
 * `withCheck` defends against an INSERT/UPDATE that would create/move a row owned
 * by a different tenant.
 */
export const clauseDraftsTenantIsolationWrite = pgPolicy(
  'clause_drafts_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(clauseDrafts);
