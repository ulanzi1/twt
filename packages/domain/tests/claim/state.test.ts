// Claim lifecycle reducer — pure, DB-free unit tests (Story 6.1, Task 9; AC2/AC3).
//
// Covers: every legal transition (incl. state_trustee_approved → approved as distinct
// steps, and all three `decision` branches of each appeal_stageN_reviewed event),
// illegal/annotation transitions are no-ops, malformed payload → .safeParse fallback,
// and the load-bearing determinism + idempotency + prefix-replay property. Tests
// construct ClaimEventInput objects directly (no DB, no EventRow needed).

import { describe, expect, it } from 'vitest';

import {
  type ClaimEventInput,
  type ClaimLifecycleState,
  claimStateMachine,
  replayClaimState,
} from '../../src/claim/state.js';

// The (partial) live-DB row shape replayClaimState accepts — derived from its own
// signature so the test never imports @twt/events (domain has no such dependency).
type ReplayRows = Parameters<typeof replayClaimState>[0];

/** A reducer input. Payload defaults to {} (ignored by all but the three appeal reviews). */
const ev = (type: string, payload: unknown = {}): ClaimEventInput => ({ type, payload });

/** Fold a sequence from the machine's initial state. */
const fold = (events: ClaimEventInput[]): ClaimLifecycleState => claimStateMachine.fold(events);

const step = (s: ClaimLifecycleState, e: ClaimEventInput): ClaimLifecycleState =>
  claimStateMachine.step(s, e);

// The canonical happy path up to `verifier_review`, reused across tests.
const toVerifierReview: ClaimEventInput[] = [
  ev('claim.intake_initiated'),
  ev('claim.intake_converged'),
  ev('claim.documents_received'),
  ev('claim.peer_mesh_pinged'),
  ev('claim.verifier_reviewing'),
];

