// `claims` table — Story 6.1 substrate (the claim-case lifecycle anchor).
//
// The FIRST Epic-6 landing and a pure `[PRIMITIVE]` — the claim-lifecycle TWIN of
// Story 3.1's `members` table. This table is the claim case's lifecycle ANCHOR —
// NOT the claim's dossier. Nominee-bank / OCR / peer-mesh / inspection / payout
// columns are downstream stories' to add (6.5–6.8, Epic 7+). Story 6.1 commits
// ONLY the lifecycle-anchoring shape (AC1) and its v1 scope boundary (AC6:
// death-support nominee claims ONLY — no payout_destination_id, no accident /
// reserve / disbursement columns; §1.13 Hook 2 + §1.9).
//
// ── claims.current_state is a READ-OPTIMIZATION CACHE, not the source of truth ─
// The source of truth for a claim's lifecycle state is the claim's `events_log`
// stream (stream_id = claim_case_id) replayed through the pure reducer in
// `claim/state.ts` (architecture §1.9 aggregate + §1.14 line 1231-1236). The
// persisted `current_state` column is a projection of that replay — written ONLY
// by the projector (`claim/project.ts`) inside the same transaction that appends
// the transition event (cache-invalidation invariant, AC3). Two guards keep it
// honest — the exact posture Story 3.1 established for the ₹50L/decision flow:
//   · the DB trigger (migration, AC3) — rejects any UPDATE to `current_state` that
//     is not issued by the projector (session-variable `app.claim_state_writer`
//     guard, mirroring `app.member_state_writer`);
//   · the CI gate (scripts/claim-state-invariant, AC3) — static-scans
//     packages/domain/src and fails on any `.update(claims).set({ current_state })`
//     outside the projector allowlist.
//
// ── claim_case_id = the event-stream stream_id (no DB default) ────────────────
// `claim_case_id` IS the claim's `events_log.stream_id` (one stream per claim,
// architecture §1.9/§1.14). It is minted by the intake flow (Story 6.2 member-app /
// 6.3 helpline / trustee-initiated) and used as the stream_id of the first event
// (`claim.intake_initiated`). It is therefore caller-supplied — NO
// `gen_random_uuid()` default — so a claim row can never exist with an id that does
// not match its event stream. (ICP convergence — Story 6.4 — makes it immutable
// post-convergence; 6.1 only commits caller-supplied + immutable-once-written.)
// Branded `ClaimId` (ids/index.ts:88 — pre-reserved for "claims 6.x"; reused, NOT
// re-declared, and the column NAME stays `claim_case_id`).
//
// Naming discipline per architecture line 3663-3677: DB columns snake_case, TS
// fields camelCase. Table snake_case-plural. Header style mirrors schema/members.ts.

