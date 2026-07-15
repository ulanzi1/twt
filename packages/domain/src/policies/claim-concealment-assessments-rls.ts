// RLS policy declarations for the verifier concealment-linkage assessment table — Story 6.15 (Task 1).
//
// TENANT-ISOLATED read + write for `claim_concealment_assessments` — mirrors `claim-verifier-decisions-rls.ts`
// EXACTLY (SYMMETRIC; there is deliberately NO 6.13-style asymmetry here — an assessment row belongs to
// exactly one Pariwar, and every access — the write path + the producer read + the queue bulk read — runs
// under that Pariwar's `app.pariwar_id`).
//
// Story 1.6 closed-failure construct: unset scope → 0 rows (quiet fail-closed). A cross-tenant reader sees
// NOTHING (Task 10 asserts this symmetrically).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { claimConcealmentAssessments } from '../schema/claim_concealment_assessments.js';
import { appRole } from './_roles.js';

export const claimConcealmentAssessmentsTenantIsolationSelect = pgPolicy(
  'claim_concealment_assessments_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(claimConcealmentAssessments);

export const claimConcealmentAssessmentsTenantIsolationWrite = pgPolicy(
  'claim_concealment_assessments_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(claimConcealmentAssessments);
