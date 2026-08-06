// The contribution-during-suspension disclosure presenter — Story 10.16 (Task 4; AC2, AC4, AC5).
//
// Pure Vitest, DB-free (the `@twt/ui` convention). These specs pin the five ways this derivation goes
// wrong, each of which would put a FALSE or MISSING statement about coverage in front of a member who
// is being asked for money:
//   1. detecting on "has a moderation flag" instead of on the RULE — which gets `terminated` wrong;
//   2. fabricating the restoration count as `0` once the `ok` arm exists;
//   3. substituting the JOIN lock-in for the Story 10.23 restoration lock-in (D3) — the dangerous one:
//      a join-locked member IS covered, so that disclosure would be a lie;
//   4. letting Story 10.23 require a copy/render change to light its arm up (AC2);
//   5. growing per-reason-code copy branching, which is how a procedural reason acquires an
//      accusation the trustee never recorded (AC5).

import type { MemberValidityPayloadDto } from '@twt/contracts';
import { describe, expect, it } from 'vitest';

import {
  RESTORATION_LOCK_IN_DISCLOSURE_KEYS,
  SUSPENSION_DISCLOSURE_KEYS,
  deriveContributionDisclosure,
  isUnderContributionPermittingSuspension,
  isUnderRestorationDisciplineLockIn,
} from '../../src/contribution-disclosure/index.js';
import { moderationReasonLabelKey } from '../../src/member-status/i18n-keys.js';

function basePayload(over: Partial<MemberValidityPayloadDto> = {}): MemberValidityPayloadDto {
  return {
    memberId: '11111111-1111-1111-1111-111111111111',
    evaluatedAt: '2026-08-04T00:00:00.000Z',
    ruleRegistryVersion: 'rrv-1',
    isValid: true,
    isActive: true,
    // Story 10.17 — the ROSTER predicate (`isValid` is COVERAGE). An unmoderated active member is
    // both. Each fixture below sets it TRUTHFULLY for the member it models, never blanket-`true`.
    isAssignable: true,
    lockInStatus: { daysAtJoin: 90, unlockDate: '2026-01-01T00:00:00.000Z', state: 'unlocked' },
    vyawasthaShulkStatus: {
      paidThrough: '2027-01-01T00:00:00.000Z',
      daysUntilLapse: 180,
      inRenewalGrace: false,
      graceRemainingDays: null,
    },
    contributionHistorySummary: { status: 'producer_unavailable', producer: 'story-10-24' },
    medicalDisclosureFlags: {
      hasDisclosureOnRecord: false,
      declaredConditionCount: null,
      imaListVersion: null,
      pendingConcealmentFlag: false,
    },
    retirementCoverage: { status: 'clause_unavailable' },
    specialFlags: [],
    applicableNiyamavaliClauses: [],
    provenanceTrace: [],
    validityPayloadHash: 'hash-1',
    ...over,
  };
}

/**
 * A SUSPENDED member as the validity service actually emits them: `isValid` + `isActive` both false —
 * and, since Story 10.17, `isAssignable: TRUE`. That divergence is not incidental to this file: it is
 * exactly the payload that makes this disclosure REACHABLE. Before 10.17, `isAssignable` did not exist,
 * `isValid: false` kept the member off the donor roster, and `/pay` answered
 * `{ available: false, reason: 'unassigned' }` — so every branch below was proven only at test level.
 */
function suspendedPayload(code = 'r7-contribution-discipline'): MemberValidityPayloadDto {
  return basePayload({
    isValid: false,
    isActive: false,
    isAssignable: true,
    specialFlags: [`suspended_per_${code}`],
  });
}

/** A TERMINATED member as the validity service actually emits them — off the roster too (10.17). */
function terminatedPayload(code = 'r14-forgery'): MemberValidityPayloadDto {
  return basePayload({
    isValid: false,
    isActive: false,
    isAssignable: false,
    specialFlags: [`terminated_per_${code}`],
  });
}

describe('the RULE the disclosure fires on (AC1) — a suspension that still permits contribution', () => {
  it('is TRUE for a suspended member', () => {
    expect(isUnderContributionPermittingSuspension(suspendedPayload())).toBe(true);
  });

  it('is FALSE for a terminated member — moderated, but NOT permitted to contribute', () => {
    // The corollary that makes the rule-vs-flag distinction load-bearing: a detector spelled "has a
    // moderation flag" would be TRUE here and would show a terminated member a disclosure about
    // restoring standing they cannot restore.
    expect(isUnderContributionPermittingSuspension(terminatedPayload())).toBe(false);
  });

  it('is FALSE for an unmoderated member', () => {
    expect(isUnderContributionPermittingSuspension(basePayload())).toBe(false);
  });
});

