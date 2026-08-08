// The restoration-discipline payload fold — Story 10.23 (AC5, AC6, AC7). PURE, DB-free.

import { ids, member } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  assemblePayload,
  deriveIsActive,
  deriveIsAssignable,
  deriveIsValid,
  projectRestorationDisciplineStatus,
  RESTORATION_LOCK_IN_FLAG,
  type AssembleInput,
} from '../src/payload.js';

const MEMBER = ids.memberId('11111111-1111-1111-1111-111111111111');

/** A live restoration lock-in at the evaluated instant. */
function liveOverlay(expiresAt = '2026-12-01T00:00:00.000Z', imposedAt = '2026-09-01T00:00:00.000Z') {
  return {
    state: 'in-lock-in' as const,
    imposedAt: new Date(imposedAt),
    expiresAt: new Date(expiresAt),
    impositions: [],
  };
}

function baseInput(over: Partial<AssembleInput> = {}): AssembleInput {
  return {
    memberId: MEMBER,
    evaluatedAt: new Date('2026-10-01T00:00:00.000Z'),
    memberState: 'active',
    lockInStatus: { daysAtJoin: 30, unlockDate: '2026-02-01T00:00:00.000Z', state: 'unlocked' },
    vyawasthaShulkStatus: {
      paidThrough: '2027-01-01T00:00:00.000Z',
      daysUntilLapse: 92,
      inRenewalGrace: false,
      graceRemainingDays: null,
    },
    medicalDisclosureFlags: {
      hasDisclosureOnRecord: false,
      declaredConditionCount: null,
      imaListVersion: null,
      pendingConcealmentFlag: false,
    },
    retirementCoverage: { status: 'clause_unavailable' },
    slots: [],
    ...over,
  };
}

describe('Story 10.23 — ⭐ AC6: the fold reaches COVERAGE and NEVER the ROSTER', () => {
  it('a locked-in member is isValid:FALSE, isAssignable:TRUE — the divergence that makes this survivable', () => {
    // ⭐ THE ASSERTION THE WHOLE INSTRUMENT RESTS ON, mirroring the shipped suspended-member case.
    // If a locked-in member left the donor roster, pool assignment is the ONLY contribution path
    // (Story 7.6, fenced by 8.10), so R7(D)'s catch-up would become structurally unreachable and the
    // instrument would recreate — automatically, at scale, with no trustee acting — the de-facto
    // permanent ban Story 10.17 was written to correct.
    const payload = assemblePayload(baseInput({ restorationDiscipline: liveOverlay() }));
    expect(payload.isValid).toBe(false);
    expect(payload.isAssignable).toBe(true);
  });

  it('⛔ deriveIsAssignable CANNOT SEE the overlay — the guarantee is the SIGNATURE, not a convention', () => {
    // `deriveIsAssignable(state, moderationStatus)` takes no third argument. Failure mode 2 is
    // impossible by construction as long as that stays true. This test fails to compile — not merely
    // fails — if someone widens the signature, which is the point.
    expect(deriveIsAssignable.length).toBeLessThanOrEqual(2);
    expect(deriveIsAssignable('active', 'none')).toBe(true);
  });

  it('deriveIsValid drops for a live lock-in and RECOVERS once expired — no event, no job (AC4)', () => {
    expect(deriveIsValid('active', 'none', 'in-lock-in')).toBe(false);
    expect(deriveIsValid('active', 'none', 'expired')).toBe(true);
    expect(deriveIsValid('active', 'none', 'never-imposed')).toBe(true);
  });

  it('deriveIsActive is reconciled deliberately — FR-12A is "valid AND past lock-in AND not suspended"', () => {
    expect(deriveIsActive('active', 'none', 'in-lock-in')).toBe(false);
    expect(deriveIsActive('active', 'none', 'expired')).toBe(true);
  });

  it('⛔ a member in the JOINING lock-in lifecycle state stays isValid:TRUE (10.16 D3, NOT reopened)', () => {
    // The live contradiction Escalation 4 routes to the Trustee Panel: `VALID_STATES` contains
    // 'lock-in', so the JOINING instrument does not remove coverage while this one does. This story
    // makes it member-visible; it deliberately does NOT resolve it.
    expect(deriveIsValid('lock-in', 'none', 'never-imposed')).toBe(true);
  });
});