describe('claim lifecycle reducer — transitions', () => {
  it('initial state is intake_pending; intake_initiated keeps intake_pending', () => {
    expect(claimStateMachine.initial).toBe('intake_pending');
    expect(fold([ev('claim.intake_initiated')])).toBe('intake_pending');
  });

  it('happy path: intake → converge → docs → peer-mesh → verifier review → approve → freeze → vote → approved → settled', () => {
    expect(
      fold([
        ...toVerifierReview,
        ev('claim.verifier_approved'),
        ev('claim.state_trustee_frozen'),
        ev('claim.state_trustee_approved'),
        ev('claim.approved'),
        ev('claim.settled'),
      ]),
    ).toBe('settled');
  });

  it('state_trustee_approved and approved are DISTINCT steps (not a replay roll-up)', () => {
    expect(step('state_trustee_freeze', ev('claim.state_trustee_approved'))).toBe('state_trustee_approved');
    // `approved` requires its own event; state_trustee_approved does NOT auto-advance to it.
    expect(step('state_trustee_approved', ev('claim.approved'))).toBe('approved');
    // claim.approved is a no-op from the freeze/vote-open state (must not skip the vote).
    expect(step('state_trustee_freeze', ev('claim.approved'))).toBe('state_trustee_freeze');
  });

  it('ground_inspection_scheduled is an annotation no-op in verification_in_progress', () => {
    expect(step('verification_in_progress', ev('claim.ground_inspection_scheduled'))).toBe(
      'verification_in_progress',
    );
  });

  it('ground_inspection_completed (Story 6.7, 22nd event) is an annotation no-op in verification_in_progress', () => {
    expect(step('verification_in_progress', ev('claim.ground_inspection_completed'))).toBe(
      'verification_in_progress',
    );
  });

  it('ground_inspection_completed reducer stays TOTAL — identity from ANY state, never throws (replay-robustness)', () => {
    // The reducer is deliberately identity from terminal/pre-verification states too; the
    // write-path guard (not the reducer) is what prevents an append onto a resolved claim.
    for (const s of ['intake_pending', 'documents_pending', 'settled', 'denied'] as ClaimLifecycleState[]) {
      expect(step(s, ev('claim.ground_inspection_completed'))).toBe(s);
    }
  });

  it('verifier denial → denied; State-Trustee denial → denied', () => {
    expect(step('verifier_review', ev('claim.verifier_denied'))).toBe('denied');
    expect(step('state_trustee_freeze', ev('claim.state_trustee_denied'))).toBe('denied');
  });

  it('appeal stage 1 branches on decision: advance → stage 2, reversed → reversed, upheld → denied', () => {
    expect(step('appeal_stage_1', ev('claim.appeal_stage1_reviewed', { decision: 'advance' }))).toBe('appeal_stage_2');
    expect(step('appeal_stage_1', ev('claim.appeal_stage1_reviewed', { decision: 'reversed' }))).toBe('reversed');
    expect(step('appeal_stage_1', ev('claim.appeal_stage1_reviewed', { decision: 'upheld' }))).toBe('denied');
  });

  it('appeal stage 2 branches on decision: advance → stage 3, reversed → reversed, upheld → denied', () => {
    expect(step('appeal_stage_2', ev('claim.appeal_stage2_reviewed', { decision: 'advance' }))).toBe('appeal_stage_3');
    expect(step('appeal_stage_2', ev('claim.appeal_stage2_reviewed', { decision: 'reversed' }))).toBe('reversed');
    expect(step('appeal_stage_2', ev('claim.appeal_stage2_reviewed', { decision: 'upheld' }))).toBe('denied');
  });

  it('appeal stage 3 has NO advance (Trustee discretion is final): reversed → reversed, upheld → denied, advance → identity', () => {
    expect(step('appeal_stage_3', ev('claim.appeal_stage3_reviewed', { decision: 'reversed' }))).toBe('reversed');
    expect(step('appeal_stage_3', ev('claim.appeal_stage3_reviewed', { decision: 'upheld' }))).toBe('denied');
    // `advance` is illegal at stage 3 → identity (advanceTo === null), never a throw.
    expect(step('appeal_stage_3', ev('claim.appeal_stage3_reviewed', { decision: 'advance' }))).toBe('appeal_stage_3');
  });

  it('full appeal escalation: denied → stage1 → (advance) stage2 → (advance) stage3 → (reversed) reversed → (freeze) re-enters approval', () => {
    expect(
      fold([
        ...toVerifierReview,
        ev('claim.verifier_denied'),
        ev('claim.appeal_stage1_initiated'),
        ev('claim.appeal_stage1_reviewed', { decision: 'advance' }),
        ev('claim.appeal_stage2_reviewed', { decision: 'advance' }),
        ev('claim.appeal_stage3_reviewed', { decision: 'reversed' }),
        ev('claim.state_trustee_frozen'),
      ]),
    ).toBe('state_trustee_freeze');
  });

  it('appeal stage-2/3 initiated events are annotation no-ops (state entered via prior stage advance)', () => {
    expect(step('appeal_stage_2', ev('claim.appeal_stage2_initiated'))).toBe('appeal_stage_2');
    expect(step('appeal_stage_3', ev('claim.appeal_stage3_initiated'))).toBe('appeal_stage_3');
    // stage1_initiated is the ONE initiated event that transitions (denied → appeal_stage_1).
    expect(step('denied', ev('claim.appeal_stage1_initiated'))).toBe('appeal_stage_1');
  });

  it('denied_no_appeal is a terminal annotation no-op (state stays denied; overlay clears elsewhere)', () => {
    expect(step('denied', ev('claim.denied_no_appeal'))).toBe('denied');
  });

  it('illegal/inapplicable transitions are identity (no throw)', () => {
    // converge before intake exists
    expect(step('intake_pending', ev('claim.documents_received'))).toBe('intake_pending');
    // verifier approve when not under review
    expect(step('documents_pending', ev('claim.verifier_approved'))).toBe('documents_pending');
    // settle before approved
    expect(step('verifier_approved', ev('claim.settled'))).toBe('verifier_approved');
    // unknown/forward-compat event type → identity
    expect(step('approved', ev('claim.some_future_event'))).toBe('approved');
    // intake_initiated from a non-initial state → identity (must NOT regress to intake_pending)
    expect(step('approved', ev('claim.intake_initiated'))).toBe('approved');
    expect(step('verifier_review', ev('claim.intake_initiated'))).toBe('verifier_review');
    // appeal review with malformed / absent decision → identity (total reducer: no throw)
    expect(step('appeal_stage_1', ev('claim.appeal_stage1_reviewed', {}))).toBe('appeal_stage_1');
    expect(step('appeal_stage_1', ev('claim.appeal_stage1_reviewed', { decision: 'bogus' }))).toBe('appeal_stage_1');
    // appeal review from the wrong state → identity even with a valid decision
    expect(step('verifier_review', ev('claim.appeal_stage1_reviewed', { decision: 'advance' }))).toBe('verifier_review');
    // state_trustee_frozen only from verifier_approved or reversed
    expect(step('intake_pending', ev('claim.state_trustee_frozen'))).toBe('intake_pending');
  });
});

