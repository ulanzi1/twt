// `claim_state_trustee_decisions` — the State-Trustee cycle-freeze DECISION-METADATA store (Story 6.13, Task 2).
//
// The DECISION-METADATA authority (AC0): the trustee reason-code, encrypted rationale, human-actor
// display attribution, and the phase model. It is NOT a projection of the claim lifecycle and the
// lifecycle is NOT a projection of it — the paired `claim.state_trustee_*` / `claim.approved` /
// `claim.verifier_*` event in `events_log` is the LIFECYCLE authority (state comes from event replay,
// Story 6.1 §1.14 freeze), THIS table is the DECISION-METADATA authority. Both are written in the SAME
// transaction so they cannot diverge (mirrors `claim_verifier_decisions`, 6.11). Any code that derives
// claim STATE from this table, or reads a reason/rationale from the event, is wrong.
//
// ── The PHASE model — one LIVE row PER PHASE, not per claim (D-F, other suggestion #5) ──────
// A claim legitimately accrues MULTIPLE rows across the flow (a `frozen_vote`, then a `commit`; an
// `escalation_resolution`; a durable `routing` exclusion), so the 6.11 "one live per claim" partial-
// unique does NOT transfer. Uniqueness is PER-PHASE: partial-unique `(claim_case_id, phase) WHERE
// superseded_at IS NULL` — at most one LIVE row per `(claim_case_id, phase)`. This gives the
// freeze/vote → commit progression + the escalation-resolution + the routing exclusion each their own
// clean, queryable, supersedable slot.
//
// ── PII discipline (D-G / AR-12 / Story 1.16b gate) ────────────────────────────────────────
//   · rationale_ciphertext — arbitrary trustee free-text (can reference member facts) → Tier-1 envelope
//     ciphertext (`piiColumn(1, 'state_trustee_decision')`). Encrypt-before-insert in the route; the
//     accessor returns ciphertext AS STORED; decrypt only AFTER authorization at the route. NEVER logged,
//     NEVER in an event payload / audit line / index / searchable filter.
//   · outcome / reason_code / phase / actor_id / actor_display / decided_at / pariwar_id / claim_case_id
//     → NON-PII (safe for the audit context). `actor_display` is a controlled staff-attribution DISPLAY
//     string (R5) — plaintext by deliberate decision (its purpose is display on audit surfaces), a
//     decision-time SNAPSHOT (AC8), NEVER email-derived.
//
// TENANT-ISOLATED (mirrors `claims` / `claim_verifier_decisions`). RLS in
// policies/claim-state-trustee-decisions-rls.ts.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import {
  stateTrusteeDecisionOutcomeEnum,
  stateTrusteeDecisionPhaseEnum,
  stateTrusteeReasonCodeEnum,
} from '../claim/state-trustee-decision.js';
import { piiColumn } from '../encryption/column.js';
import type { ClaimId, PariwarId, TrusteeDecisionId } from '../ids/index.js';
import { claims } from './claims.js';

export const claimStateTrusteeDecisions = pgTable(
  'claim_state_trustee_decisions',
  {
    // Per-decision id (the addressable unit). Generated app-side by the writer; defaultRandom is a
    // fallback for bare inserts. Branded TrusteeDecisionId.
    decisionId: uuid('decision_id').defaultRandom().primaryKey().$type<TrusteeDecisionId>(),

    // The claim this decision is filed against (FK → claims; branded ClaimId == the events_log
    // stream_id). ON DELETE CASCADE mirrors claim_verifier_decisions / claim_shepherd_assignments.
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The decision PHASE (D-F, other suggestion #5). Discriminates the freeze/vote → commit progression +
    // the escalation-resolution + the routing exclusion; uniqueness is PER-PHASE (partial-unique below).
    phase: stateTrusteeDecisionPhaseEnum('phase').notNull(),

    // The decision outcome (AC0). The DECISION-METADATA label — claim STATE is derived from the paired
    // claim.* event, NEVER from this column. `routed_to_r9` has no lifecycle event (routing metadata-only).
    outcome: stateTrusteeDecisionOutcomeEnum('outcome').notNull(),

    // The bounded, non-PII trustee reason code (D-F). NULLABLE at the column; REQUIRED (non-null) for
    // `denied`/`routed_to_r9` is enforced in the writer/contract (the D-F presence rule), NOT the column.
    reasonCode: stateTrusteeReasonCodeEnum('reason_code'),

    // ── PII — Tier-1 envelope ciphertext (encrypt-before-insert; ciphertext AS STORED; decrypt at the
    //    route AFTER authorization only) ── The brief trustee rationale free-text. NULLABLE at the column;
    //    REQUIRED (non-null) for `other`/deny/route is enforced in the writer/contract, never here. NO
    //    index on this column (D-G — never a filter/search dimension).
    rationaleCiphertext: piiColumn(1, 'state_trustee_decision')('rationale_ciphertext'),

    // The acting trustee (an actor id, not a name → non-PII). The query/join key.
    actorId: text('actor_id').notNull(),

    // The decision-time SNAPSHOT of the actor's `users.display_name` (R5/AC8). REQUIRED (NOT NULL) — the
    // writer resolves it server-side FIRST and blocks the action with AdminDisplayNameMissingError when
    // absent (no fallback of any kind). Frozen at write; a later rename never rewrites history. Plaintext
    // controlled staff-attribution personal data, NEVER derived from the encrypted admin email.
    actorDisplay: text('actor_display').notNull(),

    decidedAt: timestamp('decided_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    // When this row was superseded (e.g. an escalation resolution re-decides, or a routing exclusion is
    // lifted). NULL = the LIVE/current row for its phase (the partial-unique index keys off this). A
    // superseded row stays in the transcript for audit.
    supersededAt: timestamp('superseded_at', { withTimezone: true, mode: 'date' }),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // Per-tenant scans / RLS-aware planner hint (pariwar_id leads, mirroring claims).
    index('claim_state_trustee_decisions_pariwar_id_idx').on(t.pariwarId),
    // This claim's ordered transcript + the per-claim / per-phase read (the commit query's routing check).
    index('claim_state_trustee_decisions_claim_case_id_idx').on(t.claimCaseId),
    // D-F (other suggestion #5) — at most ONE live row per (claim, phase). The freeze/vote → commit
    // progression + the escalation-resolution + the durable routing exclusion each get one live slot;
    // the concurrent-double-write backstop behind the write-path advisory lock.
    uniqueIndex('claim_state_trustee_decisions_one_live_per_phase_uq')
      .on(t.claimCaseId, t.phase)
      .where(sql`superseded_at IS NULL`),
  ],
);

export type ClaimStateTrusteeDecisionRow = typeof claimStateTrusteeDecisions.$inferSelect;
export type ClaimStateTrusteeDecisionInsert = typeof claimStateTrusteeDecisions.$inferInsert;
