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
  // Story 10.24 — the producer now exists, so this copy no longer promises a future epic. It is the
  // honest PER-MEMBER gap: this member's history could not be derived (no projected history, a
  // historical instant before the projection's coverage, or an incomplete backfill).
  'memberStatus.detail.contributionUnavailable':
    'Contribution history could not be derived for this member.',
  'memberStatus.detail.contributionOnRecord': 'Contribution history is on record.',
  'memberStatus.detail.contributionInLapse':
    'Contribution history shows a missed cycle this year.',
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
// The reason-code `appliesTo` + `label` metadata used to be hand-duplicated by value here (the
// admin console is a browser bundle and cannot import @twt/domain —
// [[project_contracts_domain_bundle_boundary]]). Review follow-up: `GET …/moderation/reason-codes`
// now serves the SAME frozen registry the server's 422 enforces, so `reasonCodesFor` /
// `reasonCodeLabel` (in `ModerationStrip.tsx`) take it as a parameter instead. Nothing here
// duplicates the registry any more.

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
  // \u2696 Story 10.20 (AC10) \u2014 Q6-ratified GUIDANCE. \u26d4 Rendered as text only: never a default,
  // never a pre-selection, never a severity score. FR-57's prohibition is a prohibition ON THE
  // DECISION MOVING, and a pre-selected sanction moves it.
  guidancePrefix: 'Ordinarily results in',
  // \u26a0 Story 10.20 (AC12) \u2014 renamed from "Rationale" throughout. The record now separates what
  // happened, why this sanction, and how the case can be reconstructed; a UI still saying
  // "rationale" would describe a field that no longer exists.
  rationaleLabel: 'Decision Note',
  rationalePlaceholder: 'Record the decision: what happened, and what was decided.',
  rationaleRequiredError: 'A Decision Note is required for every moderation action.',
  rationaleEncryptedNote:
    'Stored encrypted. Never shown to the member, never written to the event log or the audit trail.',
  // \u2014\u2014 Story 10.20 (AC6) \u2014 the two-part escalation justification, terminate ONLY \u2014\u2014
  // \u26d4 TWO controls, never one, and no copy-across affordance: `epics.md:3851` requires the parts be
  // separately answerable and neither pre-filled from the other.
  escalationHeading: 'Why termination rather than suspension',
  escalationIntro:
    'Termination is an exceptional governance act, not a stronger suspension (Niyamavali \u00a78.6). Both questions below must be answered separately.',
  escalationInadequacyLabel: '(a) Why suspension is inadequate',
  escalationInadequacyPlaceholder:
    'What would suspension fail to protect, what risk would persist through it, or why is the restoration path it preserves unavailable or futile?',
  escalationProportionalityLabel: '(b) Why termination is proportionate',
  escalationProportionalityPlaceholder: 'Why does this sanction fit the conduct?',
  escalationRequiredError: 'Both parts of the escalation justification are required for a termination.',
  escalationTooShortError:
    'Each part needs at least 40 characters \u2014 enough to state a reason, not a placeholder.',
  escalationRestatementError:
    'Part (a) must explain why SUSPENSION is inadequate. Restating why termination is proportionate does not answer it.',
  // \u2014\u2014 Story 10.20 (AC4) \u2014 evidence REFERENCES, never prose \u2014\u2014
  evidenceHeading: 'Evidence references',
  evidenceIntro:
    'References only \u2014 a complaint number, an investigation number, a ticket, a document id, an order number. Not a description.',
  evidenceKindLabel: 'Kind',
  evidenceRefLabel: 'Reference',
  evidenceRefPlaceholder: 'e.g. CMP-2026-0001',
  evidenceAdd: 'Add a reference',
  evidenceRemove: 'Remove',
  evidenceInvalidError:
    'A reference must be an identifier \u2014 letters, digits and . _ / - with no spaces.',
  evidenceDuplicateError:
    'The same reference (kind + value) is listed more than once \u2014 remove the duplicate.',
  evidenceKinds: {
    complaint: 'Complaint',
    investigation: 'Investigation',
    'helpdesk-ticket': 'Helpdesk ticket',
    document: 'Document',
    'external-order': 'External order',
  } as Record<string, string>,
  // \u2014\u2014 Story 10.20 (AC8/AC12) \u2014 the RULED console shape (Q4.2) \u2014\u2014
  // \u26d4 The Terminate control stays VISIBLE AND ENABLED during the dwell \u2014 it is NOT disabled until
  // day 7. Selecting it requires an EXPLICIT re-confirmation naming the open dwell and the immediate
  // route. \u26d4 The dialog obtains INFORMED INTENT; it does not grant authority \u2014 the server decides.
  dwellOpenHeading: 'The seven-day dwell is still open',
  dwellOpenBody:
    'The ordinary termination path opens on {date}. Terminating now means invoking the immediate-termination exception, which requires you to record why it applies.',
  dwellServerAuthoritative:
    'This confirmation records your intent. The server decides whether immediate termination is permitted.',
  immediateReasonLabel: 'Why terminate now, ahead of the dwell',
  immediateReasonPlaceholder:
    'What makes waiting until the ordinary path opens unsafe or futile in this case?',
  immediateReasonRequiredError:
    'Record why the immediate-termination exception applies before confirming.',
  submit: 'Review and confirm',
  processing: 'Working\u2026',
  confirmTitle: 'Confirm this moderation action',
  confirmCancel: 'Cancel',
  confirmYes: 'Confirm',
  // EXPLICIT consequence statements (UX Pattern 2) — what actually happens, per action.
  consequence: {
    suspend:
      'The member stops being covered for support immediately and is dropped from pool assignment. All their sessions are signed out. They are notified, can still sign in, and can ask for a review.',
    // \u26a0 "in this Pariwar" is load-bearing, not hedging (review follow-up). The FR-6 rejoin guard
    // (`signup.handlers.ts`) only consults the terminating Pariwar's own row \u2014 a member terminated
    // here can sign up in a DIFFERENT Pariwar the same day. The previous wording promised an
    // identity-wide block, in the one statement whose entire job is making a destructive action
    // informed. Whether the lock SHOULD be identity-wide is an open FR-6 question for PM; until it
    // is answered the copy states what the system actually does.
    terminate:
      'The member\u2019s membership in this Pariwar ends. They stop being covered for support, all their sessions are signed out, and they cannot rejoin this Pariwar under the same identity for 12 months. They are notified and can ask for a review.',
    restore:
      'The member\u2019s standing returns to normal. They are covered for support again, any rejoin block is lifted, and they are notified.',
  } as Record<string, string>,
  historyHeading: 'Moderation history',
  historyEmpty: 'No moderation actions on record.',
  historyTruncated:
    'Showing the most recent actions only — this member has more moderation history than is shown here.',
  rejoinPermitted: 'rejoin permitted',
  // \u2014\u2014 Story 10.20 (AC9) \u2014 the grounds behind an action \u2014\u2014
  groundsHeading: 'Grounds',
  groundPrimary: 'primary',
  groundSuperseded: 'superseded',
  groundSupersedes: 'supersedes an earlier ground',
  groundHasNote: 'has a note',
  evidenceLabel: 'Evidence',
  // ⚠ Key names unchanged (they're internal identifiers, `onRevealRationale` etc. in
  // ModerationSection.tsx) — only the user-facing COPY is renamed (AC12; review follow-up: these
  // two were missed in the original rename pass while `rationaleLabel` and its siblings were not).
  revealRationale: 'Show Decision Note',
  rationaleUnreadable:
    'This Decision Note cannot be read. The stored record is unreadable — it was recorded, but it can no longer be decrypted.',
  reasonCodesUnavailable:
    'Reason codes could not be loaded, so no moderation action can be taken right now.',
} as const;

