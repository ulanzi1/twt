// `intake_attempts` table — Story 6.4 substrate (the ICP dedup ledger).
//
// The durable, audited record of every intake ATTEMPT arriving through the ICP — the
// first-class formalization of the ephemeral `created: false` return 6.2/6.3 do today.
// One row per attempt; `attempt_status` projects its resolution:
//   · `pending`             — a cross-channel second intake awaiting operator/trustee
//                             resolution on the <ConvergenceDecisionStrip> (AC3/AC9).
//   · `converged`           — folded into a canonical claim (lone auto-converge, or an
//                             authorized merge); `superseded_by_claim_case_id` is set.
//   · `overridden_separate` — the operator treated it as a distinct case (AC4); a NEW
//                             canonical claim was minted, `superseded_by_claim_case_id` = it.
//
// ── intake_attempt_id is the AC7-forbidden-downstream id ──────────────────────
// This id is TEMPORARY / channel-originating. AC7 forbids any downstream flow
// (verification / appeal / publication / notification) from using it as a lookup key —
// after convergence the ONLY id that persists is the canonical `ClaimId`. The
// claim-canonical-id-invariant CI gate (Task 9) mechanizes that boundary.
//
// ── attempt_status is a PLAIN projected column, NOT an event-sourced state cache ─
// Unlike `claims.current_state` (replay-derived, projector-only, trigger-guarded),
// `attempt_status` is an ordinary column flipped by the convergence resolution writers
// (icp.ts). No DB trigger, no CI gate — a status projection, not a lifecycle cache.
//
// Naming discipline per architecture line 3663-3677: DB columns snake_case, TS fields
// camelCase. Table snake_case-plural. Header style mirrors schema/claims.ts.

import { sql } from 'drizzle-orm';
import { index, pgEnum, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import type { ClaimId, IntakeAttemptId, MemberId, PariwarId } from '../ids/index.js';
import { claimIntakeChannelEnum } from './claims.js';

/**
 * The intake-attempt resolution status — the ONE spelling authority (Task 1). Both the
 * pgEnum (DB CREATE TYPE) and the `IntakeAttemptStatus` TS union derive from this tuple.
 *   · `pending`             — cross-channel second intake awaiting resolution.
 *   · `converged`           — folded into a canonical claim (auto-converge OR merge).
 *   · `overridden_separate` — treated as a distinct case; a new canonical claim minted.
 */
export const INTAKE_ATTEMPT_STATUSES = ['pending', 'converged', 'overridden_separate'] as const;

/** pgEnum (`CREATE TYPE intake_attempt_status`) derived from the one tuple. */
export const intakeAttemptStatusEnum = pgEnum('intake_attempt_status', INTAKE_ATTEMPT_STATUSES);

/** The intake-attempt-status literal union — derived from the same tuple (no drift). */
export type IntakeAttemptStatus = (typeof INTAKE_ATTEMPT_STATUSES)[number];

export const intakeAttempts = pgTable(
  'intake_attempts',
  {
    // The temporary / channel-originating id (the AC7-forbidden-downstream lookup key).
    // Caller-supplied (the ICP mints it, like claim_case_id) — NO gen_random_uuid()
    // default. Branded IntakeAttemptId.
    intakeAttemptId: uuid('intake_attempt_id').primaryKey().$type<IntakeAttemptId>(),

    // Multi-tenant scope (architecture §1.2). RLS predicate column; branded.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The deceased member this attempt is filed against (the dedup key's member axis).
    deceasedMemberId: uuid('deceased_member_id').notNull().$type<MemberId>(),

    // The SINGLE originating channel of THIS attempt (NOT the array — the set lives on
    // claims.intake_channels). Reuses the existing claim_intake_channel enum.
    intakeChannel: claimIntakeChannelEnum('intake_channel').notNull(),

    // The filer (nominee / Ravi-mode / operator). Nullable (v1 null-claimant policy).
    claimantActorId: uuid('claimant_actor_id'),

    // The resolution status — a PLAIN projected column (no trigger, no CI gate).
    attemptStatus: intakeAttemptStatusEnum('attempt_status').notNull(),

    // The canonical claim this attempt resolved into (AC7 "superseded_by"). NULL while
    // pending; set to the canonical ClaimId on converge/override. Reuses the ClaimId
    // brand (same canonical id) — NO FK to claims (mirror claims.deceased_member_id's
    // no-FK-to-RLS-forced-table posture).
    supersededByClaimCaseId: uuid('superseded_by_claim_case_id').$type<ClaimId>(),

    // NULL = system / SIE (architecture §1.14 line 1262-1268).
    createdByActor: uuid('created_by_actor'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    // Stamped when attempt_status leaves `pending` (converge / override) — the resolving
    // operator/trustee actor id (mirrors convergence_overrides.decided_by_actor for the
    // override path; the merge path has no separate ledger row, so it lives here).
    resolvedByActor: uuid('resolved_by_actor'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }),
  },
  (t) => [
    // The dedup-window candidate scan (AC1): (pariwar_id, deceased_member_id, created_at).
    index('intake_attempts_dedup_window_idx').on(t.pariwarId, t.deceasedMemberId, t.createdAt),
    // Defense-in-depth (Review): at most ONE `pending` attempt per (death, channel) — scoped
    // by channel so the intentional cross-channel multi-pending case (member-app + helpline
    // both pending for one death) is never blocked; the advisory lock (icp.ts
    // acquireIntakeLock) is the primary guard, this is a DB-level backstop.
    uniqueIndex('intake_attempts_one_pending_per_channel_idx')
      .on(t.pariwarId, t.deceasedMemberId, t.intakeChannel)
      .where(sql`attempt_status = 'pending'`),
  ],
);

// Inferred row types for the accessor read/write paths (claims precedent).
export type IntakeAttemptRow = typeof intakeAttempts.$inferSelect;
export type IntakeAttemptInsert = typeof intakeAttempts.$inferInsert;
