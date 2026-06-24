// RLS policy declarations for `terms_and_conditions_versions` — Story 2.6 (Task 1).
//
// TENANT-ISOLATED read + write — mirrors `clause-versions-rls.ts`, NOT the
// `pariwar-passport-rls.ts` cross-readable carve-out. Rationale (ADR-0020 / Story
// 2.6 Dev Notes §"RLS posture"): the T&C IS publicly rendered (FR-79, `/terms`),
// but each Pariwar's public site reads with `app.pariwar_id` set to that Pariwar —
// a tenant-scoped SELECT already serves it. The `pariwar_passport` cross-readable
// carve-out stays the SINGLE positive exception to the Story 1.6 leak invariant.
//
// Uses Story 1.6's exact closed-failure construct
// `pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`:
// unset scope → '' → nullif → NULL → `pariwar_id = NULL` is "no match" → 0 rows
// (quiet fail-closed), rather than erroring on a `''::uuid` cast.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { termsAndConditionsVersions } from '../schema/terms_and_conditions_versions.js';
import { appRole } from './_roles.js';

/**
 * SELECT isolation: a query under `app.pariwar_id = X` reads only rows whose
 * `pariwar_id = X` (so the public render serves only that Pariwar's T&C). Unset
 * session variable → nullif → NULL → 0 rows.
 */
export const termsAndConditionsVersionsTenantIsolationSelect = pgPolicy(
  'terms_and_conditions_versions_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(termsAndConditionsVersions);

/**
 * Write isolation (`for: 'all'` covers insert | update | delete). UPDATE is
 * legitimate here (approve flips `legal_review_status` + sets
 * `legal_reviewer_actor_id`; supersede sets `effective_until` +
 * `legal_review_status`). `withCheck` defends against an INSERT/UPDATE that would
 * create/move a row owned by a different tenant.
 */
export const termsAndConditionsVersionsTenantIsolationWrite = pgPolicy(
  'terms_and_conditions_versions_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(termsAndConditionsVersions);
