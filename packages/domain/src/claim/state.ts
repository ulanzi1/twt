// Claim lifecycle state machine + pure reducer — Story 6.1 (Task 3; AC2/AC3).
//
// THE source of truth for a claim's state. The persisted `claims.current_state`
// column is a projection of replaying this reducer over the claim's `events_log`
// stream (architecture §1.9 aggregate + §1.14 line 1231-1236). The reducer is the
// runtime authority; the `transitions` table is documentation only. Twin of
// member/state.ts.
//
// ── PURE + DETERMINISTIC + IDEMPOTENT (AC3 — load-bearing) ────────────────────
// `reduce(state, event)` MUST be pure: no Date.now(), no randomness, no I/O, no
// reads of mutable module state. Replaying a stream from event 1..N produces the
// SAME final state every time, on every machine — that is what makes Epic 7's
// pool-binding + Epic 9's reconciliation audit-reproducibility free for the
// ₹50L/decision flow. A non-pure reducer silently breaks it.
//
// ── Total reducer: illegal/inapplicable transitions are IDENTITY (no-op) ──────
// The reducer never throws on a well-formed event. An event that does not apply to
// the current state returns the state unchanged. This keeps replay robust and
// forward-compatible (an event type a LATER story adds replays as identity here).
// Whether a transition SHOULD be emitted is the EMITTER's concern (Stories 6.2–6.16),
// not the reducer's. The ANNOTATION events that don't advance the primary state
// (ground_inspection_scheduled, the stage-2/3 appeal-filing markers, denied_no_appeal)
// are identity by design (see the transition notes below + events.ts).
//
// ── The `decision` disambiguator (the ONE payload-content branch) ─────────────
// Every transition but three derives the next state from `(current_state, event.type)`
// alone. The three `appeal_stageN_reviewed` events each map to MORE THAN ONE target
// from the same source (advance | reversed | upheld) via a SINGLE event type — so the
// reducer ALSO reads `payload.decision` for these. `.safeParse` keeps it total: a
// malformed/absent decision returns identity rather than throwing (Story 3.1 review
// finding — never throw ZodError from the reducer).

import { z } from 'zod';

import { defineStateMachine, type StateMachine } from '../state-machine.js';
import { eventsLog } from '../schema/events_log.js';
import { type ClaimLifecycleState } from '../schema/claims.js';
import { appealReviewDecisionSchema } from './events.js';

export { CLAIM_LIFECYCLE_STATES, type ClaimLifecycleState } from '../schema/claims.js';

/** The live-DB event row shape (Drizzle camelCase). Derived locally so the reducer
 * has no `@twt/events` dependency (domain↔events would cycle). */
type EventRow = typeof eventsLog.$inferSelect;

/**
 * The reducer's event input. `StateMachineConfig<S, E>` requires `E extends { type:
 * string }`, but `EventRow` carries `eventType` (Drizzle camelCase of `event_type`),
 * NOT `type` — so `machine.fold(rows)` would fail type-check. `toClaimEvent` is the
 * mandatory bridge. Unit tests construct `ClaimEventInput` objects directly (DB-free).
 */
export interface ClaimEventInput {
  readonly type: string;
  readonly payload: unknown;
}

/** Minimal extractor for the ONE payload field the reducer branches on (the three
 * appeal-review events). The FULL strict payload is validated at append time (the
 * projector's payloadSchema); the reducer reads only `decision` so it stays robust
 * and easy to unit-test. `advance` is NOT accepted for a stage-3 review (guarded at
 * the branch site, not here). Imports the ONE canonical decision vocabulary from
 * `events.ts` rather than re-declaring it (Story 6.1 review finding — a second
 * hand-maintained copy could silently drift from the payload schema's). */
const decisionSchema = z.object({ decision: appealReviewDecisionSchema });

/** Resolve an appeal-review outcome from the payload's `decision`, given the state
 * reached when `decision === 'advance'`. Returns identity (`from`) when the payload
 * is malformed OR when `advance` is illegal at this stage (`advanceTo === null`). */
function resolveAppealReview(
  from: ClaimLifecycleState,
  payload: unknown,
  advanceTo: ClaimLifecycleState | null,
): ClaimLifecycleState {
  const parsed = decisionSchema.safeParse(payload);
  if (!parsed.success) return from;
  switch (parsed.data.decision) {
    case 'advance':
      return advanceTo ?? from; // stage 3 has no advance → identity
    case 'reversed':
      return 'reversed';
    case 'upheld':
      return 'denied';
  }
}