describe('deriveContributionDisclosure — the suspension arm (AC1)', () => {
  it('returns the suspension arm with all THREE parts present', () => {
    const vm = deriveContributionDisclosure(suspendedPayload());
    expect(vm).not.toBeNull();
    expect(vm!.instrument).toBe('suspension');
    // (a) what it does, (b) what it does not buy, (c) the restoration package — all three, always.
    expect(vm!.whatItDoesKey).toBe(SUSPENSION_DISCLOSURE_KEYS.whatItDoes);
    expect(vm!.whatItDoesNotBuyKey).toBe(SUSPENSION_DISCLOSURE_KEYS.whatItDoesNotBuy);
    expect(vm!.restorationPackage).toBeDefined();
    expect(vm!.titleKey).toBe(SUSPENSION_DISCLOSURE_KEYS.title);
    expect(vm!.a11yLabelKey).toBe(SUSPENSION_DISCLOSURE_KEYS.a11yLabel);
  });

  it('attributes cause ONLY through the trustee-recorded reason label', () => {
    const vm = deriveContributionDisclosure(suspendedPayload('r14-forgery'));
    expect(vm!.reasonLabelKey).toBe(moderationReasonLabelKey('r14-forgery'));
  });

  it('returns NULL for a terminated member (not a suspension disclosure)', () => {
    expect(deriveContributionDisclosure(terminatedPayload())).toBeNull();
  });

  it('returns NULL for an unmoderated member — an un-suspended member sees ZERO change', () => {
    expect(deriveContributionDisclosure(basePayload())).toBeNull();
  });
});

describe('the restoration count is honest, never fabricated (AC4 / D1-B; Story 10.25 AC4/D4)', () => {
  // Asserted as the LITERAL, so a future `remaining: 0` fabrication fails this spec rather than
  // quietly telling a member they have completed a restoration package they may never have started.
  //
  // ⚠ `package_unavailable` is no longer the only reachable arm. Story 10.25 shipped the count, so
  // this arm now means specifically "the contribution FACTS are un-derivable" — no projection
  // coverage, an `at` before the watermark, or an unprovisioned R7 registry. Its `producer` literal
  // correctly stays `'story-10-25'`: that story IS its producer, and a per-member gap in a SHIPPED
  // producer is honest (10.24 D6). The base fixture carries a `producer_unavailable` summary, which
  // is exactly that case.
  const expectUnavailable = (payload: MemberValidityPayloadDto): void => {
    const vm = deriveContributionDisclosure(payload);
    expect(vm!.restorationPackage).toEqual({
      status: 'package_unavailable',
      producer: 'story-10-25',
    });
  };

  /** The PRODUCED contribution summary arm, carrying the given restoration package. */
  type ProducedSummary = Extract<
    MemberValidityPayloadDto['contributionHistorySummary'],
    { status: 'ok' }
  >;

  /** A SUSPENDED member whose contribution facts DID derive — the Story 10.25 ordinary case. */
  const withPackage = (
    restorationPackage: ProducedSummary['restorationPackage'],
  ): MemberValidityPayloadDto =>
    basePayload({
      isValid: false,
      isActive: false,
      isAssignable: true,
      specialFlags: ['suspended_per_r7-contribution-discipline'],
      contributionHistorySummary: {
        status: 'ok',
        facts: {
          'contribution.total_count': 4,
          'contribution.ever_contributed': true,
          'contribution.skips_current_year': 1,
          'contribution.in_lapse': true,
          'contribution.r7a_restorations_used': 1,
          // Story 10.26 — the SEVENTH and final supplied fact, on the wire alongside the other six.
          'contribution.personal_event_excuse_claimed': false,
        },
        lapseSince: '2026-03-01T00:00:00.000Z',
        // EMPTY since Story 10.26: every engine key now has a producer. ⚠ Empty does NOT mean
        // "nothing is held" — R7(A)/(B) stay held on blockers that are not facts.
        heldFacts: [],
        restorationPackage,
      },
    });

  it('is package_unavailable when the contribution FACTS are un-derivable', () => {
    expectUnavailable(suspendedPayload());
  });

  it('is package_unavailable on EVERY firing path, including the lock-in arm', () => {
    expectUnavailable(basePayload({ specialFlags: ['restoration_lock_in'] }));
  });

  it('Story 10.25 — carries the PRODUCED { remaining, required } straight through', () => {
    // The presenter is strictly pure `(payload) → view-model`: the numbers are derived by the
    // producer against the APPLIED clause's own `restoration.consecutive_required` and arrive on the
    // payload. This asserts the pass-through, and that the presenter invents nothing.
    const vm = deriveContributionDisclosure(withPackage({ status: 'ok', remaining: 3, required: 5 }));
    expect(vm!.restorationPackage).toEqual({ status: 'ok', remaining: 3, required: 5 });
  });

  it('Story 10.25/D4 — carries the no_consecutive_requirement arm rather than mislabelling it', () => {
    // ⚠ R7(D)/(E)/(F) — the majority of what is activated today — prescribe `lock_in_months` +
    // `catch_up_required` / `complete_all` and carry NO `consecutive_required`. Leaving those members
    // on `package_unavailable` after 10.25 shipped would name a story that HAS shipped and did not
    // close their case — the "honest sentinel quietly becomes a lie" failure 10.24 AC9 corrected.
    const vm = deriveContributionDisclosure(
      withPackage({ status: 'no_consecutive_requirement', clauseId: 'niy.contribution-discipline.r7-d' }),
    );
    expect(vm!.restorationPackage).toEqual({
      status: 'no_consecutive_requirement',
      clauseId: 'niy.contribution-discipline.r7-d',
    });
  });

  it('Story 10.25 — a NULL clauseId means "in no restoration path", not "we cannot tell you"', () => {
    const vm = deriveContributionDisclosure(
      withPackage({ status: 'no_consecutive_requirement', clauseId: null }),
    );
    expect(vm!.restorationPackage).toEqual({ status: 'no_consecutive_requirement', clauseId: null });
    // The distinction that matters: this is NOT the producer-gap arm.
    expect(vm!.restorationPackage.status).not.toBe('package_unavailable');
  });

  it('is never 0-fabricated and never null-rendered-as-blank', () => {
    const vm = deriveContributionDisclosure(suspendedPayload());
    expect(vm!.restorationPackage.status).not.toBe('ok');
    expect(vm!.restorationPackage).not.toBeNull();
  });
});

