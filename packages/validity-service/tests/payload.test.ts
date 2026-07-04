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
  deriveIsValid,
  projectLockInStatus,
  projectRetirementCoverage,
  type AssembleInput,
} from '../src/payload.js';
import { ids } from '@twt/domain';
import { r12Result, r12Slot } from './fixtures/eval-results.js';

const MEMBER = ids.memberId('22222222-2222-2222-2222-222222222222');
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
    expect(p.contributionHistorySummary).toEqual({ status: 'producer_unavailable', producer: 'epic-8-9' });
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
