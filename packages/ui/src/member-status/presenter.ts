// The `<MemberStatusPanel>` presenter — Story 4.7 (Task 3; D4-A, AC1 + AC2).
//
// STRICTLY PURE (D4 refinement iv — this becomes shared infrastructure): `(payload, opts) → view-model`
// and NOTHING else. NO react/react-native import, NO API call, NO DB read, NO permission check
// (redaction is ALREADY applied upstream by `@twt/validity-service` — the presenter only reads whatever
// survived), NO side-effecting i18n lookup (it emits KEYS; the render layer resolves them). Same input →
// same output. Because there is nothing to mock, it is asserted with pure unit tests.
//
// ── ONE canonical source of eligibility ─────────────────────────────────────────────────────────────
// Every headline/section signal is derived from the canonical `MemberValidityPayload` (isValid /
// isActive / lockInStatus.state / vyawasthaShulkStatus / retirementCoverage / medicalDisclosureFlags /
// specialFlags / applicableNiyamavaliClauses). The presenter NEVER computes a second validity answer —
// that would fork the source of truth the whole Validity Service exists to be. Rule ordering is the
// payload's declared precedence (provenance, not eligibility — [[project_niyamavali_precedence_is_provenance]]).
//
// ── Two variants, one derivation ────────────────────────────────────────────────────────────────────
// `variant: 'admin'` renders the full audit-trace + identity; `variant: 'member'` suppresses identity
// (AC2a), simplifies provenance to "what applies to you" (AC2b), and is the redacted view. The HEADLINE
// + SECTION + WINDOW derivation is IDENTICAL across variants (same payload → same answer); only
// `identitySuppressed` / `redactionApplied` differ, so the two panels cannot drift.

import type { MemberValidityPayloadDto } from '@twt/contracts';

import {
  CONCEALMENT_REVIEW_FLAG,
  DETAIL_KEYS,
  HEADLINE_KEYS,
  SECTION_TITLE_KEYS,
  ruleExplanationKey,
} from './i18n-keys.js';
import type {
  HeadlineState,
  MemberStatusViewModel,
  PanelSection,
  RuleExplanation,
} from './view-model.js';

export interface PresenterOptions {
  /** `admin` = full audit-trace + identity; `member` = identity-suppressed, simplified provenance. */
  variant: 'admin' | 'member';
}

/**
 * Derive the headline state from the canonical payload. Ordered most-severe-first so the surfaced label
 * is the strongest applicable standing:
 *   1. active            — isValid && isActive (covered + narrowly active).
 *   2. suspended         — a State-Trustee concealment-review flag survived redaction (standing withheld).
 *   3. expired-not-renew — not valid AND still in lock-in (a lock-in violation is terminal, not renewable).
 *   4. expired-renewable — not valid (or valid-but-inactive) with a renewal path: paid before + in grace
 *                          or lapsed-unpaid (renewal restores to active).
 *   5. pending-onboarding — the residual: never paid / mid-signup (no renewal path because never active).
 */
export function deriveHeadlineState(payload: MemberValidityPayloadDto): HeadlineState {
  const { isValid, isActive, lockInStatus, vyawasthaShulkStatus, medicalDisclosureFlags, specialFlags } =
    payload;

  const concealmentFlagged =
    medicalDisclosureFlags.pendingConcealmentFlag || specialFlags.includes(CONCEALMENT_REVIEW_FLAG);

  if (isValid && isActive) {
    // Active, but a surviving concealment-review flag withholds standing pending verifier review.
    return concealmentFlagged ? 'suspended-with-reason' : 'active';
  }
  if (concealmentFlagged) return 'suspended-with-reason';

  const everPaid = vyawasthaShulkStatus.paidThrough !== null;

  if (!isValid) {
    // A lock-in violation (still inside the lock-in window but not valid) is not renewal-restorable.
    if (lockInStatus.state === 'in-lock-in') return 'expired-not-renewable';
    // Paid before → the lapse is renewable; never paid → never onboarded.
    return everPaid ? 'expired-renewable' : 'pending-onboarding';
  }

  // Valid but not narrowly active: in renewal grace is a renewable-expired standing; else still onboarding.
  if (vyawasthaShulkStatus.inRenewalGrace) return 'expired-renewable';
  return 'pending-onboarding';
}

