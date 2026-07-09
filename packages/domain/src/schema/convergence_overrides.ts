// `convergence_overrides` table — Story 6.4 substrate (the AC4 override ledger).
//
// The append-only ledger of explicit "do NOT converge" decisions. When an operator/
// trustee resolves a `pending` intake attempt as SEPARATE (rather than merging it into
// the candidate canonical claim), a row lands here recording reason + actor + the claim
// it was NOT merged into. Two loads:
//   · AC4 audit line — reason (min-length enforced in Zod at the boundary) + decided_by
//     actor + decided_at, so an override decision is never silent;
//   · the "future intakes do not re-attempt convergence with cases explicitly overridden
//     apart" guard (AC4) — `getConvergenceCandidate` filters out any candidate claim that
//     has an override row for the death (NOT EXISTS against against_claim_case_id).
//
// Append-only: a row is never updated or deleted (GRANT SELECT/INSERT/UPDATE but no
// DELETE at the table level; the app only ever INSERTs here).
//
// Naming discipline per architecture line 3663-3677: DB columns snake_case, TS fields
// camelCase. Table snake_case-plural. Header style mirrors schema/claims.ts.

import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { ClaimId, IntakeAttemptId, MemberId, PariwarId } from '../ids/index.js';

export const convergenceOverrides = pgTable(
  'convergence_overrides',
  {
    // Per-row ledger address. DB-defaulted gen_random_uuid() (a pure ledger row — no
    // caller needs to pre-mint it, unlike intake_attempt_id / claim_case_id).
    overrideId: uuid('override_id').primaryKey().defaultRandom(),

    // Multi-tenant scope (architecture §1.2). RLS predicate column; branded.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The death the override decision is about (the candidate-filter key axis).
    deceasedMemberId: uuid('deceased_member_id').notNull().$type<MemberId>(),

    // The attempt that was kept separate. Branded IntakeAttemptId — NO FK (mirror the
    // no-FK-to-RLS-forced-table posture of claims.deceased_member_id).
    intakeAttemptId: uuid('intake_attempt_id').notNull().$type<IntakeAttemptId>(),

    // The canonical claim this attempt was NOT merged into — the candidate-suppression
    // key `getConvergenceCandidate` filters on. Reuses the ClaimId brand.
    againstClaimCaseId: uuid('against_claim_case_id').notNull().$type<ClaimId>(),

    // The override rationale (AC4). Min-length is enforced in Zod at the API boundary;
    // the column itself is a plain NOT NULL text.
    reason: text('reason').notNull(),

    // The deciding operator/trustee (NOT NULL — an override is always an authored decision).
    decidedByActor: uuid('decided_by_actor').notNull(),

    decidedAt: timestamp('decided_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // The candidate-suppression scan (AC4): (pariwar_id, deceased_member_id).
    index('convergence_overrides_pariwar_deceased_idx').on(t.pariwarId, t.deceasedMemberId),
  ],
);

// Inferred row types for the accessor read/write paths (claims precedent).
export type ConvergenceOverrideRow = typeof convergenceOverrides.$inferSelect;
export type ConvergenceOverrideInsert = typeof convergenceOverrides.$inferInsert;