/**
 * The canonical claim-lifecycle reducer. Encodes the authoritative transition graph
 * (Story 6.1 Dev Notes "Transition table"). Branch order mirrors the documented table.
 */
function reduce(state: ClaimLifecycleState, event: ClaimEventInput): ClaimLifecycleState {
  switch (event.type) {
    // Creation: only legal as the FIRST event of a stream. The machine starts at
    // `intake_pending` (= initial), so this is a no-op from initial. From any other
    // state it returns state unchanged (IDENTITY contract — a corrupt replay must not
    // regress a live claim back to intake_pending).
    case 'claim.intake_initiated':
      return state;

    // ICP dedup picked the canonical claim (Story 6.4).
    case 'claim.intake_converged':
      if (state === 'intake_pending') return 'intake_converged';
      return state;

    // Death cert / documents received (Story 6.5).
    case 'claim.documents_received':
      if (state === 'intake_converged') return 'documents_pending';
      return state;

    // Peer-mesh verification pinged → verification begins (Story 6.6).
    case 'claim.peer_mesh_pinged':
      if (state === 'documents_pending') return 'verification_in_progress';
      return state;

    // ANNOTATION: peer-mesh response recorded (Story 6.6) — peer-mesh AND ground-inspection
    // signals BOTH gather during verification (PRD §4.6 "both, not either"), so a response
    // does NOT advance the primary state. Identity, exactly like ground_inspection_scheduled.
    case 'claim.peer_mesh_responded':
      return state;

    // ANNOTATION: ground inspection scheduled — both signals required (PRD §4.6
    // "both, not either"), so this does NOT advance the primary state. Identity.
    case 'claim.ground_inspection_scheduled':
      return state;

    // Verifier console opens review (Story 6.10/6.11).
    case 'claim.verifier_reviewing':
      if (state === 'verification_in_progress') return 'verifier_review';
      return state;

    // Verifier verdict (Story 6.11).
    case 'claim.verifier_approved':
      if (state === 'verifier_review') return 'verifier_approved';
      return state;
    case 'claim.verifier_denied':
      if (state === 'verifier_review') return 'denied';
      return state;

    // Cycle-freeze window opens for this claim (Story 6.13). Enters from a fresh
    // verifier approval OR when an appeal reversed a prior denial (re-enters approval).
    case 'claim.state_trustee_frozen':
      if (state === 'verifier_approved' || state === 'reversed') return 'state_trustee_freeze';
      return state;

    // Per-claim trustee vote during the open freeze (approved-in-principle, reversible).
    case 'claim.state_trustee_approved':
      if (state === 'state_trustee_freeze') return 'state_trustee_approved';
      return state;

    // State Trustee denial during freeze (Story 6.13).
    case 'claim.state_trustee_denied':
      if (state === 'state_trustee_freeze') return 'denied';
      return state;

    // Cycle-freeze bulk-approval commit — the clean milestone Epic 7/9 key off. A
    // DISTINCT step from state_trustee_approved (per-claim vote), NOT a roll-up.
    case 'claim.approved':
      if (state === 'state_trustee_approved') return 'approved';
      return state;

    // Pool spawn + disbursement complete → terminal. Also clears the account-frozen
    // overlay (member/overlay.ts consumes this event type by name).
    case 'claim.settled':
      if (state === 'approved') return 'settled';
      return state;

    // ── Internal appeal (3-stage; Story 6.16) ────────────────────────────────
    // The appeal SUBGRAPH is entered ONCE from `denied` (stage1_initiated). Movement
    // between stages is via the reviewed(advance) decisions (Dev Notes "Appeal-review
    // branching"). The stage-2/3 `_initiated` events are formal-filing ANNOTATION
    // markers (the panel convened; the state was already entered by the prior stage's
    // advance) → identity, mirroring ground_inspection_scheduled.
    case 'claim.appeal_stage1_initiated':
      if (state === 'denied') return 'appeal_stage_1';
      return state;
    case 'claim.appeal_stage2_initiated':
    case 'claim.appeal_stage3_initiated':
      return state; // annotation markers — state entered via the prior stage's advance

    case 'claim.appeal_stage1_reviewed':
      if (state === 'appeal_stage_1') return resolveAppealReview(state, event.payload, 'appeal_stage_2');
      return state;
    case 'claim.appeal_stage2_reviewed':
      if (state === 'appeal_stage_2') return resolveAppealReview(state, event.payload, 'appeal_stage_3');
      return state;
    case 'claim.appeal_stage3_reviewed':
      // Stage 3 is Trustee discretion — final. No `advance` (advanceTo = null).
      if (state === 'appeal_stage_3') return resolveAppealReview(state, event.payload, null);
      return state;

    // ANNOTATION: appeal window closed/exhausted — claim STAYS `denied` (terminal).
    // Sole current consumer is the account-frozen overlay UNFREEZE. Identity.
    case 'claim.denied_no_appeal':
      return state;

    // Any unknown/forward-compat event type → identity.
    default:
      return state;
  }
}

