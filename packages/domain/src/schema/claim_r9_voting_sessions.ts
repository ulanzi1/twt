// `claim_r9_voting_sessions` — the R9 special-case voting PANEL store (Story 6.14, Task 2; D-D).
//
// The panel authority (AC2/AC4): the applicable R9 sub-clause snapshot (clause_id + the registry
// clause_version_id + rule_code + the DATA-derived voting_requirement), the IMMUTABLE panel roster
// (panel_actor_ids) captured + validated at open, the snapshotted quorum_required, the R5 opener/finalizer
// attribution, and — once finalized — the computed outcome + tally. It is NOT a projection of the claim
// lifecycle and the lifecycle is NOT a projection of it: the paired `claim.r9_outcome` event in `events_log`
// is the LIFECYCLE authority (state comes from event replay, Story 6.1 §1.14 freeze); THIS table is the
// panel/decision-metadata authority. Both are written in the SAME transaction on finalize so they cannot
// diverge (mirrors `claim_state_trustee_decisions`, 6.13). Any code that derives claim STATE from this
// table is wrong.
//
// ── The IMMUTABLE panel + the load-bearing DB invariants (AC2/AC4/AC11) ──────────────────────
// The panel roster is frozen at open (no add/remove for the life of the session); the DB CHECKs encode the
// coupling invariants so they hold even against a raw write:
//   · (outcome IS NULL) = (finalized_at IS NULL) = (approve_count IS NULL) = (deny_count IS NULL)
//     — outcome + finalize timestamp + counts are set together (a session is open XOR finalized).
//   · approve_count >= 0, deny_count >= 0.
//   · cardinality(panel_actor_ids) >= 1 (a non-empty roster).
//   · quorum_required BETWEEN 1 AND cardinality(panel_actor_ids) (the panel-quorum invariant, #1).
// Uniqueness is the STRENGTHENED partial-unique `(claim_case_id) WHERE superseded_at IS NULL` — at most ONE
// non-superseded session per claim, OPEN OR FINALIZED (a finalized session blocks re-opening; re-voting
// requires cancel-first — AC2/AC5).
//
// ── PII discipline (AC10) ─────────────────────────────────────────────────────────────────────
//   · opened_display / finalized_display — controlled staff-attribution DISPLAY strings (R5), plaintext by
//     deliberate decision (their purpose is display on audit surfaces), decision-time SNAPSHOTs, NEVER
//     email-derived. NOT in the `claim.r9_outcome` event (that carries the non-PII tally/rule snapshot only).
//   · clause_id / clause_version_id / rule_code / voting_requirement / outcome / counts / panel_actor_ids /
//     quorum_required → NON-PII (safe for the audit context). No per-vote rationale lives here (that is the
//     Tier-1 ciphertext on `claim_r9_votes`).
//
// TENANT-ISOLATED (mirrors `claims` / `claim_state_trustee_decisions`). RLS in
// policies/claim-r9-voting-sessions-rls.ts.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { r9SessionOutcomeEnum, r9VotingRequirementEnum } from '../claim/r9-voting.js';
import type { ClaimId, ClauseVersionId, PariwarId, R9VotingSessionId } from '../ids/index.js';
import { claims } from './claims.js';
import { clauseVersions } from './clause_versions.js';

