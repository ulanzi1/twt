// RLS policy declarations for `member_restoration_impositions` — Story 10.23 (Task 2; AC1).
//
// TENANT-ISOLATED read + APPEND-ONLY write — the `member-moderation-actions-rls.ts` /
// `member-addresses-rls.ts` append-only-history posture. There is deliberately NO DELETE policy and,
// unlike `member_moderation_actions`, **NO UPDATE policy either**.
//
// ── Why no UPDATE leg exists here, when moderation needed one ───────────────────────────────────
// Migration 0092 had to grant a column-scoped UPDATE on `member_moderation_actions` because
// `rationale_ciphertext` is Tier-1 PII and 0091's SELECT+INSERT-only posture made it structurally
// UN-ERASABLE: an RTBF is a SOFT delete, so the `ON DELETE cascade` FK never fires, and with no
// UPDATE privilege the DPDPA scrub could not be written at all.
//
// **That collision cannot arise here, because this instrument has no Tier-1 byte to erase** (D5):
// the imposition is automatic, so there is no rationale, no actor display name and no PII column of
// any kind — only registry identifiers, a governance number and two instants. Append-only therefore
// holds ABSOLUTELY, with no relaxation anywhere. An imposition is an immutable historical fact, and
// expiry happens by the clock (AC4), never by mutating a row.
//
// ⚠ If a future story adds a PII column to this table, it MUST revisit this file and 0097's grants
// together — the erasure right and an un-updatable row are in direct tension, and 0092 is the
// worked example of resolving it (a COLUMN-level privilege, not a table-level one).
//
// Uses Story 1.6's closed-failure construct (unset scope → '' → nullif → NULL → 0 rows, quiet
// fail-closed) — identical to `member-moderation-actions-rls.ts`.

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { memberRestorationImpositions } from '../schema/member_restoration_impositions.js';
import { appRole } from './_roles.js';

export const memberRestorationImpositionsTenantIsolationSelect = pgPolicy(
  'member_restoration_impositions_tenant_isolation_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberRestorationImpositions);

export const memberRestorationImpositionsTenantIsolationInsert = pgPolicy(
  'member_restoration_impositions_tenant_isolation_insert',
  {
    as: 'permissive',
    for: 'insert',
    to: appRole,
    withCheck: sql`pariwar_id = nullif(current_setting('app.pariwar_id', true), '')::uuid`,
  },
).link(memberRestorationImpositions);
