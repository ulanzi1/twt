// English resolver for the shared `<MemberStatusPanel>` presenter i18n KEYS (Story 4.7, admin variant).
//
// The @twt/ui presenter is framework- AND locale-agnostic: it emits KEYS, and each render layer resolves
// them (D4 refinement iv). The admin console is English-facing, so this is the English resolution map
// (the apps/mobile member variant resolves the SAME keys Hindi-first via @twt/i18n). Kept in sync BY
// VALUE with `@twt/ui`'s `HEADLINE_KEYS` / `SECTION_TITLE_KEYS` / `DETAIL_KEYS`.

const EN: Record<string, string> = {
  // Headline states
  'memberStatus.headline.active': 'Active',
  'memberStatus.headline.pendingOnboarding': 'Pending onboarding',
  'memberStatus.headline.suspendedWithReason': 'Suspended — review required',
  'memberStatus.headline.expiredRenewable': 'Expired — renewable',
  'memberStatus.headline.expiredNotRenewable': 'Expired — not renewable',
  // Section titles
  'memberStatus.section.headline': 'Membership status',
  'memberStatus.section.vyawasthaShulk': 'Vyawastha Shulk',
  'memberStatus.section.lockIn': 'Lock-in',
  'memberStatus.section.contribution': 'Contribution discipline',
  'memberStatus.section.medical': 'Medical disclosure',
  'memberStatus.section.retirement': 'Retirement coverage',
  'memberStatus.section.specialFlags': 'Special flags',
  // Detail lines
  'memberStatus.detail.vsPaidThrough': 'Paid through the current cycle.',
  'memberStatus.detail.vsNeverPaid': 'No Vyawastha Shulk payment on record.',
  'memberStatus.detail.vsInGrace': 'In the renewal grace window.',
  'memberStatus.detail.vsDaysUntilLapse': 'Days remaining until lapse.',
  'memberStatus.detail.lockInActive': 'Lock-in period is active.',
  'memberStatus.detail.lockInUnlocked': 'Lock-in period has elapsed.',
  'memberStatus.detail.lockInNeverEntered': 'Never entered lock-in.',
  'memberStatus.detail.contributionUnavailable':
    'Contribution history is not yet available (producer lands in Epic 8/9).',
  'memberStatus.detail.medicalHasDisclosure': 'Has a medical disclosure on record.',
  'memberStatus.detail.medicalNoDisclosure': 'No medical disclosure on record.',
  'memberStatus.detail.medicalConcealmentFlag': 'Concealment review flag is set.',
  'memberStatus.detail.retirementActive': 'Retired — coverage extension is active.',
  'memberStatus.detail.retirementEarnedNotRetired': 'Coverage years earned (not yet retired).',
  'memberStatus.detail.retirementUnavailable': 'Retirement coverage rule not provisioned.',
  'memberStatus.detail.concealmentReviewRequired':
    'Concealment review required — route to the verifier console.',
};

/**
 * Resolve a presenter i18n key to English. Rule-explanation keys (`memberStatus.rule.<reasonCode>`)
 * are dynamic — the full prose catalogue is Epic-wide, so absent an entry we surface a readable form of
 * the reason code rather than the raw key (never an error code verbatim — UX a11y).
 */
export function resolveEn(key: string): string {
  const hit = EN[key];
  if (hit !== undefined) return hit;
  if (key.startsWith('memberStatus.rule.')) {
    const reason = key.slice('memberStatus.rule.'.length);
    // e.g. `rule.retirement_coverage_computed` → "retirement coverage computed"
    return reason.replace(/^rule\./, '').replace(/_/g, ' ');
  }
  return key;
}

/** Map a presenter section status to the admin status-token colour family. */
export function statusClass(status: string): string {
  switch (status) {
    case 'ok':
      return 'bg-status-ok-bg text-status-ok-fg border-status-ok-border';
    case 'warn':
      return 'bg-status-warn-bg text-status-warn-fg border-status-warn-fg';
    case 'fail':
      return 'bg-status-fail-bg text-status-fail-fg border-status-fail-border';
    default:
      // info / unavailable — neutral, de-emphasised.
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}
