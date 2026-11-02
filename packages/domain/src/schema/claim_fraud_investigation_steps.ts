// `claim_fraud_investigation_steps` — the fraud register's INVESTIGATION record (Story 6.22, Task 1.2; DL1; author-commit
// `2026-11-01-438` item 2).
//
// `-238` cl. 3: *"operator flags → District Admin verifies and confirms"*; cl. 4: *"TWO OUTCOMES ONLY. An investigation
// finds the member innocent or guilty."* ⇒ one row per STEP of one claim's investigation:
//   · `flagged`        — the helpline operator flags the claim as possibly about a LIVING member (DL4);
//   · `found_innocent` — the District Admin, having confirmed the member ALIVE, finds them innocent (DL3) — the
//                        `member_found_innocent` finding (`claim_nominee_findings`) it wrote is `finding_id`;
//   · `found_guilty`   — the same, guilty — `member_found_guilty`.
// Each step at most ONCE per claim, and at most ONE found step of either kind (N1, N2). The chain ORDER (a finding needs
// a flag, by a different person) is enforced by the domain writer (`claim/fraud-investigation-persist.ts`), ⛔ a trigger.
//
// ── Append-only (migration 0197, HAND-AUTHORED — the 0122 template) ─────────────────────────────────────────────────
//   · UPDATE — refused unless ONLY `note_ciphertext` changed (the DPDPA-RTBF scrub, DL15 — the house sentinel, ⛔ NULL);
//   · DELETE — refused, EXCEPT the `claims` cascade (depth > 1); TRUNCATE — refused.
//
// ── PII discipline ────────────────────────────────────────────────────────────────────────────────────────────────────
//   · note_ciphertext → Tier-1, REQUIRED on every step: the operator's or the District Admin's note. It may describe the
//     FILER (possibly a non-member — `-240` cl. 1 applies at row `6-22b`). Decrypted only in the audited console read;
//     ⛔ never in an event, a log line or an audit context (N6).
//   · actor_display → controlled STAFF data, snapshotted at action time from `users.display_name` (⛔ fallback).
//   · alive_confirmation → a plaintext code — HOW the member was confirmed alive (`FRAUD_ALIVE_CONFIRMATIONS`; the
//     Panel's Q9 decides which suffice — the built set is a go-live condition).

