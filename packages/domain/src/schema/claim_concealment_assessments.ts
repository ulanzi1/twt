// `claim_concealment_assessments` — the verifier concealment-linkage ASSESSMENT store (Story 6.15, Task 1; D-D).
//
// The human-supplied `claim.concealed_ima_condition_linked` fact (AC7): a verifier records *whether an
// undeclared IMA condition appears linked to the death* — `linked | not_linked | unable_to_determine`. This
// is a review ANNOTATION, not an adjudication: it emits no approval/denial event and changes no lifecycle
// state (the paired `claim.concealment_assessed` event is an IDENTITY annotation; the State Trustee, Story
// 6.13, remains the SOLE concealment-decision authority — D-B). No automated death-linkage engine produces
// the fact (D-A); a human judges it, and the Story 4.4 engine turns the fact into the flag.
//
// This table is the AUTHORITATIVE current/read model (D-E, evidence layer 1): the tri-state concealment
// producer (`concealment-review.ts`) reads the LIVE row here, never a redacted validity-service payload
// (D10). The immutable evidentiary timeline lives in `events_log` (`claim.concealment_assessed`, layer 2);
// the audit sink records the authorized admin action (layer 3). None of the three is collapsed into another.
//
// ── Revisability (AC7) ──────────────────────────────────────────────────────────────────────
// At most ONE live assessment per claim (partial-unique `(claim_case_id) WHERE superseded_at IS NULL`). A
// revision atomically supersedes the prior live row (`superseded_at = now()`) and inserts a fresh one with
// `supersedes_assessment_id` pointing back — the full history is retained (the 6.11 `reviseDecision`
// pattern). One live row per claim; the tally-of-one the producer reads.
//
// ── PII discipline ──────────────────────────────────────────────────────────────────────────
//   · note_ciphertext — arbitrary verifier free-text (can reference member facts) → Tier-1 envelope
//     ciphertext (`piiColumn(1, 'concealment_assessment')`). NULLABLE (the note is OPTIONAL). Encrypt-
//     before-insert in the route; the accessor returns ciphertext AS STORED; decrypt only AFTER
//     authorization at the route. NEVER in an event payload / audit line / index / searchable filter.
//   · kind / actor_id / actor_display / created_at / pariwar_id / claim_case_id → NON-PII (safe on the
//     audit context). `actor_display` is a controlled staff-attribution DISPLAY string (R5) — plaintext
//     by deliberate decision, a decision-time SNAPSHOT (the 6.11 `admin_display_name` pattern), non-empty
//     enforced in the writer, NEVER email-derived.
//
// TENANT-ISOLATED (mirrors `claims` / `claim_verifier_decisions`; SYMMETRIC — no 6.13 asymmetry). RLS in
// policies/claim-concealment-assessments-rls.ts.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { sql } from 'drizzle-orm';
import { type AnyPgColumn, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { claimConcealmentAssessmentKindEnum } from '../claim/concealment-assessment.js';
import { piiColumn } from '../encryption/column.js';
import type { ClaimId, ConcealmentAssessmentId, PariwarId } from '../ids/index.js';
import { claims } from './claims.js';

export const claimConcealmentAssessments = pgTable(
  'claim_concealment_assessments',
  {
    // Per-assessment id (the addressable unit). Branded ConcealmentAssessmentId.
    assessmentId: uuid('assessment_id').defaultRandom().primaryKey().$type<ConcealmentAssessmentId>(),

    // The claim this assessment is filed against (FK → claims; branded ClaimId == the events_log
    // stream_id). ON DELETE CASCADE mirrors claim_verifier_decisions / claim_state_trustee_decisions.
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The tri-state assessment kind (AC7). The human-supplied concealed-IMA-condition-linkage judgement the
    // tri-state producer maps to `flagged` / `not_flagged` / `not_evaluated`.
    kind: claimConcealmentAssessmentKindEnum('kind').notNull(),

    // ── PII — Tier-1 envelope ciphertext (encrypt-before-insert; ciphertext AS STORED; decrypt at the
    //    route AFTER authorization only) ── The OPTIONAL verifier note free-text. NULLABLE (the note is
    //    optional). NO index (never a filter/search dimension).
    noteCiphertext: piiColumn(1, 'concealment_assessment')('note_ciphertext'),

    // The acting verifier (an actor id, not a name → non-PII). The query/join key.
    actorId: text('actor_id').notNull(),
    // The decision-time SNAPSHOT of the actor's `users.display_name` (R5). REQUIRED (NOT NULL) — the writer
    // resolves it server-side FIRST and blocks the action when absent (no fallback). Plaintext controlled
    // staff-attribution personal data, NEVER email-derived.
    actorDisplay: text('actor_display').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    // When this assessment was superseded by a revision. NULL = the LIVE/current assessment for this claim
    // (the partial-unique index keys off this). A superseded row stays in the transcript for audit.
    supersededAt: timestamp('superseded_at', { withTimezone: true, mode: 'date' }),

    // The prior live assessment this one superseded on a revision (null on a first assessment). Self-FK —
    // the AnyPgColumn return annotation breaks the circular type inference on a self-reference.
    supersedesAssessmentId: uuid('supersedes_assessment_id')
      .$type<ConcealmentAssessmentId>()
      .references((): AnyPgColumn => claimConcealmentAssessments.assessmentId),
  },
  (t) => [
    // Per-tenant scans / RLS-aware planner hint (pariwar_id leads, mirroring claims).
    index('claim_concealment_assessments_pariwar_id_idx').on(t.pariwarId),
    // This claim's ordered transcript + the per-claim live read (the producer's single-row read).
    index('claim_concealment_assessments_claim_case_id_idx').on(t.claimCaseId),
    // AC7 — at most ONE live assessment per claim (the revise atomic-supersession backstop).
    uniqueIndex('claim_concealment_assessments_one_live_per_claim_uq')
      .on(t.claimCaseId)
      .where(sql`superseded_at IS NULL`),
  ],
);

export type ClaimConcealmentAssessmentRow = typeof claimConcealmentAssessments.$inferSelect;
export type ClaimConcealmentAssessmentInsert = typeof claimConcealmentAssessments.$inferInsert;