describe("Story 10.23 — ⭐ AC7: the wire is `restoration_lock_in`, and its ORDER is pinned", () => {
  it('emits the literal flag Story 10.16 shipped its consumer for, dark', () => {
    const payload = assemblePayload(baseInput({ restorationDiscipline: liveOverlay() }));
    expect(payload.specialFlags).toContain('restoration_lock_in');
    expect(RESTORATION_LOCK_IN_FLAG).toBe('restoration_lock_in');
  });

  it('emits NOTHING when the lock-in has expired or was never imposed', () => {
    expect(assemblePayload(baseInput()).specialFlags).not.toContain(RESTORATION_LOCK_IN_FLAG);
    expect(
      assemblePayload(
        baseInput({
          restorationDiscipline: {
            state: 'expired',
            imposedAt: null,
            expiresAt: null,
            impositions: [],
          },
        }),
      ).specialFlags,
    ).not.toContain(RESTORATION_LOCK_IN_FLAG);
  });

  it('⚠ when a MODERATION flag co-occurs, the order is DECLARED: moderation THEN restoration', () => {
    // The payload hash is order-sensitive, so an incidental position would break replay identity.
    const payload = assemblePayload(
      baseInput({
        moderationOverlay: {
          status: 'suspended',
          reasonCode: 'r7-contribution-discipline',
          since: new Date('2026-09-01T00:00:00.000Z'),
          lastActionAt: new Date('2026-09-01T00:00:00.000Z'),
        },
        restorationDiscipline: liveOverlay(),
      }),
    );
    expect(payload.specialFlags).toEqual([
      'suspended_per_r7-contribution-discipline',
      'restoration_lock_in',
    ]);
  });
});

describe('Story 10.23 — ⭐ AC5/D4: TWO clocks, simultaneously representable, independently expiring', () => {
  it('a member serves BOTH clocks at once, with DIFFERENT unlock instants', () => {
    // ⛔ The rejected design was a single merged `disciplineStatus`. It cannot represent this, and
    // the first thing anyone does with it is take a max or a min — subsumption by arithmetic.
    const payload = assemblePayload(
      baseInput({
        // The JOINING clock, still running.
        lockInStatus: {
          daysAtJoin: 30,
          unlockDate: '2026-10-15T00:00:00.000Z',
          state: 'in-lock-in',
        },
        // The RESTORATION clock, running to a DIFFERENT instant.
        restorationDiscipline: liveOverlay('2026-12-01T00:00:00.000Z'),
      }),
    );
    expect(payload.lockInStatus.state).toBe('in-lock-in');
    expect(payload.restorationDisciplineStatus.state).toBe('in-lock-in');
    expect(payload.lockInStatus.unlockDate).not.toBe(payload.restorationDisciplineStatus.expiresAt);
    expect(payload.restorationDisciplineStatus.expiresAt).toBe('2026-12-01T00:00:00.000Z');
  });

  it('expiring ONE leaves the OTHER untouched — neither derives from the other', () => {
    const joiningStillLive = {
      daysAtJoin: 30,
      unlockDate: '2026-10-15T00:00:00.000Z',
      state: 'in-lock-in' as const,
    };
    // The restoration clock has elapsed; the joining clock has not.
    const payload = assemblePayload(
      baseInput({
        lockInStatus: joiningStillLive,
        restorationDiscipline: {
          state: 'expired',
          imposedAt: null,
          expiresAt: null,
          impositions: [],
        },
      }),
    );
    expect(payload.lockInStatus).toEqual(joiningStillLive);
    expect(payload.restorationDisciplineStatus.state).toBe('expired');
    // ⚠ `lockInStatus` is BYTE-UNCHANGED by this story — no field added, none reinterpreted.
    expect(Object.keys(payload.lockInStatus).sort()).toEqual(['daysAtJoin', 'state', 'unlockDate']);
  });

  it('the projection is a pure shape conversion of the overlay (AC5 combination already applied)', () => {
    expect(projectRestorationDisciplineStatus(member.restorationDiscipline.NO_RESTORATION_DISCIPLINE)).toEqual(
      { state: 'never-imposed', imposedAt: null, expiresAt: null },
    );
  });
});

describe('Story 10.23 — AC10(a): the payload hash MOVES, and the field is APPENDED', () => {
  it('a live lock-in changes validityPayloadHash — the instrument is inside the replay key', () => {
    const clean = assemblePayload(baseInput());
    const locked = assemblePayload(baseInput({ restorationDiscipline: liveOverlay() }));
    expect(locked.validityPayloadHash).not.toBe(clean.validityPayloadHash);
  });

  it('carries the new sub-object on EVERY payload, including an un-imposed member', () => {
    expect(assemblePayload(baseInput()).restorationDisciplineStatus).toEqual({
      state: 'never-imposed',
      imposedAt: null,
      expiresAt: null,
    });
  });
});
