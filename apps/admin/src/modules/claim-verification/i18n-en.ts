// Module-local English copy for the verifier console (Story 6.10) — the ground-inspection / helpline
// precedent: console chrome copy lives HERE, NOT in @twt/i18n runtime keys, so the i18n-parity gate
// stays untouched (this admin surface is English-facing; there is no member-app locale parity to hold).

export const verifierConsoleEn = {
  shell: {
    title: 'Verifier console',
    claimLabel: 'Claim',
    memberLabel: 'Deceased member',
    stateLabel: 'Claim state',
    readOnlyBadge: 'Read-only',
    decisionSlotEmpty: 'Decision controls are not available on this screen.',
    skipToDecision: 'Skip to decision',
  },
  scope: {
    activeLabel: 'Active Pariwar',
    switchLabel: 'Switch Pariwar',
    switchHelp: 'Switching clears the current claim and opens the selected Pariwar.',
  },
  sections: {
    identity: 'Deceased member & validity',
    concealment: 'Concealment review',
    documents: 'Document parity (OCR)',
    peerMesh: 'Peer-mesh responses',
    groundInspection: 'Ground inspection',
    priorComments: 'Prior verifier comments',
    precedents: 'Recent in-scope precedents',
    shepherd: 'Assigned shepherd (family contact)',
  },
  states: {
    empty: 'No records yet.',
    unavailable: 'Temporarily unavailable — this signal could not be loaded. Try again shortly.',
    notAvailableYet: 'Not available yet — this signal is provided by a later release.',
    loading: 'Loading signals…',
    forbidden: "You don't have access to this claim from your current scope — try switching Pariwar, or contact your administrator.",
  },
  concealment: {
    flagged: 'Flagged for concealment review',
    notFlagged: 'No concealment flag',
    notEvaluated: 'Concealment review not yet evaluated',
    indicatorOnly: 'Presence indicator only — full detail is reviewed by the State Trustee.',
    clauseVersionLabel: 'Rule version (R14)',
    // The PROMINENT banner shown above all signals when the claim is flagged (AC1). It must NEVER read as
    // a denial — the claim routes to the State Trustee for an explicit decision; it is never auto-denied.
    bannerTitle: 'Concealment review required',
    bannerBody:
      'This claim is flagged for concealment review. It is NOT auto-denied — it routes to the State Trustee for an explicit uphold/override decision.',
  },
  // The verifier concealment-linkage assessment control (Story 6.15, AC7) — records the human judgement
  // (linked | not_linked | unable_to_determine). A review annotation; it flags/routes, it never decides.
  concealmentAssessment: {
    heading: 'Concealment linkage assessment',
    help: 'Record whether an undeclared IMA-listed condition appears linked to the death. This is a review annotation — it never decides the claim (the State Trustee decides).',
    kindLabel: 'Assessment',
    kindPlaceholder: 'Select an assessment…',
    kinds: {
      linked: 'Linked — undeclared condition appears linked to the death',
      not_linked: 'Not linked — no linkage found',
      unable_to_determine: 'Unable to determine',
    },
    noteLabel: 'Note (optional)',
    notePlaceholder: 'Optional context for this assessment (encrypted).',
    noteEncryptedNote: 'Stored encrypted; never shown on audit lines.',
    submit: 'Record assessment',
    processing: 'Recording…',
    kindRequiredError: 'Select an assessment before recording.',
  },
  validity: {
    validityLabel: 'Validity',
    valid: 'Valid',
    invalid: 'Not valid',
    standingLabel: 'Standing',
    active: 'Active',
    inactive: 'Not active',
    specialFlags: 'Special flags',
  },
  identity: {
    dateOfBirthLabel: 'Date of birth',
  },
  shepherd: {
    nameLabel: 'Shepherd',
    roleLabel: 'Role',
    note: 'The family’s named point of contact. Read-only — being shepherd grants no adjudication power.',
  },
  peerMesh: {
    responders: 'Distinct responders',
    pinged: 'Pinged peers',
    noResponseNote: 'A non-response is an absence — it is never counted as a denial.',
    confirmed: 'Confirmed',
    denied: 'Denied',
    unknown: 'Unknown',
    annotationsNotAvailableYet: 'Verifier annotations — not available yet; this signal is provided by a later release.',
  },
  // Story 6.11 — the decision strip (approve/deny/escalate + reason-code + rationale + audit trail).
  decision: {
    heading: 'Verification decision',
    approve: 'Approve',
    deny: 'Deny',
    escalate: 'Escalate to State Trustee',
    revise: 'Revise decision',
    approveShortcut: '1',
    denyShortcut: '2',
    escalateShortcut: '3',
    reasonLabel: 'Reason code',
    reasonPlaceholder: 'Select a reason…',
    rationaleLabel: 'Rationale (brief)',
    rationalePlaceholder: 'Add a brief rationale…',
    rationaleEncryptedNote: 'This note is encrypted and access-controlled — visible only to authorized reviewers.',
    rationaleRequiredNote: 'A rationale is required for a Deny and for the "Other" reason.',
    rationaleMaxNote: 'Up to 500 characters.',
    otherOptionLabel: 'Other (specify)',
    submit: 'Submit decision',
    processing: 'Submitting…',
    confirmTitle: 'Confirm this decision',
    confirmBody: 'This action is recorded and attributed to you. It cannot be undone here.',
    confirmYes: 'Confirm',
    confirmCancel: 'Cancel',
    historicalNote: 'This claim is resolved — the decision is shown for reference and cannot be changed here.',
    reasonRequiredError: 'Select a reason code before submitting.',
    rationaleRequiredError: 'A rationale is required for this decision.',
    submitError: 'The decision could not be submitted. Please try again.',
    stepUpRequired: 'A fresh step-up verification is required to revise a decision.',
    displayNameMissing: 'Your account has no display name configured — contact an administrator to enable adjudication.',
    decisionConflict: 'This claim was already updated — reload to see the latest state before trying again.',
  },
  // ── Story 6.18 — the nominee NAME CHECK (`2026-09-19-226` cl.3/cl.5) ──────────────────────
  // ⛔ NO match hint, NO score, NO diff wording anywhere in this block: the console SHOWS two lists
  // and RECORDS a human judgement. The only "highlight" is `approvedWithDifference`, which reports
  // what the District Admin themselves recorded (AC8).
  nameCheck: {
    heading: 'Nominee name check',
    intro:
      "Read the name on each bank account beside the nominee(s) the member declared, then record whether they match. The system does not compare them.",
    loading: 'Loading the names…',
    loadError: 'The names could not be loaded.',
    // ⭐ The on-demand disclosure, shared by the Pariwar Admin's card and the R9 panel. These were
    // three hard-coded English literals inside `R9CasePanel`, bypassing this table entirely.
    disclosureLabel: 'Nominee name check',
    disclosureToggle: 'Check nominee names',
    accountsHeading: 'Name on the bank account',
    nomineesHeading: 'Nominee the member declared',
    accountLabel: 'Account',
    nomineeLabel: 'Nominee',
    filerNote: 'Note from the filer',
    noAccounts: 'No bank accounts have been given for this claim yet.',
    // ⭐ "needed", not "missing"/"rejected" — cl.7 makes the claim WAIT, never be refused (AC6).
    bankDetailsMissing:
      'This claim needs both bank accounts before it can be checked or approved. It waits until they are added — it is not refused.',
    noNominees: 'The member declared no nominees.',
    unreadable: 'Could not be read',
    anonymized: 'Removed at this person’s request',
    declaredAt: 'Nominees declared',
    filedAt: 'Claim filed',
    recordedBy: 'Checked by',
    notYetChecked: 'No name check has been recorded for this claim yet.',
    // ⭐ A DIFFERENT SENTENCE FROM `notYetChecked`, and the difference is the point (code review
    // 2026-09-20). A stale check is ⛔ not an absent one: a colleague did the work and a correction
    // invalidated it. Telling them "nobody has checked" erases that and reads as an accusation.
    checkStale:
      'A name check was recorded, but the bank details or the declared nominees have changed since. It no longer applies — please read the names again and record a fresh check.',
    // ⚠ The blocked reason when the District Admin's OWN recorded verdict is what blocks the
    // approval. The generic `approveBlocked` told them to "record the name check" for a claim on
    // which they had already recorded one — which reads as the console not having noticed.
    approveBlockedSentBack:
      'You recorded that a name does not match, so this claim cannot be approved. Have the bank details corrected, then record the name check again. The claim stays open and is not denied.',
    recordedVerdicts: 'What was recorded',
    // ⚠ The name-check errors have their OWN table: routing them through the DECISION table meant
    // every one of them read "The decision could not be submitted. Please try again." — wrong about
    // what happened, and wrong about what to do next.
    errorStale:
      'The bank details or the declared nominees changed while you were looking. Read the names again — they have been reloaded — and record a fresh check.',
    errorInvalid: 'That check could not be recorded. Choose a verdict for each account, and a reason for any clerical difference.',
    errorForbidden: 'You do not have permission to record the name check for this claim.',
    errorGeneric: 'The name check could not be completed. Please try again.',
    statusUnavailable:
      'The name-check status could not be read just now — this is not a statement about the claim. Reload before approving.',
    checkNotRecordableHere:
      'A name check cannot be recorded while the claim is in this state.',
    approvedWithDifference: 'Approved with a name difference',
    verdictLabel: 'Verdict for account',
    verdictPlaceholder: 'Select…',
    reasonLabel: 'Reason for account',
    reasonPlaceholder: 'Select a reason…',
    verdictRequired: 'Record a verdict for each account before submitting.',
    reasonRequired: 'Select the reason for the clerical difference before submitting.',
    sentBackHint:
      'This will send the claim back to be corrected. The claim stays open and is not denied.',
    submit: 'Record the name check',
    returnedHeading: 'Returned to you for correction',
    returnedBy: 'Returned by',
    returnNote: 'Their note',
    // ⭐ "Re-submitted" is DERIVED — it becomes true once the details were corrected and you checked
    // again. There is no button: checking again IS the re-submission.
    resubmitted: 'Corrected and re-checked — this is back with the Pariwar Admin.',
    awaitingCorrection:
      'Contact the claimant, have the bank details corrected, then record the name check again. The claim stays open.',
    approveBlocked:
      'Record the nominee name check before approving. If the bank details were corrected, the earlier check no longer applies and the names need checking again.',
    verdicts: {
      matches: 'Matches the declared nominee',
      clerical_difference: 'Clerical difference (accept with a reason)',
      does_not_match: 'Does not match — send back for correction',
    },
    reasons: {
      initial: 'An initial',
      married_name: 'A married name',
      bank_shortened_name: "The bank's shortened name",
    },
  },
  // ── Story 6.18 (AC11) — the District Admin's correction queue ───────────────────────
  // ⛔ Every string here says "returned"/"correct", ⛔ never "rejected", "denied" or "failed".
  correctionQueue: {
    heading: 'Claims waiting for a correction',
    intro:
      'Claims the Pariwar Admin sent back to you, and claims where you recorded that a name does not match. Contact the claimant, have the bank details corrected, then open the claim and record the name check again. None of these claims has been refused.',
    loading: 'Loading…',
    loadError: 'The list could not be loaded.',
    empty: 'Nothing is waiting for a correction.',
    badgeReturned: 'returned by the Pariwar Admin',
    badgeSentBackByCheck: 'you recorded: does not match',
    badgeAccountsMissing: 'bank details not yet given',
    returnedBy: 'Returned by',
    note: 'Their note',
    open: 'Open the claim',
  },
  // Story 6.11 — reason-code display labels (bounded domain enum).
  // ⚠ MOVED HERE 2026-09-22 (code review): this line sat above the Story 6.18 `nameCheck` block,
  // so it described the wrong object and `reasonCodes` had ⛔ no comment of its own.
  reasonCodes: {
    r5_d_natural_death: 'R5(d) — natural death confirmed',
    r8_90pct_met: 'R8 — 90% standing threshold met',
    concealment_flag_override: 'Concealment flag reviewed — overridden',
    concealment_flag_uphold: 'Concealment flag reviewed — upheld',
    r9_routed_to_voting: 'R9 — routed to State-Trustee voting',
    other: 'Other (specify)',
  },
  // Story 6.11 — the audit-trail entry (semantic verb, attribution, reason, timestamp).
  audit: {
    heading: 'Decision trail',
    approvedBy: 'Approved by',
    deniedBy: 'Denied by',
    escalatedBy: 'Escalated by',
    revisedBy: 'Revised by',
    supersededNote: 'Superseded by a later revision',
    revisionOfNote: 'Revision of an earlier decision',
    empty: 'No decisions recorded yet.',
    unattributed: 'Unattributed',
  },
} as const;

export type VerifierConsoleCopy = typeof verifierConsoleEn;
