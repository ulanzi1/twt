// RLS policy declaration for the `audit_integrity_checks` table — Story 1.11a (DD-3).
//
// Architecture §1.2 L715-770 — RLS is the typed-constraint enforcement of
// Cross-Cutting #1. Story 1.6 invariant: every table `twt_app` touches is
// RLS-forced. audit_integrity_checks is FORCE-RLS like every other twt_app table.
//
// ── USING(true) carve-out (the deliberate difference from the *scoped* tables) ──
// Unlike audit_log_entries / events_log (tenant-isolated on `pariwar_id`),
// audit_integrity_checks has NO `pariwar_id` dimension — it is a GLOBAL verdict
// ledger about the ONE global audit chain (DD-3). There is therefore nothing to
// tenant-scope. Rather than leave the table un-RLS'd (which would breach the
// Story 1.6 "every twt_app table is FORCE-RLS" invariant and read as an
// oversight), it gets ENABLE + FORCE RLS plus an explicit `USING(true)` SELECT
// policy: the visible, auditable line that says "global table — no row is hidden
// from a twt_app reader". This mirrors the identity/auth carve-out family's
// regime-consistency posture (R2). Reads are SELECT-only: the writer is the
// BYPASSRLS service role (the integrity job), and the table is append-only
// (migration 0008 triggers) — twt_app never writes verdicts.
//
// `twt_app` is granted SELECT only (migration 0009); the integrity-check writer
// runs under the BYPASSRLS service role (`twt_service`-login), so — exactly as
// for audit_log_entries (W2-CR1.6) — no permissive write policy is needed or
// correct here (a BYPASSRLS session is exempt from every policy anyway).

import { sql } from 'drizzle-orm';
import { pgPolicy } from 'drizzle-orm/pg-core';

import { auditIntegrityChecks } from '../schema/audit_integrity_checks.js';
import { appRole } from './_roles.js';

/**
 * SELECT carve-out: any `twt_app` session reads every integrity-check verdict
 * (the 1.11b trustee UI's read path). `USING(true)` because the chain — and thus
 * its verdicts — is global; there is no tenant dimension to scope on. FORCE RLS
 * (migration 0009) keeps the table inside the Story 1.6 RLS regime regardless.
 */
export const auditIntegrityChecksGlobalSelect = pgPolicy(
  'audit_integrity_checks_global_select',
  {
    as: 'permissive',
    for: 'select',
    to: appRole,
    using: sql`true`,
  },
).link(auditIntegrityChecks);
