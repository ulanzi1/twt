// The `<MemberStatusPanel>` i18n KEY catalogue — Story 4.7 (Task 3; D4-A).
//
// The presenter emits KEYS (never resolved copy — it does no side-effecting i18n lookup, D4 refinement
// iv). Each key here has a bilingual (en + Hindi-first) entry in `@twt/i18n`
// (packages/i18n/locales/{en,hi}/member-status.json); the render layer resolves them. Kept in sync BY
// VALUE with those JSON files. Grouped so both variants (admin audit-trace + member "what applies to
// you") draw from the SAME key set — divergence is in RESOLUTION (locale/copy), not in the keys.

export const HEADLINE_KEYS = {
  active: 'memberStatus.headline.active',
  'pending-onboarding': 'memberStatus.headline.pendingOnboarding',
  'suspended-with-reason': 'memberStatus.headline.suspendedWithReason',
  // Story 10.10 — the NEW terminated state (a deliberate extension of the UX spec's five; see
  // view-model.ts's `HeadlineState` doc for why it is not collapsed into suspended-with-reason).
  'terminated-with-reason': 'memberStatus.headline.terminatedWithReason',
  'expired-renewable': 'memberStatus.headline.expiredRenewable',
  'expired-not-renewable': 'memberStatus.headline.expiredNotRenewable',
} as const;

export const SECTION_TITLE_KEYS = {
  headline: 'memberStatus.section.headline',
  'vyawastha-shulk': 'memberStatus.section.vyawasthaShulk',
  'lock-in': 'memberStatus.section.lockIn',
  contribution: 'memberStatus.section.contribution',
  medical: 'memberStatus.section.medical',
  retirement: 'memberStatus.section.retirement',
  'special-flags': 'memberStatus.section.specialFlags',
} as const;

export const DETAIL_KEYS = {
  // Vyawastha Shulk
  vsPaidThrough: 'memberStatus.detail.vsPaidThrough',
  vsNeverPaid: 'memberStatus.detail.vsNeverPaid',
  vsInGrace: 'memberStatus.detail.vsInGrace',
  vsDaysUntilLapse: 'memberStatus.detail.vsDaysUntilLapse',
  // Lock-in
  lockInActive: 'memberStatus.detail.lockInActive',
  lockInUnlocked: 'memberStatus.detail.lockInUnlocked',
  lockInNeverEntered: 'memberStatus.detail.lockInNeverEntered',
  // Contribution (D2 producer_unavailable)
  contributionUnavailable: 'memberStatus.detail.contributionUnavailable',
  // Medical
  medicalHasDisclosure: 'memberStatus.detail.medicalHasDisclosure',
  medicalNoDisclosure: 'memberStatus.detail.medicalNoDisclosure',
  medicalConcealmentFlag: 'memberStatus.detail.medicalConcealmentFlag',
  // Retirement
  retirementActive: 'memberStatus.detail.retirementActive',
  retirementEarnedNotRetired: 'memberStatus.detail.retirementEarnedNotRetired',
  retirementUnavailable: 'memberStatus.detail.retirementUnavailable',
  // Special flags
  concealmentReviewRequired: 'memberStatus.detail.concealmentReviewRequired',
  // Moderation (Story 10.10) — FULL PROSE, not an error code (`ux-design-specification.md:1891`).
  // Both take a `{reason}` param, resolved from `moderationReasonLabelKey` — the member is shown a
  // human LABEL ("forged or falsified documents (Rule 14)"), NEVER the raw registry code.
  moderationSuspended: 'memberStatus.detail.moderationSuspended',
  moderationTerminated: 'memberStatus.detail.moderationTerminated',
} as const;

/** The prose-explanation key for a clause: `memberStatus.rule.<reasonCode>` (dot→underscore-safe). */
export function ruleExplanationKey(reasonCode: string): string {
  return `memberStatus.rule.${reasonCode}`;
}

/** The wire value of the State-Trustee-only concealment-review special flag (engine CONCEALMENT_REVIEW_FLAG). */
export const CONCEALMENT_REVIEW_FLAG = 'concealment_review_required';

// ── Story 10.10 — the moderation special-flag protocol (`prd.md:411` form) ──────────────────────
//
// `@twt/validity-service` emits at most ONE moderation flag into `specialFlags`:
// `suspended_per_<reason_code>` or `terminated_per_<reason_code>`. Unlike the concealment flag it is
// MEMBER-VISIBLE (deliberately not in `STATE_TRUSTEE_ONLY_FLAGS`) because the member must be told
// why. The presenter parses it here rather than taking a second moderation input — the canonical
// payload stays the ONE source of eligibility, exactly as it is for every other signal.

/** Prefix of the moderation-suspension special flag. */
export const MODERATION_SUSPENDED_FLAG_PREFIX = 'suspended_per_';
/** Prefix of the moderation-termination special flag. */
export const MODERATION_TERMINATED_FLAG_PREFIX = 'terminated_per_';

/** The i18n key for a moderation reason-code LABEL (never render the raw code — a11y `:1896`). */
export function moderationReasonLabelKey(reasonCode: string): string {
  return `memberStatus.moderationReason.${reasonCode}`;
}

/** The moderation standing a `specialFlags` array encodes, with its reason code. */
export interface ModerationFlag {
  readonly status: 'suspended' | 'terminated';
  readonly reasonCode: string;
}

/**
 * Parse the moderation special flag out of `specialFlags`, or `null` when the member is not
 * moderated. `terminated` WINS if both are somehow present — the more severe standing must never be
 * under-reported to the member (the payload emits at most one, so this is a defensive tiebreak, not
 * an expected path).
 */
export function parseModerationFlag(specialFlags: readonly string[]): ModerationFlag | null {
  const terminated = specialFlags.find((f) => f.startsWith(MODERATION_TERMINATED_FLAG_PREFIX));
  if (terminated !== undefined) {
    return {
      status: 'terminated',
      reasonCode: terminated.slice(MODERATION_TERMINATED_FLAG_PREFIX.length),
    };
  }
  const suspended = specialFlags.find((f) => f.startsWith(MODERATION_SUSPENDED_FLAG_PREFIX));
  if (suspended !== undefined) {
    return {
      status: 'suspended',
      reasonCode: suspended.slice(MODERATION_SUSPENDED_FLAG_PREFIX.length),
    };
  }
  return null;
}