export const claimR9VotingSessions = pgTable(
  'claim_r9_voting_sessions',
  {
    // Per-session id (the addressable unit; the panel + finalize anchor). Branded R9VotingSessionId.
    sessionId: uuid('session_id').defaultRandom().primaryKey().$type<R9VotingSessionId>(),

    // The claim this panel votes on (FK → claims; branded ClaimId == the events_log stream_id). ON DELETE
    // CASCADE mirrors claim_state_trustee_decisions.
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // ── The registry rule snapshot (AC2/D-B) — captured at open, immutable ──
    // The applicable R9 sub-clause id (one of the three `route_r9_voting` clauses).
    clauseId: text('clause_id').notNull(),
    // The Story 2.3 registry version resolved at open (resolveByClauseId). The authoritative provenance.
    // FK → clause_versions (added via migration 0066, code review 2026-07-14 — 0063 already applied).
    clauseVersionId: uuid('clause_version_id')
      .notNull()
      .$type<ClauseVersionId>()
      .references(() => clauseVersions.clauseVersionId),
    // The clause payload's `rule_code` snapshot (e.g. 'R9' | 'R9(A)' | 'R9(Mar-2025)') — non-PII display.
    ruleCode: text('rule_code').notNull(),
    // The DATA-derived approval requirement (v1 seed → majority). Forward-compat supermajority/unanimous.
    votingRequirement: r9VotingRequirementEnum('voting_requirement').notNull(),

    // ── The IMMUTABLE panel roster + quorum (AC2/#1) — captured + validated at open, frozen thereafter ──
    // The eligible-voter set: each actor validated to hold claim.r9_vote @ this Pariwar at open. Non-empty.
    panelActorIds: text('panel_actor_ids').array().notNull().$type<string[]>(),
    // The snapshotted quorum (v1 `⌊N/2⌋+1`) gating finalize. Persisted so the gate + audit are explicit.
    quorumRequired: integer('quorum_required').notNull(),

    // ── Open-time R5 attribution ──
    // The trustee who opened the panel (an actor id, not a name → non-PII). The query/join key.
    openedByActor: text('opened_by_actor').notNull(),
    // The open-time SNAPSHOT of the opener's users.display_name (R5). REQUIRED — the writer resolves it
    // server-side FIRST and blocks with AdminDisplayNameMissingError when absent (no fallback). Plaintext.
    openedDisplay: text('opened_display').notNull(),
    openedAt: timestamp('opened_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    // ── Finalize outcome (set together on finalize; NULL while open — the coupling CHECK enforces it) ──
    // The finalized outcome (approved | denied). Claim STATE is derived from the paired claim.r9_outcome
    // event, NEVER from this column (AC0/AC10).
    outcome: r9SessionOutcomeEnum('outcome'),
    approveCount: integer('approve_count'),
    denyCount: integer('deny_count'),
    // The finalizing trustee (an actor id) + the finalize-time R5 display SNAPSHOT (non-PII / plaintext).
    finalizedByActor: text('finalized_by_actor'),
    finalizedDisplay: text('finalized_display'),
    finalizedAt: timestamp('finalized_at', { withTimezone: true, mode: 'date' }),

    // When this session was superseded (cancelled — AC5). NULL = the LIVE/current session (the partial-unique
    // keys off this). A superseded session stays in the transcript for audit.
    supersededAt: timestamp('superseded_at', { withTimezone: true, mode: 'date' }),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // Per-tenant scans / RLS-aware planner hint (pariwar_id leads, mirroring claims).
    index('claim_r9_voting_sessions_pariwar_id_idx').on(t.pariwarId),
    // This claim's session(s) — the queue's finalized-session check + the per-claim panel read.
    index('claim_r9_voting_sessions_claim_case_id_idx').on(t.claimCaseId),
    // AC2/#4 STRENGTHENED uniqueness — at most ONE non-superseded session per claim, OPEN OR FINALIZED.
    uniqueIndex('claim_r9_voting_sessions_one_live_per_claim_uq')
      .on(t.claimCaseId)
      .where(sql`superseded_at IS NULL`),
    // AC11 — the outcome/finalize/counts coupling (a session is OPEN xor FINALIZED; the four fields move together).
    check(
      'claim_r9_voting_sessions_outcome_finalized_at_coupled',
      sql`(${t.outcome} IS NULL) = (${t.finalizedAt} IS NULL)`,
    ),
    check(
      'claim_r9_voting_sessions_outcome_approve_count_coupled',
      sql`(${t.outcome} IS NULL) = (${t.approveCount} IS NULL)`,
    ),
    check(
      'claim_r9_voting_sessions_outcome_deny_count_coupled',
      sql`(${t.outcome} IS NULL) = (${t.denyCount} IS NULL)`,
    ),
    check('claim_r9_voting_sessions_approve_count_nonneg', sql`${t.approveCount} IS NULL OR ${t.approveCount} >= 0`),
    check('claim_r9_voting_sessions_deny_count_nonneg', sql`${t.denyCount} IS NULL OR ${t.denyCount} >= 0`),
    // AC2/#1 — the panel is non-empty and the quorum is a sane fraction of it (the panel-quorum invariant).
    check('claim_r9_voting_sessions_panel_non_empty', sql`cardinality(${t.panelActorIds}) >= 1`),
    check(
      'claim_r9_voting_sessions_quorum_within_panel',
      sql`${t.quorumRequired} >= 1 AND ${t.quorumRequired} <= cardinality(${t.panelActorIds})`,
    ),
    // Added migration 0067 (code review 2026-07-14) — the R5 finalizer-attribution fields move together WITH
    // outcome, same as approve_count/deny_count above; a finalized session with a null finalizer identity is
    // otherwise only caught by the apps/api handler's runtime guard, not the DB.
    check(
      'claim_r9_voting_sessions_outcome_finalized_by_actor_coupled',
      sql`(${t.outcome} IS NULL) = (${t.finalizedByActor} IS NULL)`,
    ),
    check(
      'claim_r9_voting_sessions_outcome_finalized_display_coupled',
      sql`(${t.outcome} IS NULL) = (${t.finalizedDisplay} IS NULL)`,
    ),
    // Added migration 0067 — the tally must not exceed the immutable panel size (the panel-size-denominator
    // invariant `computeR9Outcome` already assumes; a write-path bug producing an inflated count is otherwise
    // only caught by application code).
    check(
      'claim_r9_voting_sessions_tally_within_panel',
      sql`${t.outcome} IS NULL OR (${t.approveCount} + ${t.denyCount} <= cardinality(${t.panelActorIds}))`,
    ),
  ],
);

export type ClaimR9VotingSessionRow = typeof claimR9VotingSessions.$inferSelect;
export type ClaimR9VotingSessionInsert = typeof claimR9VotingSessions.$inferInsert;