describe('THE D3 PIN — the join lock-in is NOT the restoration lock-in', () => {
  it('returns NULL for a join-locked member with no moderation flag', () => {
    // `lockInStatus.state === 'in-lock-in'` is the JOIN lock-in. `VALID_STATES` (validity-service
    // payload.ts:56-60) is ['lock-in','active','active-in-grace'], so this member is isValid: TRUE and
    // IS COVERED. Telling them "your contribution does not create beneficiary entitlement" would be a
    // FALSE STATEMENT TO A MEMBER ABOUT THEIR OWN COVERAGE — the exact harm this story prevents,
    // inflicted on a different member. This spec exists to stop that shortcut being reintroduced.
    const joinLocked = basePayload({
      isValid: true,
      isActive: true,
      lockInStatus: { daysAtJoin: 90, unlockDate: '2027-01-01T00:00:00.000Z', state: 'in-lock-in' },
    });
    expect(isUnderRestorationDisciplineLockIn(joinLocked)).toBe(false);
    expect(deriveContributionDisclosure(joinLocked)).toBeNull();
  });

  it('does not fire the lock-in arm for a join-locked member even when isValid is false', () => {
    // A lock-in VIOLATION (in-lock-in and not valid) is still not the 10.23 restoration instrument.
    const violating = basePayload({
      isValid: false,
      isActive: false,
      // Not a moderation case: a non-VALID_STATES lifecycle member is off the roster too (10.17).
      isAssignable: false,
      lockInStatus: { daysAtJoin: 90, unlockDate: '2027-01-01T00:00:00.000Z', state: 'in-lock-in' },
    });
    expect(deriveContributionDisclosure(violating)).toBeNull();
  });
});

