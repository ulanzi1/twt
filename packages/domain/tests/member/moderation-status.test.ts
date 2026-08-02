// Story 10.10 (Task 1; AC2, AC10) — the moderation legality reducer, EXHAUSTIVELY.
//
// The whole 3×3 (status × action) matrix is enumerated, not sampled: exactly four cells are legal
// and the other five must be `null`. Two of those `null` cells are load-bearing GOVERNANCE
// properties a future reviewer is likely to "fix" by mistake, so each also gets its own named test:
//   · `none --terminate-->`      — Decision 2: the harshest action can never be a single click.
//   · `suspended --suspend-->`   — AC2: a re-suspend is a 409, never a silent second event.

import { describe, expect, it } from 'vitest';

import {
  MODERATION_ACTIONS,
  MODERATION_ACTION_EVENT_TYPES,
  MODERATION_EVENT_TYPES,
  MODERATION_STATUSES,
  isLegalModerationTransition,
  moderationActionForEventType,
  nextModerationStatus,
  type ModerationAction,
  type ModerationStatus,
} from '../../src/member/moderation/status.js';

/** The four legal arms (AC2), as `status --action--> next`. Everything not here must be null. */
const LEGAL: ReadonlyArray<readonly [ModerationStatus, ModerationAction, ModerationStatus]> = [
  ['none', 'suspend', 'suspended'],
  ['suspended', 'terminate', 'terminated'],
  ['suspended', 'restore', 'none'],
  ['terminated', 'restore', 'none'],
];

function legalNext(status: ModerationStatus, action: ModerationAction): ModerationStatus | null {
  return LEGAL.find(([s, a]) => s === status && a === action)?.[2] ?? null;
}

describe('nextModerationStatus — the full 3×3 matrix', () => {
  for (const status of MODERATION_STATUSES) {
    for (const action of MODERATION_ACTIONS) {
      const expected = legalNext(status, action);
      const label = expected === null ? 'ILLEGAL → null' : `→ ${expected}`;
      it(`${status} --${action}--> ${label}`, () => {
        expect(nextModerationStatus(status, action)).toBe(expected);
        expect(isLegalModerationTransition(status, action)).toBe(expected !== null);
      });
    }
  }

  it('has EXACTLY four legal arms across the whole matrix (no fifth crept in)', () => {
    const legalCells = MODERATION_STATUSES.flatMap((s) =>
      MODERATION_ACTIONS.filter((a) => nextModerationStatus(s, a) !== null).map((a) => `${s}:${a}`),
    );
    expect(legalCells.sort()).toEqual(
      ['none:suspend', 'suspended:restore', 'suspended:terminate', 'terminated:restore'].sort(),
    );
  });
});

describe('the two load-bearing ILLEGAL arms', () => {
  it('none --terminate--> is ILLEGAL: FR-56 routes termination THROUGH suspension (Decision 2)', () => {
    // `prd.md:849` draws `active ↔ suspended → terminated`: the arrow into `terminated` ORIGINATES
    // at `suspended`. A trustee must suspend first (itself notified, audited and appealable) before
    // the rejoin-locking action is even reachable. Even R14 forgery — the harshest listed ground —
    // is a SUSPENSION reason in the PRD, so it too enters this way.
    expect(nextModerationStatus('none', 'terminate')).toBeNull();
  });

  it('suspended --suspend--> is ILLEGAL: a re-suspend is a 409, not a silent second event', () => {
    expect(nextModerationStatus('suspended', 'suspend')).toBeNull();
  });

  it('terminated is terminal until restored (neither suspend nor terminate applies)', () => {
    expect(nextModerationStatus('terminated', 'suspend')).toBeNull();
    expect(nextModerationStatus('terminated', 'terminate')).toBeNull();
  });

  it('restore on an unmoderated member is a no-op → ILLEGAL, never a 200', () => {
    expect(nextModerationStatus('none', 'restore')).toBeNull();
  });
});

describe('the action ↔ event-type mapping', () => {
  it('uses the epic spellings VERBATIM (event-name drift is a known expensive failure class)', () => {
    expect(MODERATION_ACTION_EVENT_TYPES).toEqual({
      suspend: 'member.moderation.suspended',
      terminate: 'member.moderation.terminated',
      restore: 'member.moderation.restored',
    });
  });

  it('round-trips every action through its event type', () => {
    for (const action of MODERATION_ACTIONS) {
      expect(moderationActionForEventType(MODERATION_ACTION_EVENT_TYPES[action])).toBe(action);
    }
  });

  it('returns null for any non-moderation event type (the overlay fold stays total)', () => {
    expect(moderationActionForEventType('member.grace_entered')).toBeNull();
    expect(moderationActionForEventType('member.moderation.unknown')).toBeNull();
    expect(moderationActionForEventType('')).toBeNull();
  });

  it('MODERATION_EVENT_TYPES covers all three, with no extras', () => {
    expect([...MODERATION_EVENT_TYPES].sort()).toEqual(
      Object.values(MODERATION_ACTION_EVENT_TYPES).sort(),
    );
  });
});
