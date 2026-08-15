// `<MemberStatusPanel>` moderation rendering — Story 10.10 (Task 9; AC9, AC10).
//
// The panel is the member's ONLY explanation of a suspension or termination, so these specs pin
// three things a future edit could quietly break:
//   1. moderation is the SECOND producer of `suspended-with-reason` (it was concealment-only);
//   2. `terminated-with-reason` is its own state and outranks every other signal;
//   3. the appeal CTA renders from BOTH — FR-56 makes `restore` trustee-reachable from `terminated`,
//      so the member with the most at stake must still have a way to ask.
//
// Everything is derived from the ONE canonical payload's `specialFlags`; the presenter takes no new
// input and computes no second validity answer.

import type { MemberValidityPayloadDto } from '@twt/contracts';
import { describe, expect, it } from 'vitest';

import {
  buildMemberStatusViewModel,
  deriveHeadlineState,
  CONCEALMENT_REVIEW_FLAG,
} from '../../src/member-status/index.js';
import {
  DETAIL_KEYS,
  HEADLINE_KEYS,
  moderationReasonLabelKey,
  parseModerationFlag,
} from '../../src/member-status/i18n-keys.js';

function basePayload(over: Partial<MemberValidityPayloadDto> = {}): MemberValidityPayloadDto {
  return {
    memberId: '11111111-1111-1111-1111-111111111111',
    evaluatedAt: '2026-08-02T00:00:00.000Z',
    ruleRegistryVersion: 'rrv-1',
    isValid: true,
    isActive: true,
    // Story 10.17 — the ROSTER predicate. `deriveHeadlineState` answers COVERAGE and does NOT read
    // this field (AC3 of 10.16 pinned it byte-unchanged); it is present because the DTO is `.strict()`.
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
    // Story 10.23 — the RESTORATION clock, a SIBLING of `lockInStatus` (never a merge of it). The
    // fixtures below that model a locked-in member override this; everything else is truthfully
    // `never-imposed`, so every pre-10.23 expectation keeps its exact meaning.
    restorationDisciplineStatus: { state: 'never-imposed', imposedAt: null, expiresAt: null },
    specialFlags: [],
    applicableNiyamavaliClauses: [],
    provenanceTrace: [],
    validityPayloadHash: 'hash-1',
    ...over,
  };
}

