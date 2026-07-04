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
} as const;

/** The prose-explanation key for a clause: `memberStatus.rule.<reasonCode>` (dot→underscore-safe). */
export function ruleExplanationKey(reasonCode: string): string {
  return `memberStatus.rule.${reasonCode}`;
}

/** The wire value of the State-Trustee-only concealment-review special flag (engine CONCEALMENT_REVIEW_FLAG). */
export const CONCEALMENT_REVIEW_FLAG = 'concealment_review_required';
