// RLS policy declaration for `audit_integrity_acknowledgements` — Story 1.11b (DD-5).
//
// Same posture as audit_integrity_checks (Story 1.11a): a GLOBAL append-only
// ledger about the one global chain, so there is NO `pariwar_id` dimension to
// tenant-scope. Rather than leave the table un-RLS'd (which would breach the
// Story 1.6 "every twt_app table is FORCE-RLS" invariant), it gets ENABLE + FORCE
// RLS plus an explicit `USING(true)` SELECT policy — the visible, auditable line
// that says "global table — no row is hidden from a twt_app reader".
//
// twt_app is granted SELECT only (migration 0011); the acknowledge endpoint writes
// through the BYPASSRLS service role (deps.servicePool, the same pool the
// integrity-check writer + the on-demand verify endpoint use), so — exactly as for
// audit_integrity_checks (W2-CR1.6) — no permissive write policy is needed or
// correct here (a BYPASSRLS session is exempt from every policy anyway).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { auditIntegrityAcknowledgements } from '../schema/audit_integrity_acknowledgements.js';
import { appRole } from './_roles.js';

/**
 * SELECT carve-out: any `twt_app` session reads every acknowledgement (the 1.11b
 * trustee UI's banner-persistence read path). `USING(true)` because the chain —
 * and thus its verdicts + their acknowledgements — is global; there is no tenant
 * dimension to scope on. FORCE RLS (migration 0011) keeps the table inside the
 * Story 1.6 RLS regime regardless.
 */
export const auditIntegrityAcknowledgementsGlobalSelect = pgPolicy(
  'audit_integrity_acknowledgements_global_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`true`,
  },
).link(auditIntegrityAcknowledgements);