/**
 * A SUSPENDED member as the validity service actually emits them: `isValid` + `isActive` both false,
 * and `isAssignable: TRUE` since Story 10.17 (they stay on the donor roster). The headline below is
 * still derived from COVERAGE alone — a suspended member reads `suspended-with-reason` regardless.
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

describe('parseModerationFlag — the specialFlags protocol', () => {
  it('reads a suspension flag + its reason code', () => {
    expect(parseModerationFlag(['suspended_per_r14-forgery'])).toEqual({
      status: 'suspended',
      reasonCode: 'r14-forgery',
    });
  });

  it('reads a termination flag + its reason code', () => {
    expect(parseModerationFlag(['terminated_per_regulator-action'])).toEqual({
      status: 'terminated',
      reasonCode: 'regulator-action',
    });
  });

  it('is null when no moderation flag is present', () => {
    expect(parseModerationFlag([])).toBeNull();
    expect(parseModerationFlag([CONCEALMENT_REVIEW_FLAG, 'some_other_flag'])).toBeNull();
  });

  it('TERMINATED wins if both are somehow present — never under-report the severer standing', () => {
    expect(
      parseModerationFlag(['suspended_per_r7-contribution-discipline', 'terminated_per_r14-forgery']),
    ).toMatchObject({ status: 'terminated' });
  });

  it('tolerates a reason code containing underscores/hyphens', () => {
    expect(parseModerationFlag(['suspended_per_r10a-parallel-org-office'])?.reasonCode).toBe(
      'r10a-parallel-org-office',
    );
  });
});

describe('deriveHeadlineState — moderation as a headline producer', () => {
  it('a suspended member reads `suspended-with-reason`', () => {
    expect(deriveHeadlineState(suspendedPayload())).toBe('suspended-with-reason');
  });

  it('a terminated member reads the NEW `terminated-with-reason`', () => {
    expect(deriveHeadlineState(terminatedPayload())).toBe('terminated-with-reason');
  });

  it('TERMINATION outranks every other signal — even a still-valid-looking payload', () => {
    // Defensive: `is_valid` already folds moderation in, so this payload cannot occur in production.
    // The pin exists so a future refactor that reorders the branches fails here rather than telling
    // a terminated member they are active.
    const contradictory = basePayload({
      isValid: true,
      isActive: true,
      specialFlags: ['terminated_per_r14-forgery'],
    });
    expect(deriveHeadlineState(contradictory)).toBe('terminated-with-reason');
  });

  it('a moderation suspension withholds standing even on an otherwise-active payload', () => {
    const contradictory = basePayload({
      isValid: true,
      isActive: true,
      specialFlags: ['suspended_per_regulator-action'],
    });
    expect(deriveHeadlineState(contradictory)).toBe('suspended-with-reason');
  });

  it('the CONCEALMENT producer still works — moderation did not replace it', () => {
    // The regression this story is most likely to cause: `suspended-with-reason` had exactly one
    // producer before 10.10, and it must keep working alongside the new one.
    expect(deriveHeadlineState(basePayload({ specialFlags: [CONCEALMENT_REVIEW_FLAG] }))).toBe(
      'suspended-with-reason',
    );
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

  it('an unmoderated member is unaffected in every direction', () => {
    expect(deriveHeadlineState(basePayload())).toBe('active');
    // A LAPSED member (not moderated): off the roster too, because the lifecycle state itself is
    // outside VALID_STATES. `isAssignable` only diverges from `isValid` under SUSPENSION.
    expect(
      deriveHeadlineState(basePayload({ isValid: false, isActive: false, isAssignable: false })),
    ).toBe('expired-renewable');
  });
});

describe('the view-model: prose explanation + the appeal CTA (AC9)', () => {
  // ⚠ The prose lives on `vm.moderationNotice`, NOT on the headline section's `detailKeys`
  // (review follow-up). These tests previously asserted the detail-key location — which BOTH render
  // layers filter out (`.filter((s) => s.id !== 'headline')`), so they were green while the member
  // was never actually told why. Asserting the reachable carrier is the point.
  it('a SUSPENDED member gets prose + the resolved reason LABEL key, never the raw code', () => {
    const vm = buildMemberStatusViewModel(suspendedPayload('r14-forgery'), { variant: 'member' });
    const headline = vm.sections.find((s) => s.id === 'headline')!;

    expect(vm.headlineKey).toBe(HEADLINE_KEYS['suspended-with-reason']);
    expect(vm.moderationNotice).not.toBeNull();
    expect(vm.moderationNotice?.status).toBe('suspended');
    expect(vm.moderationNotice?.detailKey).toBe(DETAIL_KEYS.moderationSuspended);
    expect(vm.moderationNotice?.reasonLabelKey).toBe(moderationReasonLabelKey('r14-forgery'));
    // A raw registry code must never reach a member-facing key (a11y `:1896`).
    expect(vm.moderationNotice?.detailKey).not.toContain('r14-forgery');
    expect(headline.status).toBe('fail');
  });

  it('an UNMODERATED member has no moderation notice at all', () => {
    // The negative half — without it, a presenter that emitted a notice unconditionally would pass
    // every other test in this block.
    const vm = buildMemberStatusViewModel(basePayload({}), { variant: 'member' });
    expect(vm.moderationNotice).toBeNull();
  });

  it('a TERMINATED member gets the terminated prose + label key', () => {
    const vm = buildMemberStatusViewModel(terminatedPayload('regulator-action'), {
      variant: 'member',
    });

    expect(vm.headlineKey).toBe(HEADLINE_KEYS['terminated-with-reason']);
    expect(vm.moderationNotice?.status).toBe('terminated');
    expect(vm.moderationNotice?.detailKey).toBe(DETAIL_KEYS.moderationTerminated);
    expect(vm.moderationNotice?.reasonLabelKey).toBe(
      moderationReasonLabelKey('regulator-action'),
    );
  });

  it('the prose is REACHABLE: it is not parked on a section the render layers drop', () => {
    // The defect this fix exists for, pinned directly. Both renderers drop the `headline` section
    // and render only `vm.headlineKey`, so anything the member must READ has to live outside it.
    const vm = buildMemberStatusViewModel(suspendedPayload('r14-forgery'), { variant: 'member' });
    const rendered = vm.sections.filter((s) => s.id !== 'headline' && s.visible);
    const reachableDetailKeys = rendered.flatMap((s) => s.detailKeys);
    // The old location is genuinely unreachable — which is exactly why the notice is top-level.
    expect(reachableDetailKeys).not.toContain(DETAIL_KEYS.moderationSuspended);
    expect(vm.moderationNotice?.detailKey).toBe(DETAIL_KEYS.moderationSuspended);
  });

  it('a moderation-only flag set does NOT open an empty red Special flags section', () => {
    // It used to: `visible` keyed on `flags.length > 0` while moderation contributes no detail
    // lines, so a moderated member got a titled, red, contentless box — "something is wrong that we
    // won't tell you about", the opposite of the dignity requirement.
    const vm = buildMemberStatusViewModel(suspendedPayload('r14-forgery'), { variant: 'member' });
    const flagsSection = vm.sections.find((s) => s.id === 'special-flags')!;
    expect(flagsSection.visible).toBe(false);
    // The structured data is still carried for consoles that want it — only the empty render goes.
    expect(flagsSection.data.moderationStatus).toBe('suspended');
  });

  it('the APPEAL CTA renders from BOTH moderation states (FR-56 restore is trustee-reachable)', () => {
    expect(buildMemberStatusViewModel(suspendedPayload(), { variant: 'member' }).showAppealCta).toBe(
      true,
    );
    expect(
      buildMemberStatusViewModel(terminatedPayload(), { variant: 'member' }).showAppealCta,
    ).toBe(true);
  });

  // ── Story 10.22 (AC7) — the §8.8 CTA predicate, and why it is NOT `showAppealCta` ──────────────
  it('the §8.8 MODERATION-appeal CTA renders from BOTH moderation states', () => {
    expect(
      buildMemberStatusViewModel(suspendedPayload(), { variant: 'member' })
        .showModerationAppealCta,
    ).toBe(true);
    expect(
      buildMemberStatusViewModel(terminatedPayload(), { variant: 'member' })
        .showModerationAppealCta,
    ).toBe(true);
  });

  it('⛔ an UNMODERATED member gets neither CTA — there is no act to appeal', () => {
    const vm = buildMemberStatusViewModel(basePayload(), { variant: 'member' });
    expect(vm.showModerationAppealCta).toBe(false);
    expect(vm.showAppealCta).toBe(false);
  });

  it('an unmoderated member gets NO moderation prose (the detail key is absent, not empty)', () => {
    const vm = buildMemberStatusViewModel(basePayload(), { variant: 'member' });
    const headline = vm.sections.find((s) => s.id === 'headline')!;
    expect(headline.detailKeys).toEqual([HEADLINE_KEYS.active]);
    expect(headline.data.moderationStatus).toBeNull();
    expect(headline.data.moderationReasonLabelKey).toBeNull();
  });

  it('the special-flags section surfaces moderation STRUCTURALLY, never as a raw string to print', () => {
    const vm = buildMemberStatusViewModel(terminatedPayload('r14-forgery'), { variant: 'member' });
    const flagsSection = vm.sections.find((s) => s.id === 'special-flags')!;
    // `visible` is now false for a moderation-ONLY flag set (see the empty-section test above) —
    // the structural data is what a console reads, and the member reads `moderationNotice`.
    // What this test still guards is that neither carrier ever hands a render layer the raw
    // `terminated_per_<code>` string to print.
    expect(flagsSection.status).toBe('fail');
    expect(flagsSection.data.moderationStatus).toBe('terminated');
    expect(flagsSection.data.moderationReasonLabelKey).toBe(moderationReasonLabelKey('r14-forgery'));
    expect(String(flagsSection.data.moderationReasonLabelKey)).not.toContain('terminated_per_');
  });

  it('a CONCEALMENT flag still opens the special-flags section — the narrowing is moderation-only', () => {
    // Guards the `visible` change from over-reaching: concealment contributes a real detail line
    // and must keep rendering exactly as it did before Story 10.10.
    const vm = buildMemberStatusViewModel(
      basePayload({ specialFlags: [CONCEALMENT_REVIEW_FLAG] }),
      { variant: 'member' },
    );
    const flagsSection = vm.sections.find((s) => s.id === 'special-flags')!;
    expect(flagsSection.visible).toBe(true);
    expect(flagsSection.detailKeys.length).toBeGreaterThan(0);
  });

  it('BOTH variants derive the SAME moderation headline (admin and member cannot drift)', () => {
    const payload = terminatedPayload();
    expect(buildMemberStatusViewModel(payload, { variant: 'admin' }).headlineState).toBe(
      buildMemberStatusViewModel(payload, { variant: 'member' }).headlineState,
    );
  });
});
