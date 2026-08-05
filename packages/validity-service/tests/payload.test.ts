// Canonical payload ASSEMBLY + hash — pure unit tests (Story 4.6, Task 6; AC1, AC2, AC3).
//
// Covers: the PRD↔epic field mapping + retirement date projection ([[CR-4.5-D3]]); contribution
// producer_unavailable + R7/R8 omitted (D2-A); is_valid/is_active mapping; validity_payload_hash
// byte-stability + explicit-ordering; the hash excludes evaluatedAt (replay-stable across time).

import type { member } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  assemblePayload,
  computeValidityPayloadHash,
  deriveIsActive,
  deriveIsAssignable,
  deriveIsValid,
  moderationSpecialFlag,
  projectLockInStatus,
  projectRetirementCoverage,
  type AssembleInput,
} from '../src/payload.js';
import { redactForCaller } from '../src/redaction.js';
import { ids } from '@twt/domain';
import { r12Result, r12Slot } from './fixtures/eval-results.js';

const MEMBER = ids.memberId('22222222-2222-2222-2222-222222222222');
const PARIWAR = ids.pariwarId('33333333-3333-3333-3333-333333333333');
const AT = new Date('2025-06-01T00:00:00Z');

function baseInput(over: Partial<AssembleInput> = {}): AssembleInput {
  return {
    memberId: MEMBER,
    evaluatedAt: AT,
    memberState: 'active',
    lockInStatus: { daysAtJoin: null, unlockDate: null, state: 'never-entered' },
    vyawasthaShulkStatus: {
      paidThrough: '2026-01-01T00:00:00.000Z',
      daysUntilLapse: 214,
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

describe('assemblePayload — the canonical shape (AC1)', () => {
  it('always carries contribution producer_unavailable (D2-A — never a fabricated 0)', () => {
    const p = assemblePayload(baseInput());
    expect(p.contributionHistorySummary).toEqual({ status: 'producer_unavailable', producer: 'story-10-24' });
  });

  it('omits R7/R8 from applicableNiyamavaliClauses (only R12 slots exist at member standing)', () => {
    const p = assemblePayload(baseInput({ slots: [r12Slot(r12Result({ grantedYears: 3, isRetired: true }))] }));
    const clauseIds = p.applicableNiyamavaliClauses.map((c) => String(c.clauseId));
    expect(clauseIds).toEqual(['niy.retirement-coverage.r12']);
    expect(clauseIds.some((id) => id.includes('r7') || id.includes('r8'))).toBe(false);
  });

  it('a null clause slot contributes nothing (not "applicable")', () => {
    const p = assemblePayload(baseInput({ slots: [r12Slot(null)] }));
    expect(p.applicableNiyamavaliClauses).toEqual([]);
    expect(p.provenanceTrace).toEqual([]);
    expect(p.ruleRegistryVersion).toBe('no-clauses');
  });

  it('carries top-level is_valid + is_active + rule_registry_version (PRD FR-12A additions)', () => {
    const p = assemblePayload(baseInput({ slots: [r12Slot(r12Result({ grantedYears: 3, isRetired: true }))] }));
    expect(p.isValid).toBe(true); // active → valid
    expect(p.isActive).toBe(true);
    expect(p.ruleRegistryVersion).toBe('0e1c0015-0000-4000-8000-000000000001');
  });

  it('assembles the ordered clause + provenance entries with matching clause/version ids', () => {
    const result = r12Result({ grantedYears: 3, isRetired: true });
    const p = assemblePayload(baseInput({ slots: [r12Slot(result)] }));
    expect(p.applicableNiyamavaliClauses[0]).toMatchObject({
      clauseId: 'niy.retirement-coverage.r12',
      outcome: 'retirement_coverage_computed',
      reasonCode: 'rule.retirement_coverage_computed',
    });
    expect(p.provenanceTrace[0]).toMatchObject({
      clauseId: 'niy.retirement-coverage.r12',
      benefitMechanism: 'pool',
      evaluatedAt: '2025-06-01T00:00:00.000Z',
    });
  });

  it('collects special flags in clause order', () => {
    const result = r12Result({ grantedYears: 0, isRetired: false, specialFlags: ['some_flag'] });
    const p = assemblePayload(baseInput({ slots: [r12Slot(result)] }));
    expect(p.specialFlags).toEqual(['some_flag']);
  });
});

describe('is_valid / is_active mapping (documented state composition)', () => {
  const cases: Array<{ state: member.MemberLifecycleState; valid: boolean; active: boolean }> = [
    { state: 'pending-kyc', valid: false, active: false },
    { state: 'pending-fee', valid: false, active: false },
    { state: 'pending-valid', valid: false, active: false },
    { state: 'lock-in', valid: true, active: false },
    { state: 'active', valid: true, active: true },
    { state: 'active-in-grace', valid: true, active: false },
    { state: 'lapsed-unpaid', valid: false, active: false },
    { state: 'withdrawn', valid: false, active: false },
    { state: 'anonymized', valid: false, active: false },
  ];
  for (const c of cases) {
    it(`${c.state} → valid=${c.valid}, active=${c.active}`, () => {
      expect(deriveIsValid(c.state)).toBe(c.valid);
      expect(deriveIsActive(c.state)).toBe(c.active);
    });
  }
});

// ── Story 10.10 (AC5) — the MODERATION dimension of the truth table ─────────────────────────────
//
// ⚠ This table has NO completeness check: a missing row loses coverage SILENTLY. The moderation
// dimension is therefore enumerated as a full cross-product (every lifecycle state × all three
// moderation statuses) rather than sampled, so a future lifecycle state cannot be added without
// this loop covering it too.
describe('is_valid / is_active × moderation status (Story 10.10, AC5 — Decision 8)', () => {
  const LIFECYCLE_STATES: readonly member.MemberLifecycleState[] = [
    'pending-kyc',
    'pending-fee',
    'pending-valid',
    'lock-in',
    'active',
    'active-in-grace',
    'lapsed-unpaid',
    'withdrawn',
    'anonymized',
  ];
  const VALID_WITHOUT_MODERATION = new Set<string>(['lock-in', 'active', 'active-in-grace']);

  for (const state of LIFECYCLE_STATES) {
    const baseValid = VALID_WITHOUT_MODERATION.has(state);
    const baseActive = state === 'active';

    it(`${state} + moderation 'none' → unchanged (valid=${baseValid}, active=${baseActive})`, () => {
      expect(deriveIsValid(state, 'none')).toBe(baseValid);
      expect(deriveIsActive(state, 'none')).toBe(baseActive);
    });

    for (const moderated of ['suspended', 'terminated'] as const) {
      it(`${state} + moderation '${moderated}' → valid=false, active=false`, () => {
        // Moderation is a HARD conjunction: it can only ever take validity away, never grant it.
        expect(deriveIsValid(state, moderated)).toBe(false);
        expect(deriveIsActive(state, moderated)).toBe(false);
      });
    }
  }

  // ── Story 10.17 — the SAME cross-product for the ROSTER predicate ──────────────────────────────
  //
  // Enumerated identically (never sampled) for the same reason: a future lifecycle state must be
  // covered here automatically. The shape of the answer is DIFFERENT from `is_valid` above, and that
  // difference is the whole story — `suspended` no longer takes the roster away.
  for (const state of LIFECYCLE_STATES) {
    const assignableBase = VALID_WITHOUT_MODERATION.has(state);

    it(`${state} + moderation 'none' → assignable=${assignableBase}`, () => {
      expect(deriveIsAssignable(state, 'none')).toBe(assignableBase);
    });

    it(`${state} + 'suspended' → assignable=${assignableBase} (UNCHANGED — suspension keeps the roster)`, () => {
      // THE line. A suspension removes the entitlement to RECEIVE support, never the obligation to
      // CONTRIBUTE while completing a restoration path (Niyamavali §3.3). `is_valid` still drops.
      expect(deriveIsAssignable(state, 'suspended')).toBe(assignableBase);
      expect(deriveIsValid(state, 'suspended')).toBe(false);
    });

    it(`${state} + 'terminated' → assignable=false (termination DOES remove the roster)`, () => {
      expect(deriveIsAssignable(state, 'terminated')).toBe(false);
    });
  }

  it('a NON-VALID_STATES lifecycle state is unassignable regardless of moderation status', () => {
    // The lifecycle gate is the first conjunct, so it dominates every moderation status. A lapsed or
    // withdrawn member is not on the roster just because they are unmoderated.
    for (const state of ['withdrawn', 'lapsed-unpaid', 'pending-kyc'] as const) {
      for (const status of ['none', 'suspended', 'terminated'] as const) {
        expect(deriveIsAssignable(state, status)).toBe(false);
      }
    }
  });

  it('AC1 REASON-CODE BLINDNESS: assignability never branches on WHICH reason code was recorded', () => {
    // `deriveIsAssignable` takes no reason code AT ALL — the structural proof that no per-code roster
    // rule can exist. The seven codes establish the GROUND for a sanction, never its roster
    // consequence; a per-code rule would relocate a governance decision into a derivation.
    //
    // `.length` only counts params BEFORE the first one with a default value, so it reports 1 here
    // (`state`) — `moderationStatus = 'none'` is invisible to it and this can't detect a 3rd param
    // either. It's a weak arity sanity check only; the real reason-code-blindness proof is behavioural,
    // below.
    expect(deriveIsAssignable.length).toBe(1);

    // …and behaviourally, via the payload, where the reason code IS present and reaches specialFlags.
    const codes = ['r7-contribution-discipline', 'r14-forgery', 'regulator-action', 'moderation-error'];
    const results = codes.map((reasonCode) =>
      assemblePayload(
        baseInput({
          moderationOverlay: { status: 'suspended', reasonCode, since: AT, lastActionAt: AT },
        }),
      ),
    );
    expect(results.map((p) => p.isAssignable)).toEqual([true, true, true, true]);
    // The code DID reach the payload — so the invariance above is a real blindness, not a dead input.
    expect(results.map((p) => p.specialFlags)).toEqual(codes.map((c) => [`suspended_per_${c}`]));
  });

  it('the DEFAULT argument is `none` for the roster predicate too', () => {
    expect(deriveIsAssignable('active')).toBe(deriveIsAssignable('active', 'none'));
  });

  it('REVERT-SANITY: the roster predicate is NOT a copy of `deriveIsValid` — they diverge on suspension', () => {
    // If someone "simplifies" the two booleans back into one, this fails. `is_valid` is COVERAGE,
    // `is_assignable` is the ROSTER, and a suspended member is the payload where they differ.
    expect(deriveIsValid('active', 'suspended')).toBe(false);
    expect(deriveIsAssignable('active', 'suspended')).toBe(true);
    // They agree everywhere else — the divergence is EXACTLY the suspended arm.
    expect(deriveIsAssignable('active', 'none')).toBe(deriveIsValid('active', 'none'));
    expect(deriveIsAssignable('active', 'terminated')).toBe(deriveIsValid('active', 'terminated'));
    expect(deriveIsAssignable('withdrawn', 'none')).toBe(deriveIsValid('withdrawn', 'none'));
  });

  it('the DEFAULT argument is `none` — pre-10.10 single-arg callers keep their meaning', () => {
    expect(deriveIsValid('active')).toBe(deriveIsValid('active', 'none'));
    expect(deriveIsActive('active')).toBe(deriveIsActive('active', 'none'));
  });

  it('REVERT-SANITY: removing the `moderationStatus === "none"` conjunction flips this', () => {
    // The single most consequential line in Story 10.10. `is_valid` is the ENTIRE enforcement
    // surface (Decision 8) — with the conjunction gone, an `active` suspended member reads
    // `is_valid: true` and `assignable-roster.ts` would hand them a pool slot.
    expect(deriveIsValid('active', 'suspended')).toBe(false);
    expect(VALID_WITHOUT_MODERATION.has('active')).toBe(true); // …the state alone WOULD be valid
  });
});

describe('moderation special flags (prd.md:411 form) — AC5', () => {
  it('emits suspended_per_<code> / terminated_per_<code>', () => {
    expect(moderationSpecialFlag('suspended', 'r7-contribution-discipline')).toBe(
      'suspended_per_r7-contribution-discipline',
    );
    expect(moderationSpecialFlag('terminated', 'r14-forgery')).toBe('terminated_per_r14-forgery');
  });

  it('emits NOTHING when the member is not moderated', () => {
    expect(moderationSpecialFlag('none', null)).toBeNull();
    expect(moderationSpecialFlag('none', 'r14-forgery')).toBeNull();
  });

  it('degrades to `_unspecified` rather than emitting a broken flag on a missing code', () => {
    expect(moderationSpecialFlag('suspended', null)).toBe('suspended_per_unspecified');
  });

  it('assemblePayload appends the flag AFTER the clause-order flags (hash determinism)', () => {
    const p = assemblePayload(
      baseInput({
        slots: [r12Slot(r12Result({ grantedYears: 0, isRetired: false, specialFlags: ['some_flag'] }))],
        moderationOverlay: {
          status: 'suspended',
          reasonCode: 'r14-forgery',
          since: AT,
          lastActionAt: AT,
        },
      }),
    );
    expect(p.specialFlags).toEqual(['some_flag', 'suspended_per_r14-forgery']);
    expect(p.isValid).toBe(false);
    expect(p.isActive).toBe(false);
  });

  it('an absent overlay is treated as NOT moderated (pre-10.10 call sites unaffected)', () => {
    const p = assemblePayload(baseInput());
    expect(p.specialFlags).toEqual([]);
    expect(p.isValid).toBe(true);
  });

  it('the moderation flag is MEMBER-VISIBLE — it is not a State-Trustee-only flag', () => {
    // The member must be told WHY (`ux-design-specification.md:1890-1896`). Only the Tier-1
    // rationale is withheld; the bounded reason CODE reaches the member's own panel.
    const p = assemblePayload(
      baseInput({
        moderationOverlay: {
          status: 'terminated',
          reasonCode: 'r14-forgery',
          since: AT,
          lastActionAt: AT,
        },
      }),
    );
    const memberView = redactForCaller(p, {
      actorId: 'self',
      grants: [],
      resource: { dimension: 'self', value: String(MEMBER), pariwarId: PARIWAR },
      isSelf: true,
    });
    expect(memberView.specialFlags).toContain('terminated_per_r14-forgery');
  });
});

describe('projectRetirementCoverage — engine granted_years → FR-12A shape ([[CR-4.5-D3]])', () => {
  it('retired: projects coverage_through = retiredAt + granted_years, days_remaining, active', () => {
    const retiredAt = new Date('2024-06-01T00:00:00Z');
    const cov = projectRetirementCoverage(r12Result({ grantedYears: 3, isRetired: true }), retiredAt, AT);
    expect(cov).toEqual({
      isRetired: true,
      yearsOfCoverageEarned: 3,
      coverageThrough: '2027-06-01T00:00:00.000Z', // 2024-06-01 + 3 years
      daysRemaining: expect.any(Number),
      active: true,
    });
  });

  it('retired but coverage expired → active false, days_remaining 0', () => {
    const retiredAt = new Date('2020-06-01T00:00:00Z'); // +1 year coverage → through 2021, long past AT
    const cov = projectRetirementCoverage(r12Result({ grantedYears: 1, isRetired: true }), retiredAt, AT);
    expect(cov).toMatchObject({ isRetired: true, active: false, daysRemaining: 0 });
  });

  it('non-retired with tenure: nonzero yearsOfCoverageEarned but NO projection + active false', () => {
    const cov = projectRetirementCoverage(r12Result({ grantedYears: 2, isRetired: false }), null, AT);
    expect(cov).toEqual({
      isRetired: false,
      yearsOfCoverageEarned: 2, // earned by tenure, is_retired-independent
      coverageThrough: null,
      daysRemaining: null,
      active: false,
    });
  });

  it('null slot (R12 clause not resolvable) → typed clause_unavailable, never a zero', () => {
    expect(projectRetirementCoverage(null, null, AT)).toEqual({ status: 'clause_unavailable' });
  });
});

describe('projectLockInStatus', () => {
  it('never-entered when clock is null', () => {
    expect(projectLockInStatus(null, AT)).toEqual({ daysAtJoin: null, unlockDate: null, state: 'never-entered' });
  });

  it('projects unlock_date = enteredAt + daysAtJoin and in-lock-in/unlocked state', () => {
    const clock = { enteredAt: new Date('2025-05-01T00:00:00Z'), lockInDaysAtJoin: 60 };
    const inLock = projectLockInStatus(clock, new Date('2025-06-01T00:00:00Z')); // < unlock (2025-06-30)
    expect(inLock).toEqual({ daysAtJoin: 60, unlockDate: '2025-06-30T00:00:00.000Z', state: 'in-lock-in' });
    const unlocked = projectLockInStatus(clock, new Date('2025-08-01T00:00:00Z'));
    expect(unlocked.state).toBe('unlocked');
  });
});

describe('validity_payload_hash — byte-stability + replay-key semantics (AC2)', () => {
  it('is a reproducible 64-hex digest for identical inputs', () => {
    const p1 = assemblePayload(baseInput({ slots: [r12Slot(r12Result({ grantedYears: 3, isRetired: true }))] }));
    const p2 = assemblePayload(baseInput({ slots: [r12Slot(r12Result({ grantedYears: 3, isRetired: true }))] }));
    expect(p1.validityPayloadHash).toHaveLength(64);
    expect(p1.validityPayloadHash).toBe(p2.validityPayloadHash);
  });

  it('EXCLUDES evaluatedAt: same state at a DIFFERENT instant hashes identically (replay-stable)', () => {
    const slots = [r12Slot(r12Result({ grantedYears: 3, isRetired: true }))];
    const a = assemblePayload(baseInput({ slots, evaluatedAt: new Date('2025-06-01T00:00:00Z') }));
    const b = assemblePayload(baseInput({ slots, evaluatedAt: new Date('2025-07-15T09:30:00Z') }));
    expect(a.evaluatedAt).not.toBe(b.evaluatedAt); // wire payload differs
    expect(a.validityPayloadHash).toBe(b.validityPayloadHash); // but the replay hash is identical
  });

  it('CHANGES when a material field changes (registry version)', () => {
    const a = assemblePayload(baseInput({ slots: [r12Slot(r12Result({ grantedYears: 3, isRetired: true }))] }));
    const b = assemblePayload(
      baseInput({
        slots: [r12Slot(r12Result({ grantedYears: 3, isRetired: true, clauseVersionId: '0e1c0015-0000-4000-8000-000000000099' }))],
      }),
    );
    expect(a.validityPayloadHash).not.toBe(b.validityPayloadHash);
  });

  it('the hash omits the validityPayloadHash field itself (no self-reference)', () => {
    const { validityPayloadHash, ...rest } = assemblePayload(baseInput());
    // Recomputing over the rest (minus the hash field) reproduces the stamped hash.
    expect(computeValidityPayloadHash(rest)).toBe(validityPayloadHash);
  });
});