import { sql } from 'drizzle-orm';
import { foreignKey, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { CLAIM_FRAUD_INVESTIGATION_FIELD_CLASS } from '../encryption/field-classes.js';
import { piiColumn } from '../encryption/column.js';
import type { ClaimFraudInvestigationStepId, ClaimId, ClaimNomineeFindingId, MemberId, PariwarId } from '../ids/index.js';
import { MEMBER_FINDING_KIND_BY_OUTCOME, claimNomineeFindings } from './claim_nominee_findings.js';
import { claims } from './claims.js';

/** The steps of one claim's investigation. ⛔ No third outcome (`-238` cl. 4). `6-22d` widens it (a TEXT CHECK — ⛔ `ALTER TYPE`). */
export const FRAUD_INVESTIGATION_STEPS = ['flagged', 'found_innocent', 'found_guilty'] as const;
export type FraudInvestigationStep = (typeof FRAUD_INVESTIGATION_STEPS)[number];

/**
 * How the District Admin confirmed the member ALIVE before a finding (DL3; N1 — ⛔ a bare staff "alive" mark, `-261` D3 A).
 * A phone call alone is ⛔ proof (anyone may answer for the member). ⚠ WHICH proof suffices is the Panel's (Q9 — routed
 * 2026-11-01); this is the BUILT set, a go-live condition. ⚠ LOCKSTEP with migration 0197's
 * `claim_fraud_investigation_steps_alive_confirmation_check` and `@twt/contracts`' `FraudAliveConfirmation` z.enum.
 */
export const FRAUD_ALIVE_CONFIRMATIONS = ['in_person', 'video_call', 'ground_inspection'] as const;
export type FraudAliveConfirmation = (typeof FRAUD_ALIVE_CONFIRMATIONS)[number];

export const claimFraudInvestigationSteps = pgTable(
  'claim_fraud_investigation_steps',
  {
    // Supplied by the writer's caller — ⛔ no default — so a retry with the same id replays.
    stepId: uuid('step_id').primaryKey().$type<ClaimFraudInvestigationStepId>(),
    claimCaseId: uuid('claim_case_id')
      .notNull()
      .$type<ClaimId>()
      .references(() => claims.claimCaseId, { onDelete: 'cascade' }),
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),
    // The member the claim names as deceased (the `claims.deceased_member_id` cache — ⛔ FK). The RTBF scrub keys on it.
    deceasedMemberId: uuid('deceased_member_id').notNull().$type<MemberId>(),
    step: text('step').notNull().$type<FraudInvestigationStep>(),
    // Set iff a found step. Tied to its OWN claim's finding of the matching kind by the composite FK below (migration 0198) —
    // `ON DELETE no action` (the default), ⛔ `restrict`, which would fail a `claims` delete before both cascades run.
    findingId: uuid('finding_id').$type<ClaimNomineeFindingId>(),
    // GENERATED from `step` (migration 0198) — the kind of finding this step must point at: `found_innocent` →
    // `member_found_innocent`, `found_guilty` → `member_found_guilty`, `flagged` → NULL. ⛔ Never written (Postgres refuses).
    // (The kinds come from `MEMBER_FINDING_KIND_BY_OUTCOME`, ⛔ spelled here — the source fence allows only the findings schema.)
    findingKind: text('finding_kind').generatedAlwaysAs(
      sql.raw(
        `CASE step WHEN 'found_innocent' THEN '${MEMBER_FINDING_KIND_BY_OUTCOME.innocent}' WHEN 'found_guilty' THEN '${MEMBER_FINDING_KIND_BY_OUTCOME.guilty}' END`,
      ),
    ),
    // Set iff a found step (the coherence CHECK).
    aliveConfirmation: text('alive_confirmation').$type<FraudAliveConfirmation>(),
    noteCiphertext: piiColumn(1, CLAIM_FRAUD_INVESTIGATION_FIELD_CLASS)('note_ciphertext').notNull(),
    actorId: text('actor_id').notNull(),
    actorDisplay: text('actor_display').notNull(),
    actedAt: timestamp('acted_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (t) => [
    // A found step points at ITS OWN claim's finding, of the matching kind (migration 0198; MATCH SIMPLE — a `flagged` step's
    // NULL `finding_id` / `finding_kind` leaves it unconstrained).
    foreignKey({
      name: 'claim_fraud_investigation_steps_finding_claim_kind_fk',
      columns: [t.findingId, t.claimCaseId, t.findingKind],
      foreignColumns: [claimNomineeFindings.findingId, claimNomineeFindings.claimCaseId, claimNomineeFindings.kind],
    }),
    index('claim_fraud_investigation_steps_pariwar_id_idx').on(t.pariwarId),
    index('claim_fraud_investigation_steps_deceased_member_idx').on(t.pariwarId, t.deceasedMemberId),
    // Each step at most once per claim (N1).
    uniqueIndex('claim_fraud_investigation_steps_one_step_per_claim_uq').on(t.claimCaseId, t.step),
    // At most ONE found step per claim, of EITHER kind (N1, N2).
    uniqueIndex('claim_fraud_investigation_steps_one_finding_per_claim_uq')
      .on(t.claimCaseId)
      .where(sql`step IN ('found_innocent', 'found_guilty')`),
  ],
);

export type ClaimFraudInvestigationStepRow = typeof claimFraudInvestigationSteps.$inferSelect;
export type ClaimFraudInvestigationStepInsert = typeof claimFraudInvestigationSteps.$inferInsert;