/** Build the Vyawastha Shulk section (b). */
function vyawasthaShulkSection(payload: MemberValidityPayloadDto): PanelSection {
  const vs = payload.vyawasthaShulkStatus;
  const detailKeys: string[] = [];
  let status: PanelSection['status'] = 'ok';
  if (vs.paidThrough === null) {
    detailKeys.push(DETAIL_KEYS.vsNeverPaid);
    status = 'warn';
  } else {
    detailKeys.push(DETAIL_KEYS.vsPaidThrough);
    if (vs.inRenewalGrace) {
      detailKeys.push(DETAIL_KEYS.vsInGrace);
      status = 'warn';
    }
    if (vs.daysUntilLapse !== null) detailKeys.push(DETAIL_KEYS.vsDaysUntilLapse);
  }
  return {
    id: 'vyawastha-shulk',
    titleKey: SECTION_TITLE_KEYS['vyawastha-shulk'],
    status,
    detailKeys,
    data: {
      paidThrough: vs.paidThrough,
      daysUntilLapse: vs.daysUntilLapse,
      inRenewalGrace: vs.inRenewalGrace,
    },
    visible: true,
  };
}

/** Build the lock-in section (c), with the deep-link target to the lock-in policy clause. */
function lockInSection(payload: MemberValidityPayloadDto): PanelSection {
  const li = payload.lockInStatus;
  // The lock-in policy clause the deep-link targets: the applicable clause whose id addresses lock-in, if
  // present in the provenance (else null — the render layer omits the link). We surface the clauseId as a
  // structured value; the render layer builds the Niyamavali deep-link.
  const lockInClause =
    payload.applicableNiyamavaliClauses.find((c) => c.clauseId.includes('lock-in')) ?? null;
  const detailKey =
    li.state === 'in-lock-in'
      ? DETAIL_KEYS.lockInActive
      : li.state === 'unlocked'
        ? DETAIL_KEYS.lockInUnlocked
        : DETAIL_KEYS.lockInNeverEntered;
  return {
    id: 'lock-in',
    titleKey: SECTION_TITLE_KEYS['lock-in'],
    status: li.state === 'in-lock-in' ? 'info' : 'ok',
    detailKeys: [detailKey],
    data: {
      state: li.state,
      unlockDate: li.unlockDate,
      clauseId: lockInClause?.clauseId ?? null,
      clauseVersionId: lockInClause?.clauseVersionId ?? null,
    },
    visible: true,
  };
}

/** Build the contribution-discipline section (d) — D2: producer_unavailable → "not yet available". */
function contributionSection(payload: MemberValidityPayloadDto): PanelSection {
  // The FR-12A payload always carries the typed `producer_unavailable` sentinel today (Epic 8/9). Render
  // it as an explicit "not yet available" affordance — NEVER an empty grid (the never-placeholder rule).
  return {
    id: 'contribution',
    titleKey: SECTION_TITLE_KEYS.contribution,
    status: 'unavailable',
    detailKeys: [DETAIL_KEYS.contributionUnavailable],
    data: { producer: payload.contributionHistorySummary.producer },
    visible: true,
  };
}

/** Build the medical-disclosure section (e). */
function medicalSection(payload: MemberValidityPayloadDto): PanelSection {
  const m = payload.medicalDisclosureFlags;
  const detailKeys: string[] = [
    m.hasDisclosureOnRecord ? DETAIL_KEYS.medicalHasDisclosure : DETAIL_KEYS.medicalNoDisclosure,
  ];
  if (m.pendingConcealmentFlag) detailKeys.push(DETAIL_KEYS.medicalConcealmentFlag);
  return {
    id: 'medical',
    titleKey: SECTION_TITLE_KEYS.medical,
    status: m.pendingConcealmentFlag ? 'fail' : m.hasDisclosureOnRecord ? 'info' : 'ok',
    detailKeys,
    data: {
      hasDisclosureOnRecord: m.hasDisclosureOnRecord,
      declaredConditionCount: m.declaredConditionCount,
      pendingConcealmentFlag: m.pendingConcealmentFlag,
    },
    visible: true,
  };
}