import { bigint, index, pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { ClaimId, MemberId, PariwarId } from '../ids/index.js';

/**
 * The canonical claim-lifecycle state list — the ONE spelling authority (AC1).
 *
 * Underscored everywhere (Story 6.1 Dev Notes "State naming"): the epic AC + this
 * story's ACs spell states with underscores throughout. This is the per-machine
 * delimiter — `member_lifecycle_state` labels are HYPHENATED; the two enums are
 * independent, per-table namespaces (nothing joins a member state to a claim
 * state), so the delimiter asymmetry is deliberate and harmless. Postgres treats
 * enum labels as opaque strings, so underscores need no escaping.
 *
 * Both the pgEnum (DB CREATE TYPE) and the `ClaimLifecycleState` TS union below
 * are DERIVED from this single tuple — there is no second list to drift.
 *
 *   · `intake_pending`          — initial state on the first intake event (6.2/6.3).
 *   · `intake_converged`        — ICP dedup picked the canonical claim (6.4).
 *   · `documents_pending`       — death cert / documents received (6.5).
 *   · `verification_in_progress`— peer-mesh + ground-inspection signals gathering (6.6/6.7).
 *   · `verifier_review`         — verifier console reviewing (6.10/6.11).
 *   · `verifier_approved`       — verifier approved (6.11).
 *   · `state_trustee_freeze`    — cycle-freeze window open, per-claim votes cast (6.13).
 *   · `state_trustee_approved`  — per-claim trustee vote cast during an open freeze (6.13).
 *   · `approved`                — cycle-freeze bulk-approval commit (6.13; Epic 7/9 key off this).
 *   · `denied`                  — verifier / trustee / appeal denial.
 *   · `appeal_stage_1`          — internal appeal stage 1 (6.16).
 *   · `appeal_stage_2`          — internal appeal stage 2 (6.16).
 *   · `appeal_stage_3`          — internal appeal stage 3, Trustee discretion (6.16).
 *   · `reversed`                — an appeal reversed a denial (6.16; re-enters approval).
 *   · `settled`                 — pool spawn + disbursement (Epic 7/9; terminal).
 */
export const CLAIM_LIFECYCLE_STATES = [
  'intake_pending',
  'intake_converged',
  'documents_pending',
  'verification_in_progress',
  'verifier_review',
  'verifier_approved',
  'state_trustee_freeze',
  'state_trustee_approved',
  'approved',
  'denied',
  'appeal_stage_1',
  'appeal_stage_2',
  'appeal_stage_3',
  'reversed',
  'settled',
] as const;

/** pgEnum (`CREATE TYPE claim_lifecycle_state`) derived from the one tuple. */
export const claimLifecycleStateEnum = pgEnum('claim_lifecycle_state', CLAIM_LIFECYCLE_STATES);

/** The lifecycle-state literal union — derived from the same tuple (no drift). */
export type ClaimLifecycleState = (typeof CLAIM_LIFECYCLE_STATES)[number];

/**
 * The intake-channel set (AC1). A claim's `intake_channels` is a SET (array column)
 * because ICP (Story 6.4) may converge multiple channels onto one canonical claim
 * (dual-path intake: member-app + helpline for the same death). The ONE spelling
 * authority for the channel labels → both the pgEnum and the TS union derive from it.
 */
export const CLAIM_INTAKE_CHANNELS = ['member_app', 'helpline', 'trustee_initiated'] as const;

/** pgEnum (`CREATE TYPE claim_intake_channel`) derived from the one tuple. */
export const claimIntakeChannelEnum = pgEnum('claim_intake_channel', CLAIM_INTAKE_CHANNELS);

/** The intake-channel literal union — derived from the same tuple (no drift). */
export type ClaimIntakeChannel = (typeof CLAIM_INTAKE_CHANNELS)[number];

export const claims = pgTable(
  'claims',
  {
    // The claim case's canonical id AND its events_log stream_id (architecture
    // §1.9/§1.14). Caller-supplied (the intake flow mints it); NO gen_random_uuid()
    // default so a row can never exist with an id that does not match an event
    // stream. Branded ClaimId (reused from ids/index.ts — NOT a new ClaimCaseId).
    claimCaseId: uuid('claim_case_id').primaryKey().$type<ClaimId>(),

    // Multi-tenant scope (architecture §1.2). RLS predicate column; branded.
    pariwarId: uuid('pariwar_id').notNull().$type<PariwarId>(),

    // The member this claim is filed against (the deceased). The account-frozen
    // overlay (Story 3.1 member/overlay.ts) queries `claim.intake_initiated` events
    // by `payload ->> 'deceased_member_id'`; this column is the indexed cache the
    // overlay/validity consumers filter by. Branded MemberId.
    deceasedMemberId: uuid('deceased_member_id').notNull().$type<MemberId>(),

    // The filer (nominee / Ravi-mode / operator). Nullable — a trustee-initiated
    // claim may have no external claimant.
    claimantActorId: uuid('claimant_actor_id'),

    // The intake channel SET (ICP may converge multiple; Story 6.4). Postgres enum
    // array (`claim_intake_channel[]`). NOT NULL — at least the originating channel.
    intakeChannels: claimIntakeChannelEnum('intake_channels').array().notNull(),

    // The CACHED lifecycle state — a projection of the event-replay, NOT the source
    // of truth. Written ONLY by the projector (claim/project.ts); guarded by the DB
    // trigger + the CI gate. No DB default: the projector writes the replayed result
    // explicitly (the first event projects to `intake_pending`).
    currentState: claimLifecycleStateEnum('current_state').notNull(),

    // The `events_log.event_version` the cached `current_state` was projected from —
    // the staleness / idempotency anchor. `mode: 'number'` matches the events_log
    // precedent (without it Drizzle returns a JS BigInt that breaks numeric
    // comparison with the `number` the projector produces).
    stateEventVersion: bigint('state_event_version', { mode: 'number' }).notNull(),

    // NULL = system / SIE (architecture §1.14 line 1262-1268).
    createdByActor: uuid('created_by_actor'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Per-tenant claim scans / RLS-aware planner hint (pariwar_id leads, mirroring
    // members_pariwar_id_idx). Point lookups use the claim_case_id PK.
    index('claims_pariwar_id_idx').on(t.pariwarId),
    // The overlay/validity consumers filter claims by the deceased member.
    index('claims_deceased_member_id_idx').on(t.deceasedMemberId),
  ],
);

// Inferred row types for the accessor read/write paths (members precedent).
export type ClaimRow = typeof claims.$inferSelect;
export type ClaimInsert = typeof claims.$inferInsert;