/**
 * The claim lifecycle state machine. `initial` is `intake_pending`: a claim only
 * exists once `claim.intake_initiated` is appended, and that event projects to
 * `intake_pending`, so a real stream's fold begins effectively at `intake_pending`.
 * The transition table's conceptual `(none)` pre-state is not a persisted enum label.
 */
export const claimStateMachine: StateMachine<ClaimLifecycleState, ClaimEventInput> =
  defineStateMachine<ClaimLifecycleState, ClaimEventInput>({
    initial: 'intake_pending',
    reduce,
    // Documentation-only transition matrix (Dev Notes "Transition table"). Creation
    // (intake_initiated → intake_pending) is omitted: its `from` is the conceptual
    // `(none)`, which is not a valid persisted state. The three appeal-review rows
    // fan out via `decision` — the runtime authority is `reduce`.
    transitions: [
      { from: 'intake_pending', event: 'claim.intake_converged', to: 'intake_converged' },
      { from: 'intake_converged', event: 'claim.documents_received', to: 'documents_pending' },
      { from: 'documents_pending', event: 'claim.peer_mesh_pinged', to: 'verification_in_progress' },
      { from: 'verification_in_progress', event: 'claim.verifier_reviewing', to: 'verifier_review' },
      { from: 'verifier_review', event: 'claim.verifier_approved', to: 'verifier_approved' },
      { from: 'verifier_review', event: 'claim.verifier_denied', to: 'denied' },
      { from: 'verifier_approved', event: 'claim.state_trustee_frozen', to: 'state_trustee_freeze' },
      { from: 'reversed', event: 'claim.state_trustee_frozen', to: 'state_trustee_freeze' },
      { from: 'state_trustee_freeze', event: 'claim.state_trustee_approved', to: 'state_trustee_approved' },
      { from: 'state_trustee_freeze', event: 'claim.state_trustee_denied', to: 'denied' },
      { from: 'state_trustee_approved', event: 'claim.approved', to: 'approved' },
      { from: 'approved', event: 'claim.settled', to: 'settled' },
      { from: 'denied', event: 'claim.appeal_stage1_initiated', to: 'appeal_stage_1' },
      { from: 'appeal_stage_1', event: 'claim.appeal_stage1_reviewed', to: 'appeal_stage_2' },
      { from: 'appeal_stage_1', event: 'claim.appeal_stage1_reviewed', to: 'reversed' },
      { from: 'appeal_stage_1', event: 'claim.appeal_stage1_reviewed', to: 'denied' },
      { from: 'appeal_stage_2', event: 'claim.appeal_stage2_reviewed', to: 'appeal_stage_3' },
      { from: 'appeal_stage_2', event: 'claim.appeal_stage2_reviewed', to: 'reversed' },
      { from: 'appeal_stage_2', event: 'claim.appeal_stage2_reviewed', to: 'denied' },
      { from: 'appeal_stage_3', event: 'claim.appeal_stage3_reviewed', to: 'reversed' },
      { from: 'appeal_stage_3', event: 'claim.appeal_stage3_reviewed', to: 'denied' },
    ],
  });

/** Map a live-DB `EventRow` to the reducer's `ClaimEventInput` (the mandatory bridge
 * — `eventType` → `type`). */
function toClaimEvent(row: EventRow): ClaimEventInput {
  return { type: row.eventType, payload: row.payload };
}

/**
 * Replay an ordered event stream to the claim's current lifecycle state. Callers load
 * the rows (PK-ordered by `event_version`) and fold them through the machine.
 * Deterministic + idempotent (AC3): replaying 1..N twice yields the same state.
 */
export function replayClaimState(rows: readonly EventRow[]): ClaimLifecycleState {
  return claimStateMachine.fold(rows.map(toClaimEvent));
}