/** Build the retirement-coverage section (f) — visible only when applicable (retired or coverage earned). */
function retirementSection(payload: MemberValidityPayloadDto): PanelSection {
  const rc = payload.retirementCoverage;
  if ('status' in rc) {
    // clause_unavailable — the R12 registry was unprovisioned for this Pariwar (a typed gap, not a zero).
    return {
      id: 'retirement',
      titleKey: SECTION_TITLE_KEYS.retirement,
      status: 'unavailable',
      detailKeys: [DETAIL_KEYS.retirementUnavailable],
      data: {},
      visible: false,
    };
  }
  const applicable = rc.isRetired || rc.yearsOfCoverageEarned > 0;
  return {
    id: 'retirement',
    titleKey: SECTION_TITLE_KEYS.retirement,
    status: rc.active ? 'ok' : 'info',
    detailKeys: [rc.isRetired ? DETAIL_KEYS.retirementActive : DETAIL_KEYS.retirementEarnedNotRetired],
    data: {
      isRetired: rc.isRetired,
      yearsOfCoverageEarned: rc.yearsOfCoverageEarned,
      coverageThrough: rc.coverageThrough,
      daysRemaining: rc.daysRemaining,
      active: rc.active,
    },
    visible: applicable,
  };
}

/** Build the special-flags section (g) — `concealment_review_required` highlighted; visible only when present. */
function specialFlagsSection(payload: MemberValidityPayloadDto): PanelSection {
  const flags = payload.specialFlags;
  const hasConcealment =
    flags.includes(CONCEALMENT_REVIEW_FLAG) || payload.medicalDisclosureFlags.pendingConcealmentFlag;
  const detailKeys = hasConcealment ? [DETAIL_KEYS.concealmentReviewRequired] : [];
  return {
    id: 'special-flags',
    titleKey: SECTION_TITLE_KEYS['special-flags'],
    status: hasConcealment ? 'fail' : 'ok',
    detailKeys,
    data: { flags: flags.join(','), concealmentReviewRequired: hasConcealment },
    // Only render when there is a flag to surface (prominent for the Epic 6 verifier console — AC1g).
    visible: flags.length > 0 || hasConcealment,
  };
}

/** Map the ordered applicable clauses → rule explanations (provenance order = the payload's precedence). */
function buildRuleExplanations(payload: MemberValidityPayloadDto): RuleExplanation[] {
  return payload.applicableNiyamavaliClauses.map((c) => ({
    clauseId: c.clauseId,
    clauseVersionId: c.clauseVersionId,
    reasonCode: c.reasonCode,
    outcome: c.outcome,
    explanationKey: ruleExplanationKey(c.reasonCode),
  }));
}

const FAILURE_STATES: ReadonlySet<HeadlineState> = new Set<HeadlineState>([
  'suspended-with-reason',
  'expired-renewable',
  'expired-not-renewable',
]);

/**
 * Build the complete `<MemberStatusPanel>` view-model from the canonical validity payload. Pure +
 * synchronous + dependency-free — same `(payload, opts)` in → same view-model out.
 */
export function buildMemberStatusViewModel(
  payload: MemberValidityPayloadDto,
  opts: PresenterOptions,
): MemberStatusViewModel {
  const headlineState = deriveHeadlineState(payload);
  const isMember = opts.variant === 'member';

  const headlineSection: PanelSection = {
    id: 'headline',
    titleKey: SECTION_TITLE_KEYS.headline,
    status:
      headlineState === 'active'
        ? 'ok'
        : headlineState === 'pending-onboarding'
          ? 'info'
          : 'fail',
    detailKeys: [HEADLINE_KEYS[headlineState]],
    data: { headlineState, isValid: payload.isValid, isActive: payload.isActive },
    visible: true,
  };

  const sections: PanelSection[] = [
    headlineSection,
    vyawasthaShulkSection(payload),
    lockInSection(payload),
    contributionSection(payload),
    medicalSection(payload),
    retirementSection(payload),
    specialFlagsSection(payload),
  ];

  return {
    headlineState,
    headlineKey: HEADLINE_KEYS[headlineState],
    sections,
    ruleExplanations: buildRuleExplanations(payload),
    validityWindow: {
      activeFrom: null,
      validThrough: payload.vyawasthaShulkStatus.paidThrough,
    },
    showAppealCta: FAILURE_STATES.has(headlineState),
    redactionApplied: isMember,
    identitySuppressed: isMember,
  };
}
