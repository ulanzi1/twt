// `claim_verifier_decisions` — the verifier DECISION-METADATA store (Story 6.11, Task 1).
//
// The DECISION-METADATA authority (AC0): reason-code, encrypted rationale, human-actor display
// attribution, precedent history, and the trustee audit query. It is NOT a projection of the claim
// lifecycle and the lifecycle is NOT a projection of it — the `claim.verifier_*` event in `events_log`
// is the LIFECYCLE authority (state comes from event replay, Story 6.1 §1.14 freeze), THIS table is the
// DECISION-METADATA authority. Both are written in the SAME transaction so they cannot diverge. Any
// code that derives claim STATE from this table, or reads a reason/rationale from the event, is wrong.
//
// ── One LIVE decision per claim; revision supersedes (AC5/AC9) ─────────────────────────────
// A revision (same-outcome reason/rationale correction, D-E) supersedes the prior row and inserts a new
// one in one transaction. The partial-unique `UNIQUE (claim_case_id) WHERE superseded_at IS NULL`
// invariant guarantees AT MOST ONE live (`superseded_at IS NULL`) decision row per claim — the backstop
// that makes a concurrent double-revision impossible to land as two live decisions.
//
// ── PII discipline (D-G / AR-12 / Story 1.16b gate) ────────────────────────────────────────
//   · rationale_ciphertext — arbitrary verifier free-text (can reference member facts) → Tier-1 envelope
//     ciphertext (`piiColumn(1, 'verifier_decision')`). Encrypt-before-insert in the route; the accessor
//     returns ciphertext AS STORED; decrypt only AFTER authorization at the route. NEVER logged, NEVER in
//     an event payload / audit line / index / searchable filter.
//   · outcome / reason_code / actor_id / actor_display / decided_at / pariwar_id / claim_case_id → NON-PII
//     (safe for the audit context + the trustee "actor + reason-code + time_range" filter, AC4).
//     `actor_display` is a controlled staff-attribution DISPLAY string (R5) — plaintext by deliberate
//     decision (its purpose is display on audit surfaces), a decision-time SNAPSHOT (AC7), NEVER
//     email-derived.
//
// TENANT-ISOLATED (mirrors `claims` / `claim_ground_inspections`). RLS in
// policies/claim-verifier-decisions-rls.ts.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { sql } from 'drizzle-orm';
import { type AnyPgColumn, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { verifierDecisionOutcomeEnum, verifierReasonCodeEnum } from '../claim/verifier-decision.js';
import { piiColumn } from '../encryption/column.js';
import type { ClaimId, PariwarId, VerifierDecisionId } from '../ids/index.js';
import { claims } from './claims.js';

export const claimVerifierDecisions = pgTable(
  'claim_verifier_decisions',
  {
    // Per-decision id (the addressable unit). Generated app-side by the writer; defaultRandom is a
    // fallback for bare inserts. Branded VerifierDecisionId.
    decisionId: uuid('decision_id').defaultRandom().primaryKey().$type<VerifierDecisionId>(),

    // The claim this decision is filed against (FK → claims; branded ClaimId == the events_log
    // stream_id). ON DELETE CASCADE mirrors claim_documents / peer-mesh / ground-inspection.
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The adjudication outcome (AC8). The DECISION-METADATA label — claim STATE is derived from the
    // paired claim.verifier_* event, NEVER from this column (AC0).
    outcome: verifierDecisionOutcomeEnum('outcome').notNull(),

    // The bounded, non-PII structured reason code (D-F/AC8). Compatible with `outcome` per
    // REASON_CODE_OUTCOME_COMPAT (enforced in the writer/contract, not the column).
    reasonCode: verifierReasonCodeEnum('reason_code').notNull(),

    // ── PII — Tier-1 envelope ciphertext (encrypt-before-insert; ciphertext AS STORED; decrypt at
    //    the route AFTER authorization only) ── The brief verifier rationale free-text (≤500 chars,
    //    D-G). NULLABLE at the column; REQUIRED (non-null) for `other`/deny is enforced in the
    //    writer/contract, never here. NO index on this column (D-G — never a filter/search dimension).
    rationaleCiphertext: piiColumn(1, 'verifier_decision')('rationale_ciphertext'),

    // The acting verifier (an actor id, not a name → non-PII). The query/join key (AC4/AC7).
    actorId: text('actor_id').notNull(),

    // The decision-time SNAPSHOT of the actor's `users.display_name` (R5/AC7). REQUIRED (NOT NULL) —
    // the writer resolves it server-side FIRST and blocks adjudication with AdminDisplayNameMissingError
    // when absent (no fallback of any kind). Frozen at write; a later rename never rewrites history.
    // Plaintext controlled staff-attribution personal data (its purpose is display on audit surfaces),
    // NEVER derived from the encrypted admin email.
    actorDisplay: text('actor_display').notNull(),

    decidedAt: timestamp('decided_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    // The D-E revision back-reference: which decision THIS one superseded (self-FK). NULL on a fresh
    // decision. ON DELETE SET NULL so a claim-cascade delete has no self-referential ordering hazard.
    supersedesDecisionId: uuid('supersedes_decision_id')
      .$type<VerifierDecisionId>()
      .references((): AnyPgColumn => claimVerifierDecisions.decisionId, { onDelete: 'set null' }),

    // When this row was superseded by a revision (D-E). NULL = the LIVE/current decision (the
    // partial-unique index keys off this). A superseded row stays in the transcript (section (e), AC6).
    supersededAt: timestamp('superseded_at', { withTimezone: true, mode: 'date' }),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // Per-tenant scans / RLS-aware planner hint (pariwar_id leads, mirroring claims).
    index('claim_verifier_decisions_pariwar_id_idx').on(t.pariwarId),
    // Section (e) — this claim's full ordered transcript.
    index('claim_verifier_decisions_claim_case_id_idx').on(t.claimCaseId),
    // Section (f) — same-Pariwar recency (latest-3 resolved precedents).
    index('claim_verifier_decisions_pariwar_id_decided_at_idx').on(t.pariwarId, t.decidedAt),
    // The trustee "Anita + reason-code X + last month" audit query (AC4) — all three NON-PII columns.
    index('claim_verifier_decisions_actor_reason_decided_idx').on(t.actorId, t.reasonCode, t.decidedAt),
    // AC5/AC9 — at most ONE live decision row per claim (a revision must supersede before/atomically-
    // with inserting the next). The concurrent-double-revision backstop.
    uniqueIndex('claim_verifier_decisions_one_live_per_claim_uq')
      .on(t.claimCaseId)
      .where(sql`superseded_at IS NULL`),
  ],
);

export type ClaimVerifierDecisionRow = typeof claimVerifierDecisions.$inferSelect;
export type ClaimVerifierDecisionInsert = typeof claimVerifierDecisions.$inferInsert;
