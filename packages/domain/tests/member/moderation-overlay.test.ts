// Story 10.10 (Task 1; AC1, AC10) — the pure moderation overlay fold + the IDENTITY pin.
//
// Two properties matter here and they are independent:
//   1. `evaluateModerationOverlay` folds an ordered event list deterministically and replay-safely.
//   2. All three `member.moderation.*` events are IDENTITY through `memberStateMachine`, so
//      `members.state` provably cannot move (Decision 1 — the single most important invariant in
//      this story). That pin is what makes it safe to route the moderation append through the
//      canonical `projectMemberState` projector.

import { describe, expect, it } from 'vitest';

import {
  MEMBER_LIFECYCLE_STATES,
  memberStateMachine,
  type MemberLifecycleState,
} from '../../src/member/state.js';
import {
  NO_MODERATION,
  evaluateModerationOverlay,
  type ModerationOverlayEventInput,
} from '../../src/member/moderation/overlay.js';
import { MODERATION_EVENT_TYPES } from '../../src/member/moderation/status.js';

const T0 = new Date('2026-01-01T00:00:00.000Z');
const T1 = new Date('2026-02-01T00:00:00.000Z');
const T2 = new Date('2026-03-01T00:00:00.000Z');
const T3 = new Date('2026-04-01T00:00:00.000Z');

function ev(type: string, occurredAt: Date, reason_code?: string): ModerationOverlayEventInput {
  return { type, occurredAt, payload: reason_code === undefined ? {} : { reason_code } };
}

const suspended = (at: Date, code = 'r7-contribution-discipline') =>
  ev('member.moderation.suspended', at, code);
const terminated = (at: Date, code = 'r14-forgery') => ev('member.moderation.terminated', at, code);
const restored = (at: Date, code = 'moderation-error') => ev('member.moderation.restored', at, code);

