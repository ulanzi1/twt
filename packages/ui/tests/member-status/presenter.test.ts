// Pure presenter specs — Story 4.7 (Task 3 + Task 7; D4-A). DB-free, mock-free (there is nothing to
// mock — the presenter is `(payload, opts) → view-model` and nothing else). Asserts: every headline-state
// mapping from canonical payloads; the D2 producer_unavailable → "not yet available" (never empty)
// rendering decision; the admin-vs-member view-model divergence; and redaction-aware rendering (a
// narrower caller's already-redacted payload never surfaces a concealment flag).

import type { MemberValidityPayloadDto } from '@twt/contracts';
import { describe, expect, it } from 'vitest';

import {
  buildMemberStatusViewModel,
  deriveHeadlineState,
  CONCEALMENT_REVIEW_FLAG,
} from '../../src/member-status/index.js';

/** A baseline "fully active" canonical payload; tests override the fields under test. */
function basePayload(over: Partial<MemberValidityPayloadDto> = {}): MemberValidityPayloadDto {
  return {
    memberId: '11111111-1111-1111-1111-111111111111',
    evaluatedAt: '2026-07-04T00:00:00.000Z',
    ruleRegistryVersion: 'rrv-1',
    isValid: true,
    isActive: true,
    lockInStatus: { daysAtJoin: 90, unlockDate: '2026-01-01T00:00:00.000Z', state: 'unlocked' },
    vyawasthaShulkStatus: {
      paidThrough: '2027-01-01T00:00:00.000Z',
      daysUntilLapse: 180,
      inRenewalGrace: false,
      graceRemainingDays: null,
    },
    contributionHistorySummary: { status: 'producer_unavailable', producer: 'epic-8-9' },
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

describe('deriveHeadlineState', () => {
  it('active when valid + active + unflagged', () => {
    expect(deriveHeadlineState(basePayload())).toBe('active');
  });

  it('suspended-with-reason when a concealment-review flag survived redaction', () => {
    expect(
      deriveHeadlineState(basePayload({ specialFlags: [CONCEALMENT_REVIEW_FLAG] })),
    ).toBe('suspended-with-reason');
    expect(
      deriveHeadlineState(
        basePayload({
          medicalDisclosureFlags: {
            hasDisclosureOnRecord: true,
            declaredConditionCount: 1,
            imaListVersion: 'v1',
            pendingConcealmentFlag: true,
          },
        }),
      ),
    ).toBe('suspended-with-reason');
  });

  it('expired-not-renewable on a lock-in violation (not valid, still in lock-in)', () => {
    expect(
      deriveHeadlineState(
        basePayload({
          isValid: false,
          isActive: false,
          lockInStatus: { daysAtJoin: 90, unlockDate: '2027-01-01T00:00:00.000Z', state: 'in-lock-in' },
        }),
      ),
    ).toBe('expired-not-renewable');
  });

  it('expired-renewable when not valid but paid before (lapse is renewable)', () => {
    expect(
      deriveHeadlineState(
        basePayload({
          isValid: false,
          isActive: false,
          lockInStatus: { daysAtJoin: 90, unlockDate: '2026-01-01T00:00:00.000Z', state: 'unlocked' },
          vyawasthaShulkStatus: {
            paidThrough: '2026-01-01T00:00:00.000Z',
            daysUntilLapse: 0,
            inRenewalGrace: false,
            graceRemainingDays: null,
          },
        }),
      ),
    ).toBe('expired-renewable');
  });

  it('expired-renewable when valid-but-inactive in renewal grace', () => {
    expect(
      deriveHeadlineState(
        basePayload({
          isActive: false,
          vyawasthaShulkStatus: {
            paidThrough: '2026-06-01T00:00:00.000Z',
            daysUntilLapse: 30,
            inRenewalGrace: true,
            graceRemainingDays: 30,
          },
        }),
      ),
    ).toBe('expired-renewable');
  });

  it('pending-onboarding when never paid + not active', () => {
    expect(
      deriveHeadlineState(
        basePayload({
          isValid: false,
          isActive: false,
          lockInStatus: { daysAtJoin: null, unlockDate: null, state: 'never-entered' },
          vyawasthaShulkStatus: {
            paidThrough: null,
            daysUntilLapse: null,
            inRenewalGrace: false,
            graceRemainingDays: null,
          },
        }),
      ),
    ).toBe('pending-onboarding');
  });
});

describe('buildMemberStatusViewModel', () => {
  it('renders the contribution section as unavailable (D2) — NEVER an empty grid', () => {
    const vm = buildMemberStatusViewModel(basePayload(), { variant: 'admin' });
    const contribution = vm.sections.find((s) => s.id === 'contribution')!;
    expect(contribution.status).toBe('unavailable');
    expect(contribution.detailKeys).toHaveLength(1);
    expect(contribution.detailKeys[0]).toContain('contributionUnavailable');
    expect(contribution.data['producer']).toBe('epic-8-9');
  });

  it('admin vs member divergence: identity suppressed + redaction applied only for the member variant', () => {
    const admin = buildMemberStatusViewModel(basePayload(), { variant: 'admin' });
    const member = buildMemberStatusViewModel(basePayload(), { variant: 'member' });
    expect(admin.identitySuppressed).toBe(false);
    expect(admin.redactionApplied).toBe(false);
    expect(member.identitySuppressed).toBe(true);
    expect(member.redactionApplied).toBe(true);
    // The eligibility-bearing derivation is IDENTICAL across variants (no drift).
    expect(member.headlineState).toBe(admin.headlineState);
    expect(member.sections.map((s) => s.id)).toEqual(admin.sections.map((s) => s.id));
  });

  it('a redacted (narrower-caller) payload never surfaces a concealment flag', () => {
    // The service already forced pendingConcealmentFlag=false + stripped the flag for a narrow caller.
    const vm = buildMemberStatusViewModel(basePayload(), { variant: 'member' });
    const special = vm.sections.find((s) => s.id === 'special-flags')!;
    expect(special.visible).toBe(false);
    expect(special.data['concealmentReviewRequired']).toBe(false);
    expect(vm.headlineState).toBe('active');
  });

  it('a State-Trustee payload with the flag surfaces the special-flags section prominently', () => {
    const vm = buildMemberStatusViewModel(
      basePayload({ specialFlags: [CONCEALMENT_REVIEW_FLAG] }),
      { variant: 'admin' },
    );
    const special = vm.sections.find((s) => s.id === 'special-flags')!;
    expect(special.visible).toBe(true);
    expect(special.status).toBe('fail');
    expect(special.detailKeys[0]).toContain('concealmentReviewRequired');
    expect(vm.headlineState).toBe('suspended-with-reason');
    expect(vm.showAppealCta).toBe(true);
  });

  it('shows the appeal CTA on failure states and hides it when active', () => {
    expect(buildMemberStatusViewModel(basePayload(), { variant: 'member' }).showAppealCta).toBe(false);
    const failing = buildMemberStatusViewModel(
      basePayload({
        isValid: false,
        isActive: false,
        lockInStatus: { daysAtJoin: 90, unlockDate: '2027-01-01T00:00:00.000Z', state: 'in-lock-in' },
      }),
      { variant: 'member' },
    );
    expect(failing.showAppealCta).toBe(true);
  });

  it('orders rule explanations by the payload precedence and emits i18n keys (not raw codes)', () => {
    const vm = buildMemberStatusViewModel(
      basePayload({
        applicableNiyamavaliClauses: [
          { clauseId: 'niy.a', clauseVersionId: 'v1', outcome: 'pass', reasonCode: 'rule.a_ok' },
          { clauseId: 'niy.b', clauseVersionId: 'v2', outcome: 'pass', reasonCode: 'rule.b_ok' },
        ],
      }),
      { variant: 'admin' },
    );
    expect(vm.ruleExplanations.map((r) => r.reasonCode)).toEqual(['rule.a_ok', 'rule.b_ok']);
    expect(vm.ruleExplanations[0]?.explanationKey).toBe('memberStatus.rule.rule.a_ok');
  });

  it('surfaces the lock-in policy clause deep-link target when present in provenance', () => {
    const vm = buildMemberStatusViewModel(
      basePayload({
        lockInStatus: { daysAtJoin: 90, unlockDate: '2027-01-01T00:00:00.000Z', state: 'in-lock-in' },
        applicableNiyamavaliClauses: [
          { clauseId: 'niy.lock-in.policy', clauseVersionId: 'cv9', outcome: 'in_lock_in', reasonCode: 'rule.lock_in' },
        ],
      }),
      { variant: 'admin' },
    );
    const lockIn = vm.sections.find((s) => s.id === 'lock-in')!;
    expect(lockIn.data['clauseId']).toBe('niy.lock-in.policy');
    expect(lockIn.data['clauseVersionId']).toBe('cv9');
  });

  it('retirement section is visible only when retired or coverage earned', () => {
    const notApplicable = buildMemberStatusViewModel(basePayload(), { variant: 'admin' });
    expect(notApplicable.sections.find((s) => s.id === 'retirement')!.visible).toBe(false);
    const retired = buildMemberStatusViewModel(
      basePayload({
        retirementCoverage: {
          isRetired: true,
          yearsOfCoverageEarned: 5,
          coverageThrough: '2031-01-01T00:00:00.000Z',
          daysRemaining: 500,
          active: true,
        },
      }),
      { variant: 'admin' },
    );
    expect(retired.sections.find((s) => s.id === 'retirement')!.visible).toBe(true);
  });
});
