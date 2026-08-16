// Pure presenter specs — Story 4.7 (Task 3 + Task 7; D4-A). DB-free, mock-free (there is nothing to
// mock — the presenter is `(payload, opts) → view-model` and nothing else). Asserts: every headline-state
// mapping from canonical payloads; the D2 producer_unavailable → "not yet available" (never empty)
// rendering decision; the admin-vs-member view-model divergence; and redaction-aware rendering (a
// narrower caller's already-redacted payload never surfaces a concealment flag).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
    // Story 10.17 — the ROSTER predicate. The status headline answers COVERAGE and never reads this
    // field; each override below that models a NON-moderated failure state sets it `false` truthfully.
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
          isAssignable: false,
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
          isAssignable: false,
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
          isAssignable: false,
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
    expect(contribution.data['producer']).toBe('story-10-24');
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
        isAssignable: false,
        lockInStatus: { daysAtJoin: 90, unlockDate: '2027-01-01T00:00:00.000Z', state: 'in-lock-in' },
      }),
      { variant: 'member' },
    );
    expect(failing.showAppealCta).toBe(true);
  });

  // ⭐ Story 10.22 (AC7) — THE POLARITY PAIR THAT KEEPS THE TWO PREDICATES APART.
  // `showAppealCta` is TRUE on the expired states, which is correct for "offer a way to ask someone
  // to look again". `showModerationAppealCta` must be FALSE there: an expired member is under no
  // moderation, has no `member_moderation_actions` row, and §8.8 gives them nothing to appeal.
  // Routing them to the §8.8 form would earn a 422 `member_moderation.appeal_not_appealable` — a dead
  // end that reads as a broken product. ⛔ If this ever goes red because the two were collapsed, that
  // is the regression.
  it('an EXPIRED (unmoderated) member gets the generic CTA but NOT the §8.8 appeal CTA', () => {
    const failing = buildMemberStatusViewModel(
      basePayload({
        isValid: false,
        isActive: false,
        isAssignable: false,
        lockInStatus: { daysAtJoin: 90, unlockDate: '2027-01-01T00:00:00.000Z', state: 'in-lock-in' },
      }),
      { variant: 'member' },
    );
    expect(failing.showAppealCta).toBe(true);
    expect(failing.showModerationAppealCta).toBe(false);
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

  // ── Story 10.26 (AC6) — R7(G) reaches the MEMBER'S OWN RECORD as an explanation ─────────────────
  //
  // This is the thing the story exists to produce. R7(G) is excluded from the trustee ACCUSATION
  // channel (`r7-candidate-scan.ts`'s `imposesRestorationObligation` filter, AC5/D4), and it is
  // deliberately NOT excluded here: `factsEstablishing[]` informs, `flags[]` accuses, and R7(G) is
  // granted the first and denied the second. Filtering this path would leave R7(G) activated but
  // MUTE — the member would still never learn what the Niyamavali says about personal events.
  it("R7(G) surfaces on the member's own record with a key that RESOLVES in en and hi (AC6)", async () => {
    const vm = buildMemberStatusViewModel(
      basePayload({
        applicableNiyamavaliClauses: [
          {
            clauseId: 'niy.contribution-discipline.r7-g',
            clauseVersionId: 'v1',
            // `interpretClause` builds `rule.${decision}` and R7(G)'s `on_pass` is `no_exemption`.
            outcome: 'no_exemption',
            reasonCode: 'rule.no_exemption',
          },
        ],
      }),
      { variant: 'member' },
    );
    const explanation = vm.ruleExplanations.find(
      (r) => r.clauseId === 'niy.contribution-discipline.r7-g',
    );
    expect(explanation).toBeDefined();
    // ⚠ NOTE the DOUBLED `rule.` segment. Story 10.26's AC6 predicted `memberStatus.rule.no_exemption`,
    // one segment short: `ruleExplanationKey` prefixes `memberStatus.rule.` onto a reasonCode that is
    // ITSELF already `rule.`-prefixed. The shipped shape (pinned by the test above since Story 4.7)
    // is what the copy must be authored against.
    expect(explanation!.explanationKey).toBe('memberStatus.rule.rule.no_exemption');

    // ⭐ AND IT RESOLVES. `ruleExplanationKey` interpolates blindly and cannot fail loudly, so a
    // missing key renders the RAW CODE to the member — which `ux-design-specification.md:1896`
    // forbids on accessibility grounds. Both locales are checked, not just `en`.
    // Read from disk rather than importing `@twt/i18n`: `@twt/ui` deliberately does not depend on it
    // (the presenter is PURE and emits KEYS only — the screen resolves them with `useT()`), and a
    // test must not be the reason a package boundary moves.
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
    for (const locale of ['en', 'hi'] as const) {
      const bundle = JSON.parse(
        readFileSync(path.join(repoRoot, `packages/i18n/locales/${locale}/common.json`), 'utf8'),
      ) as Record<string, string>;
      const copy = bundle[explanation!.explanationKey];
      expect(
        copy,
        `${explanation!.explanationKey} is missing from ${locale}/common.json — the member would be shown the raw reason code`,
      ).toBeTruthy();
      expect(copy!.length).toBeGreaterThan(20);
    }
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
    const notApplicable = buildMemberStatusViewModel(
      basePayload({
        retirementCoverage: {
          isRetired: false,
          yearsOfCoverageEarned: 0,
          coverageThrough: null,
          daysRemaining: null,
          active: false,
        },
      }),
      { variant: 'admin' },
    );
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

  it('retirement section renders the clause_unavailable gap as visible "not yet available" — never silently hidden', () => {
    // basePayload()'s default retirementCoverage is { status: 'clause_unavailable' } — a typed gap
    // (R12 registry unprovisioned), NOT the same as "not applicable" (Review Findings, 2026-07-04).
    const vm = buildMemberStatusViewModel(basePayload(), { variant: 'admin' });
    const retirement = vm.sections.find((s) => s.id === 'retirement')!;
    expect(retirement.visible).toBe(true);
    expect(retirement.status).toBe('unavailable');
  });
});
