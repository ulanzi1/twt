// `claim_appeal_panel_sessions` — the Stage-2 State-Trustee appeal PANEL store (Story 6.16, Task 1; D-B).
//
// Mirrors `claim_r9_voting_sessions` (Story 6.14) MINUS the niyamavali clause registry (clause_id /
// clause_version_id / rule_code / voting_requirement) — an appeal panel votes on the APPEAL, not on a
// clause. The panel authority (AC3): the IMMUTABLE panel roster captured + validated at open, the
// snapshotted quorum, the R5 opener/finalizer attribution, and — once finalized — the computed outcome +
// tally. Claim STATE is derived from the paired `claim.appeal_stage2_reviewed` event, NEVER from this table.
//
// ── The IMMUTABLE panel + the load-bearing DB invariants (AC3/D-B) ──────────────────────────────
//   · (outcome IS NULL) = (finalized_at IS NULL) = (reverse_count IS NULL) = (deny_count IS NULL)
//     = (finalized_by_actor IS NULL) = (finalized_display IS NULL) — all set together on finalize.
//   · reverse_count >= 0, deny_count >= 0.
//   · cardinality(panel_actor_ids) >= 2 (D-B PANEL MINIMUM — PRD-mandated, STRICTER than R9's ≥1 floor).
//   · quorum_required BETWEEN 1 AND cardinality(panel_actor_ids).
//   · finalized tally within the immutable panel size (reverse_count + deny_count <= cardinality).
// Uniqueness is the partial-unique `(claim_case_id) WHERE superseded_at IS NULL` — at most ONE non-superseded
// session per claim, OPEN OR FINALIZED (a finalized session blocks re-opening; re-voting requires cancel).
//
// ── PII discipline (AC3/AC10) ───────────────────────────────────────────────────────────────────
//   · opened_display / finalized_display — controlled staff-attribution DISPLAY strings (R5), plaintext,
//     decision-time SNAPSHOTs, NEVER email-derived. NOT in the claim.appeal_stage2_reviewed event.
//   · outcome / counts / panel_actor_ids / quorum_required → NON-PII. No per-vote rationale lives here (that
//     is the Tier-1 ciphertext on claim_appeal_panel_votes).
//
// TENANT-ISOLATED (mirrors `claims` / `claim_r9_voting_sessions`). RLS in
// policies/claim-appeal-panel-sessions-rls.ts.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { appealPanelOutcomeEnum } from '../claim/appeal.js';
import type { AppealPanelSessionId, ClaimId, PariwarId } from '../ids/index.js';
import { claims } from './claims.js';

export const claimAppealPanelSessions = pgTable(
  'claim_appeal_panel_sessions',
  {
    // Per-session id (the panel + finalize anchor). Branded AppealPanelSessionId.
    sessionId: uuid('session_id').defaultRandom().primaryKey().$type<AppealPanelSessionId>(),

    // The claim this panel votes on (FK → claims; branded ClaimId == the events_log stream_id). ON DELETE
    // CASCADE mirrors claim_r9_voting_sessions.
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // ── The IMMUTABLE panel roster + quorum (AC3/D-B) — captured + validated at open, frozen thereafter ──
    // Each actor validated to hold claim.appeal_vote @ this Pariwar at open. Minimum size 2 (D-B).
    panelActorIds: text('panel_actor_ids').array().notNull().$type<string[]>(),
    // The snapshotted quorum (v1 `⌊N/2⌋+1`) gating finalize.
    quorumRequired: integer('quorum_required').notNull(),

    // ── Open-time R5 attribution ──
    openedByActor: text('opened_by_actor').notNull(),
    openedDisplay: text('opened_display').notNull(),
    openedAt: timestamp('opened_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    // ── Finalize outcome (set together on finalize; NULL while open — the coupling CHECKs enforce it) ──
    // The finalized panel outcome (reversed | advance). Claim STATE is derived from the paired
    // claim.appeal_stage2_reviewed event, NEVER from this column (AC9). In v1 a panel never `upheld`s (D-C).
    outcome: appealPanelOutcomeEnum('outcome'),
    reverseCount: integer('reverse_count'),
    denyCount: integer('deny_count'),
    finalizedByActor: text('finalized_by_actor'),
    finalizedDisplay: text('finalized_display'),
    finalizedAt: timestamp('finalized_at', { withTimezone: true, mode: 'date' }),

    // When this session was superseded (cancelled — AC3). NULL = the LIVE/current session.
    supersededAt: timestamp('superseded_at', { withTimezone: true, mode: 'date' }),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    index('claim_appeal_panel_sessions_pariwar_id_idx').on(t.pariwarId),
    index('claim_appeal_panel_sessions_claim_case_id_idx').on(t.claimCaseId),
    // At most ONE non-superseded session per claim, OPEN OR FINALIZED.
    uniqueIndex('claim_appeal_panel_sessions_one_live_per_claim_uq')
      .on(t.claimCaseId)
      .where(sql`superseded_at IS NULL`),
    // The outcome/finalize/counts/attribution coupling (a session is OPEN xor FINALIZED — six fields move
    // together).
    check(
      'claim_appeal_panel_sessions_outcome_finalized_at_coupled',
      sql`(${t.outcome} IS NULL) = (${t.finalizedAt} IS NULL)`,
    ),
    check(
      'claim_appeal_panel_sessions_outcome_reverse_count_coupled',
      sql`(${t.outcome} IS NULL) = (${t.reverseCount} IS NULL)`,
    ),
    check(
      'claim_appeal_panel_sessions_outcome_deny_count_coupled',
      sql`(${t.outcome} IS NULL) = (${t.denyCount} IS NULL)`,
    ),
    check(
      'claim_appeal_panel_sessions_outcome_finalized_by_actor_coupled',
      sql`(${t.outcome} IS NULL) = (${t.finalizedByActor} IS NULL)`,
    ),
    check(
      'claim_appeal_panel_sessions_outcome_finalized_display_coupled',
      sql`(${t.outcome} IS NULL) = (${t.finalizedDisplay} IS NULL)`,
    ),
    check('claim_appeal_panel_sessions_reverse_count_nonneg', sql`${t.reverseCount} IS NULL OR ${t.reverseCount} >= 0`),
    check('claim_appeal_panel_sessions_deny_count_nonneg', sql`${t.denyCount} IS NULL OR ${t.denyCount} >= 0`),
    // D-B — the panel is at least 2 members and the quorum is a sane fraction of it.
    check('claim_appeal_panel_sessions_panel_min_two', sql`cardinality(${t.panelActorIds}) >= 2`),
    check(
      'claim_appeal_panel_sessions_quorum_within_panel',
      sql`${t.quorumRequired} >= 1 AND ${t.quorumRequired} <= cardinality(${t.panelActorIds})`,
    ),
    // The tally must not exceed the immutable panel size (the panel-size-denominator invariant).
    check(
      'claim_appeal_panel_sessions_tally_within_panel',
      sql`${t.outcome} IS NULL OR (${t.reverseCount} + ${t.denyCount} <= cardinality(${t.panelActorIds}))`,
    ),
  ],
);

export type ClaimAppealPanelSessionRow = typeof claimAppealPanelSessions.$inferSelect;
export type ClaimAppealPanelSessionInsert = typeof claimAppealPanelSessions.$inferInsert;
