// RLS policy declarations for `member_medical_disclosures` — Story 3.5 (Task 1).
//
// TENANT-ISOLATED read + write — mirrors `member-nominees-rls.ts` / `member-kyc-profiles-rls.ts`,
// NOT the global identity-auth carve-out. A member's disclosure history belongs to exactly one
// Pariwar; the in-scope append write + the history read run under that Pariwar's
// `app.pariwar_id`. There is NO pre-scope / servicePool read path here (every disclosure access
// is fully member-session-gated).
//
// The write policy is `for: 'all'` (mirroring member-nominees) but the migration GRANT excludes
// UPDATE/DELETE — the disclosures are APPEND-ONLY immutable history (R2), so the only write the
// grant permits is INSERT; the policy still guards that INSERT's WITH CHECK predicate.
//
// Uses Story 1.6's closed-failure construct (unset scope → '' → nullif → NULL → 0 rows,
// quiet fail-closed) — identical to `member-nominees-rls.ts`.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { memberMedicalDisclosures } from '../schema/member_medical_disclosures.js';
import { appRole } from './_roles.js';

export const memberMedicalDisclosuresTenantIsolationSelect = pgPolicy(
  'member_medical_disclosures_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberMedicalDisclosures);

export const memberMedicalDisclosuresTenantIsolationWrite = pgPolicy(
  'member_medical_disclosures_tenant_isolation_write',
  {
    as: 'permissive',
    for: 'all',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberMedicalDisclosures);