describe('evaluateModerationOverlay — the fold', () => {
  it('an empty stream is NOT moderated (the default for every member)', () => {
    expect(evaluateModerationOverlay([])).toEqual(NO_MODERATION);
  });

  it('suspend → suspended, carrying the reason code and the instant', () => {
    expect(evaluateModerationOverlay([suspended(T0)])).toEqual({
      status: 'suspended',
      reasonCode: 'r7-contribution-discipline',
      since: T0,
      lastActionAt: T0,
    });
  });

  it('suspend → terminate advances `since` to the TERMINATION instant', () => {
    // `since` is "when the CURRENT standing began", not "when moderation began" — a terminated
    // member's 12-month rejoin clock and their explanation copy both key off the termination.
    expect(evaluateModerationOverlay([suspended(T0), terminated(T1)])).toEqual({
      status: 'terminated',
      reasonCode: 'r14-forgery',
      since: T1,
      lastActionAt: T1,
    });
  });

  it('restore returns to `none` and CLEARS the code + since, but keeps lastActionAt', () => {
    expect(evaluateModerationOverlay([suspended(T0), restored(T1)])).toEqual({
      status: 'none',
      reasonCode: null,
      since: null,
      lastActionAt: T1,
    });
  });

  it('restores a TERMINATED member (the arm the rejoin lock depends on — AC7)', () => {
    const overlay = evaluateModerationOverlay([suspended(T0), terminated(T1), restored(T2)]);
    expect(overlay.status).toBe('none');
    expect(overlay.since).toBeNull();
  });

  it('re-suspension after a restore starts a FRESH standing', () => {
    const overlay = evaluateModerationOverlay([
      suspended(T0),
      restored(T1),
      suspended(T2, 'regulator-action'),
    ]);
    expect(overlay).toEqual({
      status: 'suspended',
      reasonCode: 'regulator-action',
      since: T2,
      lastActionAt: T2,
    });
  });

  it('is TOTAL: an ILLEGAL event from the folded status is identity, never a throw', () => {
    // The WRITE path rejects an illegal action with a typed 409 before appending; the FOLD must
    // stay robust for replay over any stream (a hand-repaired one, or one seeded by a future story).
    const overlay = evaluateModerationOverlay([
      terminated(T0), // illegal from `none` (Decision 2) → skipped
      suspended(T1),
      suspended(T2), // illegal re-suspend → skipped, does NOT move `since`
    ]);
    expect(overlay.status).toBe('suspended');
    expect(overlay.since).toEqual(T1);
    expect(overlay.lastActionAt).toEqual(T1);
  });

  it('ignores non-moderation event types entirely', () => {
    const overlay = evaluateModerationOverlay([
      ev('member.grace_entered', T0),
      suspended(T1),
      ev('member.address_updated', T2),
    ]);
    expect(overlay.status).toBe('suspended');
    expect(overlay.lastActionAt).toEqual(T1);
  });

  it('survives a malformed payload: the status still folds, the code degrades to null', () => {
    for (const payload of [null, undefined, 'nope', 42, {}, { reason_code: '' }]) {
      const overlay = evaluateModerationOverlay([
        { type: 'member.moderation.suspended', occurredAt: T0, payload },
      ]);
      expect(overlay.status).toBe('suspended');
      expect(overlay.reasonCode).toBeNull();
    }
  });

  it('is DETERMINISTIC + replay-safe: folding the same list twice is byte-identical', () => {
    const stream = [suspended(T0), terminated(T1), restored(T2), suspended(T3)];
    expect(evaluateModerationOverlay(stream)).toEqual(evaluateModerationOverlay(stream));
    // …and folding a PREFIX yields the standing at that point (what `atTimestamp` bounding does).
    expect(evaluateModerationOverlay(stream.slice(0, 2)).status).toBe('terminated');
    expect(evaluateModerationOverlay(stream.slice(0, 3)).status).toBe('none');
  });

  it('ORDER is load-bearing: the same events in a different order fold differently', () => {
    // Guards the accessor's `orderBy(asc(event_version))` — if the query ever dropped its ordering,
    // this asymmetry is what would surface as a wrong verdict rather than a silent coin-flip.
    expect(evaluateModerationOverlay([suspended(T0), restored(T1)]).status).toBe('none');
    expect(evaluateModerationOverlay([restored(T1), suspended(T0)]).status).toBe('suspended');
  });
});

describe('IDENTITY through the member lifecycle reducer (Decision 1 — the load-bearing pin)', () => {
  it('every member.moderation.* event leaves EVERY lifecycle state unchanged', () => {
    // If this ever fails, moderation has started moving `members.state` — which is precisely the
    // outcome Decision 1 exists to prevent (five TERMINAL_STATES Sets, the news audience filter,
    // peer-mesh selection, every seeded niyamavali member_state_in clause and the renewal grace
    // clock would all silently mis-classify, with ZERO compile errors to warn anyone).
    for (const state of MEMBER_LIFECYCLE_STATES as readonly MemberLifecycleState[]) {
      for (const type of MODERATION_EVENT_TYPES) {
        const next = memberStateMachine.step(state, {
          type,
          payload: { reason_code: 'r14-forgery', moderation_from: 'none', moderation_to: 'suspended' },
        });
        expect(next, `${type} from ${state}`).toBe(state);
      }
    }
  });

  it('MEMBER_LIFECYCLE_STATES is UNCHANGED — no suspended/terminated label was added', () => {
    // The naive reading of the epic AC. Adding these labels compiles cleanly and breaks silently.
    expect(MEMBER_LIFECYCLE_STATES).not.toContain('suspended');
    expect(MEMBER_LIFECYCLE_STATES).not.toContain('terminated');
  });

  it('a full moderation stream replays to the SAME lifecycle state it started from', () => {
    const stream = MODERATION_EVENT_TYPES.map((type) => ({
      type,
      payload: { reason_code: 'r14-forgery' },
    }));
    expect(memberStateMachine.fold(stream)).toBe(memberStateMachine.fold([]));
  });
});
