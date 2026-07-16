// `claim_appeal_decisions` — the per-stage appeal decision-metadata store (Story 6.16, Task 1; D-A/D-B).
//
// The DECISION-METADATA authority (AC0/AC2/AC3/AC4): one row per resolved stage decision — Stage 1 (single
// District-Admin reviewer), Stage 2 (the panel finalize's uniform audit row, alongside the panel session
// outcome), Stage 3 (single Trustee). Mirrors `claim_verifier_decisions` with `stage` in the uniqueness key.
// It is NOT a projection of the claim lifecycle and the lifecycle is NOT a projection of it — the paired
// `claim.appeal_stageN_reviewed` event in `events_log` is the LIFECYCLE authority (state comes from event
// replay). Both are written in the SAME scope-tx so they can never diverge (AC9).
//
// ── One LIVE decision per (claim, stage) ────────────────────────────────────────────────────────
// Partial-unique `(claim_case_id, stage) WHERE superseded_at IS NULL` — at most ONE live decision row per
// stage per claim.
//
// DEFERRED, NOT A GAP (6.16 review finding, [[feedback_closure_language_precision]]): `supersedesDecisionId`
// / `supersededAt` below are SCAFFOLDED ONLY in v1 — they mirror the panel session/vote tables' shape for a
// uniform audit-row schema, but NO write path in this story ever sets them. There is no Stage-1/3 correction
// (re-decide) flow in v1; unlike the panel tables (which DO have a real supersession writer via
// `cancelAppealPanel`), a Stage-1/3 `claim_appeal_decisions` row is immutable once written. A future story
// introducing a Stage-1/3 correction path is what would populate these columns — resolved via explicit
// deferral, not silently dropped.
//
// ── PII discipline (D-G / AR-12 / Story 1.16b gate) ─────────────────────────────────────────────
//   · rationale_ciphertext — arbitrary reviewer free-text (can reference member facts) → Tier-1 envelope
//     ciphertext (`piiColumn(1, 'appeal_decision')`), NOT NULL (rationale is MANDATORY, AC2/AC4). Encrypt-
//     before-insert in the route; decrypt only AFTER authorization at the route. NEVER logged / in an event /
//     on an audit line / indexed.
//   · disposition_category — the bounded NON-PII public tag (D-A), NULLABLE — set ONLY on a `reversed`
//     decision; never populated for `advance` / `upheld`. Copied into the `claim.reversed` payload.
//   · decision / stage / reviewer_actor_id / reviewer_display / decided_at / pariwar_id / claim_case_id →
//     NON-PII (safe for the audit context + the AC6 "reviewer + stage + time_range" query). `reviewer_display`
//     is a controlled staff-attribution DISPLAY string (R5), plaintext, a decision-time SNAPSHOT, NEVER
//     email-derived.
//
// TENANT-ISOLATED (mirrors `claims` / `claim_verifier_decisions`). RLS in policies/claim-appeal-decisions-rls.ts.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { sql } from 'drizzle-orm';
import { type AnyPgColumn, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { appealDecisionEnum, appealDispositionCategoryEnum, appealStageEnum } from '../claim/appeal.js';
import { piiColumn } from '../encryption/column.js';
import type { AppealDecisionId, ClaimId, PariwarId } from '../ids/index.js';
import { claims } from './claims.js';

export const claimAppealDecisions = pgTable(
  'claim_appeal_decisions',
  {
    // Per-decision id (the addressable unit). Branded AppealDecisionId.
    appealDecisionId: uuid('appeal_decision_id').defaultRandom().primaryKey().$type<AppealDecisionId>(),

    // The claim this decision is filed against (FK → claims; branded ClaimId == the events_log stream_id).
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The appeal stage this decision resolves (`'1' | '2' | '3'`).
    stage: appealStageEnum('stage').notNull(),

    // The recorded decision. Claim STATE is derived from the paired claim.appeal_stageN_reviewed event,
    // NEVER from this column (AC0/AC9). Stages 1/2 write `reversed | advance`; Stage 3 writes `reversed |
    // upheld` (the write-path enforces the per-stage subset, not the column).
    decision: appealDecisionEnum('decision').notNull(),

    // The bounded NON-PII public disposition tag (D-A). NULLABLE — set ONLY on a `reversed` decision; the
    // write-path enforces "set iff reversed". Copied into the claim.reversed publish-hook payload.
    dispositionCategory: appealDispositionCategoryEnum('disposition_category'),

    // ── PII — Tier-1 envelope ciphertext (encrypt-before-insert; ciphertext AS STORED; decrypt at the route
    //    AFTER authorization only) ── The mandatory reviewer rationale (≤500 chars). NOT NULL. NO index (never
    //    a filter/search dimension).
    rationaleCiphertext: piiColumn(1, 'appeal_decision')('rationale_ciphertext').notNull(),

    // The acting reviewer (an actor id, not a name → non-PII). The AC6 query/join key.
    reviewerActorId: text('reviewer_actor_id').notNull(),
    // The decision-time SNAPSHOT of the reviewer's users.display_name (R5). REQUIRED — resolved server-side
    // FIRST, fail-closed on absence (no fallback). Plaintext controlled staff-attribution personal data.
    reviewerDisplay: text('reviewer_display').notNull(),

    decidedAt: timestamp('decided_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),

    // Supersession back-reference (self-FK) + timestamp — mirrors the sibling tables for uniform audit +
    // any future per-stage correction. NULL on a fresh decision / the live row.
    supersedesDecisionId: uuid('supersedes_decision_id')
      .$type<AppealDecisionId>()
      .references((): AnyPgColumn => claimAppealDecisions.appealDecisionId, { onDelete: 'set null' }),
    supersededAt: timestamp('superseded_at', { withTimezone: true, mode: 'date' }),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // Per-tenant scans / RLS-aware planner hint (pariwar_id leads, mirroring claims).
    index('claim_appeal_decisions_pariwar_id_idx').on(t.pariwarId),
    // This claim's full ordered decision transcript.
    index('claim_appeal_decisions_claim_case_id_idx').on(t.claimCaseId),
    // The AC6 "reviewer X + stage + time_range" audit query — all three NON-PII columns.
    index('claim_appeal_decisions_reviewer_stage_decided_idx').on(t.reviewerActorId, t.stage, t.decidedAt),
    // At most ONE live decision row per (claim, stage) — the correction-supersession backstop.
    uniqueIndex('claim_appeal_decisions_one_live_per_claim_stage_uq')
      .on(t.claimCaseId, t.stage)
      .where(sql`superseded_at IS NULL`),
  ],
);

export type ClaimAppealDecisionRow = typeof claimAppealDecisions.$inferSelect;
export type ClaimAppealDecisionInsert = typeof claimAppealDecisions.$inferInsert;
