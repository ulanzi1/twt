// `claim_warning_approvals` — the record of every approval over a nominee-change warning (Story 6.23a, Task 1; NW13,
// NW14; migration 0143).
//
// ⭐ fact 4: the warnings move with the accepted certificate date, so "which warnings an approval covered" is a RECORD,
// ⛔ never a recomputation (invariant 8). Each row SNAPSHOTS the warning KEYS it covered and the reason chosen.
//   · `district_admin_approval`    — written by `adjudicateClaim` in the approve's own transaction (its note is the
//                                    decision row's rationale).
//   · `district_admin_late_reason` — NW14: an answer to a warning that appeared after that approval; its OWN note.
// 6.23b widens `step` with the later approvers' steps — those rows ⛔ never count toward the District Admin's coverage.
//
// PII: `note_ciphertext` → Tier-1 (`claim_warning_approval`) free text; scrubbed by `anonymizeMember` through
// `deceased_member_id` (Trap 14). Everything else is non-PII (codes, keys, ids, a snapshotted staff display).
// Append-only by grant (SELECT, INSERT + UPDATE on the note for RTBF only) and by trigger (0143) — NW18: a written note
// is ⛔ never replaced. TENANT-ISOLATED; RLS in policies/claim-warning-approvals-rls.ts.

import { sql } from 'drizzle-orm';
import { check, foreignKey, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { piiColumn } from '../encryption/column.js';
import type { ClaimId, MemberId, PariwarId, VerifierDecisionId } from '../ids/index.js';
import { approvalWarningReasons } from './approval_warning_reasons.js';
import { claimVerifierDecisions } from './claim_verifier_decisions.js';
import { claims } from './claims.js';

/** The record's steps (6.23a's two — 6.23b widens). ⚠ LOCKSTEP with 0143's `step` CHECK and the contracts mirror. */
export const CLAIM_WARNING_APPROVAL_STEPS = ['district_admin_approval', 'district_admin_late_reason'] as const;
export type ClaimWarningApprovalStep = (typeof CLAIM_WARNING_APPROVAL_STEPS)[number];

/**
 * The District Admin's steps — the ONLY rows that count toward the District Admin's coverage (Trap 13; NW13). The
 * `district_admin_` prefix is load-bearing: 0143's step ⇔ `verifier_decision_id` CHECK keys on it.
 */
export const DISTRICT_ADMIN_WARNING_STEPS = ['district_admin_approval', 'district_admin_late_reason'] as const;

export const claimWarningApprovals = pgTable(
  'claim_warning_approvals',
  {
    recordId: uuid('record_id').defaultRandom().primaryKey(),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    // COMPOSITE FK below (with pariwarId) — ⛔ no inline `.references()` (code review 2026-10-05): a
    // single-column FK here would let a row point at another Pariwar's claim, since FK checks bypass RLS.
    claimCaseId: uuid('claim_case_id').notNull().$type<ClaimId>(),
    /** For ERASURE only (Trap 14) — the anonymizer filters on it directly. */
    deceasedMemberId: uuid('deceased_member_id').notNull().$type<MemberId>(),
    step: text('step').notNull().$type<ClaimWarningApprovalStep>(),
    /**
     * PROVENANCE — the live approval the row answers; NOT NULL ⇔ a `district_admin_*` step. `cascade`
     * (Trap 17). COMPOSITE FK below (with pariwarId) — same cross-tenant reasoning as `claimCaseId`;
     * a NULL `verifierDecisionId` (6.23b's later steps) simply leaves the FK unchecked, as before.
     */
    verifierDecisionId: uuid('verifier_decision_id').$type<VerifierDecisionId>(),
    /** The chosen code, snapshotted (the generic's `warnings_reviewed`, or a stored `awr_…`). */
    reasonCode: text('reason_code').notNull(),
    /** NULL ⇔ the built-in generic; else a composite FK into the SAME Pariwar's list. */
    reasonId: uuid('reason_id'),
    /** The warning KEYS this row covers (`${kind}:${subjectId}`), ≥ 1. */
    coveredKeys: text('covered_keys').array().notNull().$type<string[]>(),
    /** Tier-1 — the late reason's own note (NOT NULL ⇔ `district_admin_late_reason`). */
    noteCiphertext: piiColumn(1, 'claim_warning_approval')('note_ciphertext'),
    recordedByActor: text('recorded_by_actor').notNull(),
    recordedByDisplay: text('recorded_by_display').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true, mode: 'date' }).notNull().default(sql`clock_timestamp()`),
  },
  (t) => [
    foreignKey({
      name: 'claim_warning_approvals_claim_case_fk',
      columns: [t.pariwarId, t.claimCaseId],
      foreignColumns: [claims.pariwarId, claims.claimCaseId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'claim_warning_approvals_verifier_decision_fk',
      columns: [t.pariwarId, t.verifierDecisionId],
      foreignColumns: [claimVerifierDecisions.pariwarId, claimVerifierDecisions.decisionId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'claim_warning_approvals_reason_fk',
      columns: [t.pariwarId, t.reasonId],
      foreignColumns: [approvalWarningReasons.pariwarId, approvalWarningReasons.reasonId],
    }),
    index('claim_warning_approvals_pariwar_claim_idx').on(t.pariwarId, t.claimCaseId),
    index('claim_warning_approvals_verifier_decision_idx').on(t.verifierDecisionId),
    index('claim_warning_approvals_deceased_member_idx').on(t.pariwarId, t.deceasedMemberId),
    index('claim_warning_approvals_reason_idx').on(t.pariwarId, t.reasonId),
    check(
      'claim_warning_approvals_step_check',
      sql`${t.step} IN ('district_admin_approval', 'district_admin_late_reason')`,
    ),
    check(
      'claim_warning_approvals_step_decision_check',
      sql`(left(${t.step}, 15) = 'district_admin_') = (${t.verifierDecisionId} IS NOT NULL)`,
    ),
    check(
      'claim_warning_approvals_step_note_check',
      sql`(${t.step} = 'district_admin_late_reason') = (${t.noteCiphertext} IS NOT NULL)`,
    ),
    check(
      'claim_warning_approvals_generic_reason_check',
      sql`(${t.reasonId} IS NULL) = (${t.reasonCode} = 'warnings_reviewed')`,
    ),
    check('claim_warning_approvals_covered_keys_check', sql`cardinality(${t.coveredKeys}) >= 1`),
    check(
      'claim_warning_approvals_recorded_by_check',
      sql`length(btrim(${t.recordedByActor})) > 0 AND length(btrim(${t.recordedByDisplay})) > 0`,
    ),
  ],
);

export type ClaimWarningApprovalRow = typeof claimWarningApprovals.$inferSelect;