describe('THE AC2 PIN — Story 10.23 lights the lock-in arm up with ZERO copy/render changes', () => {
  it('is NOT IN FORCE today — nothing in a shipped payload can select it', () => {
    expect(isUnderRestorationDisciplineLockIn(basePayload())).toBe(false);
    expect(isUnderRestorationDisciplineLockIn(suspendedPayload())).toBe(false);
  });

  it('returns the declared lock-in view-model when the 10.23 overlay signal is present', () => {
    const vm = deriveContributionDisclosure(basePayload({ specialFlags: ['restoration_lock_in'] }));
    // The whole point: this is asserted against the SHIPPED key catalogue, so when 10.23 emits the
    // signal the arm renders through the SAME `pay.tsx` render sites and the SAME copy keys.
    expect(vm).toEqual({
      instrument: 'restoration_lock_in',
      titleKey: RESTORATION_LOCK_IN_DISCLOSURE_KEYS.title,
      whatItDoesKey: RESTORATION_LOCK_IN_DISCLOSURE_KEYS.whatItDoes,
      whatItDoesNotBuyKey: RESTORATION_LOCK_IN_DISCLOSURE_KEYS.whatItDoesNotBuy,
      restorationPackage: { status: 'package_unavailable', producer: 'story-10-25' },
      reasonLabelKey: null,
      a11yLabelKey: RESTORATION_LOCK_IN_DISCLOSURE_KEYS.a11yLabel,
    });
  });

  it('gives the lock-in arm a DISTINCT copy key set from the suspension arm', () => {
    const suspension = deriveContributionDisclosure(suspendedPayload())!;
    const lockIn = deriveContributionDisclosure(
      basePayload({ specialFlags: ['restoration_lock_in'] }),
    )!;
    expect(lockIn.whatItDoesKey).not.toBe(suspension.whatItDoesKey);
    expect(lockIn.whatItDoesNotBuyKey).not.toBe(suspension.whatItDoesNotBuyKey);
    expect(lockIn.titleKey).not.toBe(suspension.titleKey);
  });

  it('reports the suspension arm when both standings are somehow present (the in-force one)', () => {
    const both = basePayload({
      isValid: false,
      isActive: false,
      isAssignable: true, // suspended, not terminated ⇒ still on the roster (10.17)
      specialFlags: ['suspended_per_r7-contribution-discipline', 'restoration_lock_in'],
    });
    expect(deriveContributionDisclosure(both)!.instrument).toBe('suspension');
  });

  it('returns NULL for a terminated member even when the lock-in overlay signal is present — a terminated member is not permitted to contribute under ANY instrument', () => {
    // Regression pin: `isUnderContributionPermittingSuspension` excludes `terminated`, but the lock-in
    // detector must exclude it too, independently — otherwise a payload carrying both a `terminated_per_`
    // flag and the (not-yet-shipped) `restoration_lock_in` flag would fall through to the lock-in arm and
    // show a terminated member a disclosure implying they can still restore standing by contributing.
    const terminatedAndLockedIn = basePayload({
      isValid: false,
      isActive: false,
      isAssignable: false, // terminated ⇒ off the roster (10.17)
      specialFlags: ['terminated_per_fraud', 'restoration_lock_in'],
    });
    expect(isUnderRestorationDisciplineLockIn(terminatedAndLockedIn)).toBe(false);
    expect(deriveContributionDisclosure(terminatedAndLockedIn)).toBeNull();
  });
});

describe('THE AC5 NO-ACCUSATION PIN — no per-reason-code branching', () => {
  it('produces an IDENTICAL view-model for every reason code apart from reasonLabelKey', () => {
    // A recorded reason may be purely PROCEDURAL (`voluntary-pending-review`, `regulator-action`). If a
    // future edit adds "special copy for the serious codes", the copy acquires an accusation the
    // trustee may never have recorded — and this spec is what catches it.
    const codes = [
      'r14-forgery',
      'concealment-confirmed',
      'voluntary-pending-review',
      'regulator-action',
      'trustee-discretion',
      'unspecified',
    ];
    const shapes = codes.map((code) => {
      const vm = deriveContributionDisclosure(suspendedPayload(code))!;
      expect(vm.reasonLabelKey).toBe(moderationReasonLabelKey(code));
      // Everything EXCEPT the reason key must be byte-identical across codes.
      return { ...vm, reasonLabelKey: null };
    });
    for (const shape of shapes) expect(shape).toEqual(shapes[0]);
  });

  it('emits the reason as a LABEL KEY, never the raw registry code', () => {
    const vm = deriveContributionDisclosure(suspendedPayload('r14-forgery'))!;
    expect(vm.reasonLabelKey).toContain('moderationReason');
    expect(vm.reasonLabelKey).not.toBe('r14-forgery');
  });
});

describe('purity — same input, same output (the @twt/ui presenter discipline)', () => {
  it('is referentially stable across repeated calls', () => {
    const payload = suspendedPayload();
    expect(deriveContributionDisclosure(payload)).toEqual(deriveContributionDisclosure(payload));
  });

  it('does not mutate the payload it is given', () => {
    const payload = suspendedPayload();
    const before = JSON.stringify(payload);
    deriveContributionDisclosure(payload);
    expect(JSON.stringify(payload)).toBe(before);
  });
});