/**
 * Resolve a presenter i18n key to English. Rule-explanation keys (`memberStatus.rule.<reasonCode>`)
 * are dynamic — the full prose catalogue is Epic-wide, so absent an entry we surface a readable form of
 * the reason code rather than the raw key (never an error code verbatim — UX a11y).
 */
export function resolveEn(key: string, params?: Record<string, string>): string {
  const hit = EN[key];
  if (hit !== undefined) return interpolate(hit, params);
  if (key.startsWith('memberStatus.rule.')) {
    const reason = key.slice('memberStatus.rule.'.length);
    // e.g. `rule.retirement_coverage_computed` → "retirement coverage computed"
    return reason.replace(/^rule\./, '').replace(/_/g, ' ');
  }
  return key;
}

/**
 * Fill `{token}` placeholders. Needed since Story 10.10's moderation prose is parameterized on
 * `{reason}` (the reason-code LABEL, never the raw code).
 *
 * Unlike `packages/i18n`'s loud-by-default `t()`, a missing param leaves the token in place rather
 * than throwing: this is the ADMIN console, and a trustee reading a slightly-degraded sentence is
 * strictly better than a blank panel where a member's standing should be.
 */
function interpolate(template: string, params?: Record<string, string>): string {
  if (params === undefined) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => params[name] ?? match);
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
