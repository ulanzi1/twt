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
  // Story 10.10 — the NEW terminated headline state.
  'memberStatus.headline.terminatedWithReason': 'Membership ended',
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
  // Story 10.10 — the moderation prose. `{reason}` is resolved by the render layer from the
  // reason-code LABEL key; the raw registry code is never shown.
  'memberStatus.detail.moderationSuspended':
    'Membership is under moderation review. Not covered for support while the review is open.',
  'memberStatus.detail.moderationTerminated':
    'Membership was ended by a moderation decision. Not covered for support.',
};

// ── Story 10.10 — the moderation surface (AC9) ────────────────────────────────────────────────
//
// The reason-code `appliesTo` map, DUPLICATED BY VALUE from the frozen @twt/domain registry. The
// admin console is a browser bundle and cannot import @twt/domain (pg/drizzle/kms —
// [[project_contracts_domain_bundle_boundary]]), and @twt/contracts deliberately ships the CODES as
// a flat tuple without the metadata (the `appliesTo` narrowing is a SERVER rule enforced with a
// typed 422). This map exists purely so the dropdown can filter; the server re-checks every time.
// A drift here can only ever offer a code the server then rejects — never the reverse.

/** Which actions each reason code may justify (mirrors the domain registry's `appliesTo`). */
export const REASON_CODE_APPLIES_TO: Record<string, readonly ('suspend' | 'terminate' | 'restore')[]> = {
  'r7-contribution-discipline': ['suspend', 'terminate'],
  'r14-forgery': ['suspend', 'terminate'],
  'r10a-parallel-org-office': ['suspend', 'terminate'],
  'concealment-confirmed': ['suspend', 'terminate'],
  'helpdesk-escalated-abuse': ['suspend', 'terminate'],
  'regulator-action': ['suspend', 'terminate'],
  'voluntary-pending-review': ['suspend', 'terminate'],
  'rule-clearance': ['restore'],
  'trustee-discretion': ['restore'],
  'moderation-error': ['restore'],
};

/** English labels for the moderation reason codes (never render the raw code). */
const REASON_CODE_LABELS: Record<string, string> = {
  'r7-contribution-discipline': 'Contribution discipline (R7)',
  'r14-forgery': 'Forgery or falsified documents (R14)',
  'r10a-parallel-org-office': 'Office held in a parallel organisation (R10(A))',
  'concealment-confirmed': 'Concealment confirmed by State Trustee (FR-11)',
  'helpdesk-escalated-abuse': 'Abuse escalated from the helpdesk',
  'regulator-action': 'Regulatory or statutory action',
  'voluntary-pending-review': 'Voluntary pause pending review',
  'rule-clearance': 'Rule cleared — three consecutive contributions (R7(A))',
  'trustee-discretion': 'Trustee discretion (R5(D)/R10(D))',
  'moderation-error': 'Moderation recorded in error',
};

/** Resolve a reason code to its English label; falls back to a readable form, never a raw slug. */
export function reasonCodeLabel(code: string): string {
  return REASON_CODE_LABELS[code] ?? code.replace(/-/g, ' ');
}

/** Copy for the moderation strip + confirmation modal. */
export const moderationEn = {
  heading: 'Moderation',
  suspend: 'Suspend',
  terminate: 'Terminate',
  restore: 'Restore',
  illegalHint:
    'Not available from the member\u2019s current standing. Termination requires an active suspension first.',
  status: {
    none: 'Not moderated',
    suspended: 'Suspended',
    terminated: 'Terminated',
  } as Record<string, string>,
  reasonLabel: 'Reason code',
  reasonPlaceholder: 'Select a reason\u2026',
  reasonRequiredError: 'Select a reason code.',
  rationaleLabel: 'Rationale',
  rationalePlaceholder: 'Explain the decision in your own words.',
  rationaleRequiredError: 'A rationale is required for every moderation action.',
  rationaleEncryptedNote:
    'Stored encrypted. Never shown to the member, never written to the event log or the audit trail.',
  submit: 'Review and confirm',
  processing: 'Working\u2026',
  confirmTitle: 'Confirm this moderation action',
  confirmCancel: 'Cancel',
  confirmYes: 'Confirm',
  // EXPLICIT consequence statements (UX Pattern 2) — what actually happens, per action.
  consequence: {
    suspend:
      'The member stops being covered for support immediately and is dropped from pool assignment. All their sessions are signed out. They are notified, can still sign in, and can ask for a review.',
    terminate:
      'The member\u2019s membership ends. They stop being covered for support, all their sessions are signed out, and they cannot rejoin under the same identity for 12 months. They are notified and can ask for a review.',
    restore:
      'The member\u2019s standing returns to normal. They are covered for support again, any rejoin block is lifted, and they are notified.',
  } as Record<string, string>,
  historyHeading: 'Moderation history',
  historyEmpty: 'No moderation actions on record.',
  rejoinPermitted: 'rejoin permitted',
} as const;

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
