// `claim_appeals` — the SINGLE appeal-journey anchor per claim (Story 6.16, Task 1; D-F).
//
// EXACTLY ONE row per claim's appeal journey, EVER (D-F). This is NOT a projection of the claim lifecycle —
// the `claim.appeal_*` events in `events_log` are the LIFECYCLE authority (state comes from event replay,
// Story 6.1 §1.14 freeze); this anchor tracks the journey's current stage + terminal status + who initiated
// it (claimant or operator-on-behalf, AR-61). Claim STATE is ALWAYS derived from event replay, NEVER this row.
//
// ── The UNCONDITIONAL uniqueness (D-F) — the load-bearing invariant ─────────────────────────────
// `UNIQUE (claim_case_id)` is UNCONDITIONAL — NOT a partial `WHERE status = 'open'`. A partial index would
// permit a FRESH journey after the first became `reversed` / `upheld_final`; the story commits exactly-one-
// journey-per-claim, so uniqueness must be unconditional. The write-path re-initiation guard
// (`AppealAlreadyExhaustedError`) + this constraint together enforce D-F — a race that slips past the guard
// hits 23505.
//
// ── No claimant-facing deadline (D-E) ──────────────────────────────────────────────────────────
// There is deliberately NO `window_expires_at` column — the PRD's "no formal time limit … grief-aware" rule
// removed the claimant-facing deadline entirely. `denial_event_version` is snapshotted for SLA/audit CONTEXT
// only (informational — never a gate).
//
// TENANT-ISOLATED (mirrors `claims`). RLS in policies/claim-appeals-rls.ts.
//
// Naming discipline per architecture L3663-3677: DB columns snake_case, TS camelCase.

import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { appealJourneyStatusEnum, appealStageEnum } from '../claim/appeal.js';
import type { AppealId, ClaimId, PariwarId } from '../ids/index.js';
import { claims } from './claims.js';

export const claimAppeals = pgTable(
  'claim_appeals',
  {
    // Per-journey id (the addressable unit). Branded AppealId.
    appealId: uuid('appeal_id').defaultRandom().primaryKey().$type<AppealId>(),

    // The claim this journey appeals (FK → claims; branded ClaimId == the events_log stream_id). ON DELETE
    // CASCADE mirrors claim_verifier_decisions / claim_r9_voting_sessions.
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),

    // Multi-tenant scope (RLS predicate column; branded).
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The journey's current stage (`'1' | '2' | '3'`) — advanced by the write-paths as the ladder deepens.
    // A read-model convenience; claim STATE is still derived from event replay (AC9), NEVER from this column.
    currentStage: appealStageEnum('current_stage').notNull(),

    // Who initiated the appeal (an actor id — the claimant, or the operator on their behalf under AR-61).
    initiatedByActor: text('initiated_by_actor').notNull(),
    // True when an operator initiated on the claimant's behalf (the AR-61 helpline-mediated fallback path).
    initiatedOnBehalf: boolean('initiated_on_behalf').notNull().default(false),

    // The denial event's version at initiation — SLA/audit CONTEXT snapshot ONLY (D-E — NEVER a gate; there
    // is NO elapsed-time deadline on the claimant's right to initiate).
    denialEventVersion: integer('denial_event_version'),

    // The journey terminal status (D-F): `open` while the ladder is in progress; `reversed` once any stage
    // reverses; `upheld_final` once Stage 3 upholds. A terminal status blocks re-initiation.
    status: appealJourneyStatusEnum('status').notNull().default('open'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // Per-tenant scans / RLS-aware planner hint (pariwar_id leads, mirroring claims).
    index('claim_appeals_pariwar_id_idx').on(t.pariwarId),
    // D-F — EXACTLY ONE appeal journey per claim, EVER (UNCONDITIONAL — not partial on status). The
    // guard-bypass-race backstop (→ 23505).
    uniqueIndex('claim_appeals_one_per_claim_uq').on(t.claimCaseId),
  ],
);

export type ClaimAppealRow = typeof claimAppeals.$inferSelect;
export type ClaimAppealInsert = typeof claimAppeals.$inferInsert;