describe('claim lifecycle reducer — transitions table stays in sync with reduce()', () => {
  // Story 6.1 review finding: nothing previously proved the documented `transitions`
  // table (Dev Notes "Transition table", also passed to defineStateMachine for docs)
  // matches reduce()'s actual behavior. This walks every declared transition and
  // asserts reduce() agrees, so a future edit to one side without the other fails
  // loudly instead of silently drifting.
  const decisionForTarget = (event: string, to: ClaimLifecycleState): unknown => {
    if (!event.endsWith('_reviewed')) return {};
    if (to === 'reversed') return { decision: 'reversed' };
    if (to === 'denied') return { decision: 'upheld' };
    return { decision: 'advance' };
  };

  it('every declared transition matches reduce()', () => {
    const transitions = claimStateMachine.transitions ?? [];
    expect(transitions.length).toBeGreaterThan(0);
    for (const t of transitions) {
      expect(step(t.from, ev(t.event, decisionForTarget(t.event, t.to)))).toBe(t.to);
    }
  });
});

describe('claim lifecycle reducer — determinism + idempotency + prefix-replay (AC3)', () => {
  const stream: ClaimEventInput[] = [
    ev('claim.intake_initiated'),
    ev('claim.intake_converged'),
    ev('claim.documents_received'),
    ev('claim.peer_mesh_pinged'),
    ev('claim.ground_inspection_scheduled'), // annotation
    ev('claim.verifier_reviewing'),
    ev('claim.verifier_approved'),
    ev('claim.state_trustee_frozen'),
    ev('claim.state_trustee_approved'),
    ev('claim.approved'),
  ];

  it('replaying 1..N twice yields the identical final state', () => {
    expect(fold(stream)).toBe(fold([...stream]));
    expect(fold(stream)).toBe('approved');
  });

  it('fold equals manual events.reduce(step, initial) — deterministic equivalence', () => {
    const manual = stream.reduce<ClaimLifecycleState>(
      (s, e) => claimStateMachine.step(s, e),
      claimStateMachine.initial,
    );
    expect(fold(stream)).toBe(manual);
  });

  it('prefix-replay determinism: for every k ≤ N, fold(0..k) === incremental step-fold after event k', () => {
    for (let k = 0; k <= stream.length; k++) {
      const prefix = stream.slice(0, k);
      // Incremental step-by-step fold to exactly event k.
      const incremental = prefix.reduce<ClaimLifecycleState>(
        (s, e) => claimStateMachine.step(s, e),
        claimStateMachine.initial,
      );
      expect(fold(prefix)).toBe(incremental);
      // …and continuing from that intermediate state reaches the same final state (never torn).
      const rest = stream.slice(k);
      const viaPrefix = rest.reduce<ClaimLifecycleState>(
        (s, e) => claimStateMachine.step(s, e),
        fold(prefix),
      );
      expect(viaPrefix).toBe(fold(stream));
    }
  });

  it('replayClaimState (EventRow bridge) matches fold over the same stream', () => {
    const rows = stream.map((e, i) => ({
      eventType: e.type,
      payload: e.payload,
      eventVersion: i + 1,
    })) as unknown as ReplayRows;
    expect(replayClaimState(rows)).toBe(fold(stream));
  });
});
