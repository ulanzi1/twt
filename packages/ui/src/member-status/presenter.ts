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
  moderationReasonLabelKey,
  parseModerationFlag,
  ruleExplanationKey,
} from './i18n-keys.js';
import type {
  HeadlineState,
  MemberStatusViewModel,
  ModerationNotice,
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
 *   0. terminated        — (Story 10.10) a moderation TERMINATION. The most severe standing there is:
 *                          it outranks every other signal, because nothing else the payload says
 *                          changes the fact that the membership has ended.
 *   1. active            — isValid && isActive (covered + narrowly active).
 *   2. suspended         — a State-Trustee concealment-review flag survived redaction, OR (Story
 *                          10.10) an active moderation SUSPENSION. Both mean "standing withheld,
 *                          under review", which is why they share one headline state.
 *   3. expired-not-renew — not valid AND still in lock-in (a lock-in violation is terminal, not renewable).
 *   4. expired-renewable — not valid (or valid-but-inactive) with a renewal path: paid before + in grace
 *                          or lapsed-unpaid (renewal restores to active).
 *   5. pending-onboarding — the residual: never paid / mid-signup (no renewal path because never active).
 *
 * ── Story 10.10: moderation is the SECOND producer of `suspended-with-reason` ────────────────────
 * Until now that state was derived from `concealmentFlagged` ALONE — an orphan producer the story
 * file called out. Moderation now feeds it too, read from the `specialFlags` moderation entry
 * (`suspended_per_<code>` / `terminated_per_<code>`) that `@twt/validity-service` emits. The
 * presenter takes NO new input and still computes NO second validity answer: it reads the ONE
 * canonical payload, exactly as it does for every other signal.
 */
export function deriveHeadlineState(payload: MemberValidityPayloadDto): HeadlineState {
  const { isValid, isActive, lockInStatus, vyawasthaShulkStatus, medicalDisclosureFlags, specialFlags } =
    payload;

  // Moderation first — a terminated membership is the strongest standing the panel can report, and
  // no downstream branch (renewal path, lock-in window, grace) is meaningful once it applies.
  const moderation = parseModerationFlag(specialFlags);
  if (moderation?.status === 'terminated') return 'terminated-with-reason';

  const concealmentFlagged =
    medicalDisclosureFlags.pendingConcealmentFlag || specialFlags.includes(CONCEALMENT_REVIEW_FLAG);
  const standingWithheld = concealmentFlagged || moderation?.status === 'suspended';

  if (isValid && isActive) {
    // Active, but a surviving concealment-review flag or a moderation suspension withholds standing.
    // (`is_valid` already folds moderation in, so a suspended member cannot actually reach this
    // branch today — the check stays for the concealment producer and as defence in depth.)
    return standingWithheld ? 'suspended-with-reason' : 'active';
  }
  if (standingWithheld) return 'suspended-with-reason';

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
  //
  // KNOWN SIMPLIFICATION (Review Findings, 2026-07-04): matched by substring because
  // `applicableNiyamavaliClauses` carries no stable category/type field to match on exactly — only
  // `clauseId`/`clauseVersionId`/`reasonCode`/`outcome`. A future clause whose id happens to contain
  // "lock-in" would false-match; a clause-naming change could silently break this. Accepted as a v1
  // tradeoff rather than adding a producer-side payload field for this alone — revisit if either risk
  // materializes.
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
    // Rendered as an explicit "not yet available" affordance — same never-hide-a-gap discipline the D2
    // sentinel applies to the contribution/claim sections (a gap is not the same as "not applicable").
    return {
      id: 'retirement',
      titleKey: SECTION_TITLE_KEYS.retirement,
      status: 'unavailable',
      detailKeys: [DETAIL_KEYS.retirementUnavailable],
      data: {},
      visible: true,
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
  // Story 10.10 — the moderation flag is surfaced STRUCTURALLY here so a render layer never has to
  // print the raw `suspended_per_<code>` string. The member-facing PROSE lives on the headline
  // section (where it explains the headline the member actually reads); duplicating it here would
  // mean two copies of the same sentence drifting apart.
  const moderation = parseModerationFlag(flags);
  return {
    id: 'special-flags',
    titleKey: SECTION_TITLE_KEYS['special-flags'],
    status: hasConcealment || moderation !== null ? 'fail' : 'ok',
    detailKeys,
    data: {
      flags,
      concealmentReviewRequired: hasConcealment,
      moderationStatus: moderation?.status ?? null,
      // The LABEL key, never the raw code — the render layer resolves it (UX a11y `:1896`).
      moderationReasonLabelKey: moderation ? moderationReasonLabelKey(moderation.reasonCode) : null,
    },
    // Only render when there is a DETAIL LINE to show (review follow-up). Previously keyed on
    // `flags.length > 0`, which made a moderated member's panel sprout an empty red "Special flags"
    // box: moderation contributes structural `data` but no `detailKeys`, and the flag it adds is
    // already explained in full prose by `moderationNotice`. A titled, red, contentless section
    // reads as "something is wrong that we won't tell you about" — the opposite of the dignity
    // requirement. A moderation-only flag set therefore does NOT open this section.
    visible: detailKeys.length > 0 || hasConcealment,
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

/**
 * Every state from which the APPEAL CTA must be reachable (UX + a11y: "from every failure state").
 * `terminated-with-reason` belongs here for a reason that is easy to get wrong: FR-56 makes
 * `restore` a trustee-reachable action from `terminated`, so a terminated member has a genuine
 * remedy to ask for. Omitting it would leave the one member with the most at stake with no way to
 * ask anyone to look again.
 */
const FAILURE_STATES: ReadonlySet<HeadlineState> = new Set<HeadlineState>([
  'suspended-with-reason',
  'terminated-with-reason',
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
  const moderation = parseModerationFlag(payload.specialFlags);

  // Story 10.10 (AC9) — the member is owed FULL PROSE explaining the standing, not an error code
  // (`ux-design-specification.md:1891`), naming the reason as a resolved LABEL.
  //
  // ⚠ This is a TOP-LEVEL view-model field, NOT a `detailKey` on the headline section (review
  // follow-up). Both render layers drop the headline section wholesale and render only
  // `headlineKey`, so as a detail key the explanation was unreachable and the member was told
  // "Under review" with no reason at all. See `ModerationNotice` in view-model.ts.
  const moderationNotice: ModerationNotice | null =
    moderation === null
      ? null
      : {
          status: moderation.status,
          detailKey:
            moderation.status === 'terminated'
              ? DETAIL_KEYS.moderationTerminated
              : DETAIL_KEYS.moderationSuspended,
          reasonLabelKey: moderationReasonLabelKey(moderation.reasonCode),
        };

  const headlineSection: PanelSection = {
    id: 'headline',
    titleKey: SECTION_TITLE_KEYS.headline,
    status:
      headlineState === 'active'
        ? 'ok'
        : headlineState === 'pending-onboarding'
          ? 'info'
          : 'fail',
    // The moderation prose is deliberately NOT duplicated here: `moderationNotice` is the one
    // carrier, so the two can never drift into different sentences.
    detailKeys: [HEADLINE_KEYS[headlineState]],
    data: {
      headlineState,
      isValid: payload.isValid,
      isActive: payload.isActive,
      moderationStatus: moderation?.status ?? null,
      moderationReasonLabelKey: moderation ? moderationReasonLabelKey(moderation.reasonCode) : null,
    },
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
    moderationNotice,
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
