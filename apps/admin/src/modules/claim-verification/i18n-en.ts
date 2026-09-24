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
    // Code review 2026-09-23c — a 403 is ⛔ not an outage, and must not read like one.
    forbidden: 'You do not have access to this Pariwar’s correction queue.',
    empty: 'Nothing is waiting for a correction.',
    badgeReturned: 'returned by the Pariwar Admin',
    badgeSentBackByCheck: 'you recorded: does not match',
    badgeAccountsMissing: 'bank details not yet given',
    returnedBy: 'Returned by',
    note: 'Their note',
    open: 'Open the claim',
  },
  // ── Story 6.20 — the nominee declaration HISTORY (AC3, AC4, AC7, AC8, AC13, D14) ─────────────
  // ⛔⛔ No string here says a version "changed after the death", "is suspicious" or "should be
  // discarded" — the timeline shows two dates per version and the District Admin decides (invariant 1).
  // ⚠ "correction" here is a NOMINEE-DECLARATION correction — ⛔ never the bank-detail "correction"
  // of `correctionQueue` above; the copy names which one every time (D7).
  nomineeDeclaration: {
    heading: 'Nominee declaration history',
    intro:
      'Every version of the nominees this member declared, oldest first. Enter the date on the death certificate and mark each version: a change made before that day stands; a change on that day or later is discarded.',
    loading: 'Loading the declaration history…',
    loadError: 'The declaration history could not be loaded.',
    status: {
      effective: 'Determined — the declaration in force at the death is settled.',
      undetermined: 'Not yet determined. A claim cannot be approved until you record a determination.',
      unversioned: 'This declaration has no recorded history and cannot be determined. Please contact support.',
      empty: 'Determined — no version stands. A claim cannot be approved with nobody standing.',
      incoherent: 'The standing versions do not form a valid declaration. Please redetermine.',
    },
    columns: {
      rank: 'Nominee',
      version: 'Version',
      recordedAt: 'Recorded',
      effectiveAt: 'Counts as of',
      source: 'How',
      relationship: 'Relationship',
      details: 'Details',
    },
    rankLabel: { 1: 'Primary', 2: 'Second' } as Record<number, string>,
    // The ratified English labels for the fifteen relationship codes (`-237` cl.1) — the same wording the
    // member app shows (`packages/i18n/locales/en/common.json` `nominees.relationship_*`). ⛔ Never a raw code.
    relationshipLabels: {
      spouse: 'Spouse',
      mother: 'Mother',
      father: 'Father',
      son: 'Son',
      daughter: 'Daughter',
      brother: 'Brother',
      sister: 'Sister',
      uncle: 'Uncle',
      aunt: 'Aunt',
      cousin: 'Cousin',
      niece_nephew: 'Niece / Nephew',
      grandchild: 'Grandchild',
      sister_in_law: 'Sister-in-law',
      daughter_in_law: 'Daughter-in-law',
      other: 'Other',
    } as Record<string, string>,
    kindVacated: 'Removed (no nominee at this rank)',
    source: { member: 'By the member', correction: 'Approved correction' } as Record<string, string>,
    showDetails: 'Show names and numbers',
    detailsAudited: 'Opening the details is recorded in the audit trail.',
    detailsLoading: 'Loading the details…',
    detailsError: 'The names and numbers could not be loaded. Try again.',
    detailsMissing: 'Some versions were added after the details were opened. Show them to see their names and numbers.',
    unreadable: 'Could not be read',
    anonymized: 'Erased at the member’s request',
    lastDetermination: 'Last determined by',
    lastCertificateDate: 'Certificate date it used',
    lastNote: 'Its note',
    earlier: {
      heading: 'Earlier claims for the same death (read-only)',
      intro: 'Each claim is determined on its own. These are shown for reference only — nothing here is copied into your marks.',
      claim: 'Claim',
      decidedBy: 'Determined by',
      stands: 'stand',
      discarded: 'discarded',
    },
    determine: {
      heading: 'Record the determination',
      certificateDate: 'Date of death on the certificate',
      certificateDateHelp:
        'Enter the date exactly as it is written on the death certificate. A certificate without a clear date cannot be used.',
      stands: 'Stands',
      discarded: 'Discarded',
      markLegend: 'Mark this version',
      note: 'Your note',
      noteHelp: 'Say what you checked. The note is required and is kept with the determination.',
      submit: 'Record the determination',
      incomplete: 'Enter the certificate date, mark every version and write a note before recording.',
      incompleteHint: 'To record, enter the certificate date, mark every version and write a note.',
      notRecordable: 'A determination cannot be recorded while the claim is in this state.',
      recorded: 'The determination was recorded.',
      refused: {
        inconsistent_mark:
          'A mark does not agree with the certificate date: a version dated before that day stands, and one dated on or after it is discarded.',
        stale_watermark: 'The declaration changed while you were looking at it. Reload and look again.',
        stale_supersession: 'Someone else recorded a determination meanwhile. Reload and look again.',
        missing_item: 'Every version needs a mark.',
        incoherent_rank_set: 'Only the second nominee would stand. Please check the marks.',
        unversioned: 'This declaration has no recorded history and cannot be determined.',
        invalid_certificate_date: 'That is not a real calendar date.',
        not_recordable: 'A determination cannot be recorded while the claim is in this state.',
        unknown_version: 'A marked version is not part of this declaration. Reload and look again.',
        duplicate_mark: 'A version was marked twice. Reload and mark each version once.',
        too_many_versions: 'This declaration has more versions than one determination can judge. Please contact support.',
        missing_note: 'Write a note before recording.',
        missing_display: 'Your account has no display name, so a determination cannot be attributed to you. Ask a Super Admin to set it.',
        not_found: 'This claim could not be found. Reload the page.',
        concurrent: 'The claim changed at the same moment. Reload and try again.',
      } as Record<string, string>,
      forbidden: 'Only the District Admin can record a determination.',
      refusedGeneric: 'The determination could not be recorded.',
    },
    corrections: {
      heading: 'Nominee corrections (not bank details)',
      intro:
        'A genuine mistake in a nominee’s details can be corrected after a claim: the District Admin approves first, then the Pariwar Admin — two different people, each with a note. A nominee whose relationship is “Other” cannot be corrected.',
      none: 'No nominee correction has been requested.',
      loading: 'Loading the correction requests…',
      loadError: 'The correction requests could not be loaded. Try again.',
      gated: 'Correction requests show names and numbers, so they load only when you choose to see them.',
      showGated: 'Show the correction requests',
      mobile: 'Mobile',
      address: 'Address',
      daNote: 'District Admin’s note',
      paNote: 'Pariwar Admin’s note',
      declinedAt: { district_admin: 'Declined by the District Admin', pariwar_admin: 'Declined by the Pariwar Admin' } as Record<string, string>,
      decided: 'Your decision was recorded.',
      forRequest: (rank: string, raisedAt: string) => `the ${rank} nominee request raised ${raisedAt}`,
      target: 'On record',
      proposed: 'Requested',
      relationship: 'Relationship',
      raisedVia: { helpline: 'Raised by the helpline', member_app: 'Raised by the family in the app' } as Record<string, string>,
      raiseNote: 'Why it was requested',
      step: {
        da_pending: 'Waiting for the District Admin',
        pa_pending: 'Waiting for the Pariwar Admin',
        applied: 'Approved and applied',
        declined: 'Declined',
      } as Record<string, string>,
      approve: 'Approve',
      decline: 'Decline',
      note: 'Your note',
      noteRequired: 'A note is required to approve or decline.',
      decidedBy: 'Decided by',
      refused: {
        same_approver: 'The two approvals must come from two different people.',
        step_conflict: 'This request has already moved on. Reload to see where it is.',
        relationship_other: 'The nominee’s relationship is “Other”, so no correction can be made.',
        target_not_standing: 'The version this request corrects no longer stands. Redetermine first.',
        outside_state_window: 'A nominee correction cannot be made while the claim is in this state.',
        open_correction_exists: 'This nominee already has a correction waiting.',
        no_standing_version: 'Nothing stands for this nominee yet. Record the determination first.',
        raiser_cannot_approve: 'The person who raised a request cannot also decide it.',
        version_conflict: 'Another change to this nominee landed at the same moment. Reload and try again.',
        missing_note: 'A note is required to approve or decline.',
        missing_display: 'Your account has no display name, so this cannot be attributed to you. Ask a Super Admin to set it.',
        not_found: 'This request could not be found on this claim. Reload the page.',
        claim_not_found: 'This claim could not be found. Check the claim reference.',
        concurrent: 'The declaration changed at the same moment. Reload and try again.',
      } as Record<string, string>,
      forbidden: 'You do not hold the permission for this step.',
      refusedGeneric: 'The request could not be completed.',
      raise: {
        heading: 'Request a nominee correction for the family',
        rank: 'Which nominee',
        name: 'Correct name (in English)',
        relationshipLabel: 'Relationship to the member',
        mobile: 'Mobile number',
        address: 'Address (optional)',
        note: 'What was entered incorrectly',
        submit: 'Send the request',
        incomplete: 'Enter the name, relationship, mobile number and a note.',
        sent: 'The request was sent to the District Admin.',
        claimReference: 'Claim reference',
        claimReferenceHelp: 'The claim this correction belongs to. A correction is always tied to one claim.',
        claimReferenceInvalid: 'Enter the claim reference exactly as it is shown (a 36-character reference).',
      },
    },
    refusals: {
      heading: 'Claims refused on suspicion of a nominee change',
      intro:
        'Claims a District Admin refused because the nominee was changed on or after the date on the death certificate. The refusal can be appealed once. This list is for your information — nothing here waits for your approval.',
      loading: 'Loading…',
      loadError: 'The list could not be loaded.',
      forbidden: 'You do not have access to this list.',
      empty: 'No claim has been refused on this ground.',
      refusedBy: 'Refused by',
      note: 'Their note',
      claim: 'Claim reference',
      state: 'Claim now',
    },
    // The same 409 met on a TRUSTEE surface (the cycle freeze, R9 voting) — the State Trustee cannot
    // determine; they need to know the District Admin must (e.g. after a correction superseded it).
    trusteeApprovalGate:
      'This claim is waiting for the District Admin to determine which nominee declaration was in force at the death (for example, after an approved nominee correction). It cannot go forward until they do.',
    approvalGate: {
      never_determined: 'Not yet determined. Open the nominee declaration history below and record a determination before approving.',
      empty_declaration: 'The determination leaves nobody standing, so this claim cannot be approved. Check the marks in the nominee declaration history below.',
      unversioned: 'This declaration has no recorded history and cannot be determined. Please contact support.',
      incoherent: 'The standing versions do not form a valid declaration. Redetermine in the nominee declaration history below.',
    } as Record<string, string>,
    inheritedInspection: 'Carried over from the refused claim',
    postDeathRefusalUngrounded:
      'This refusal needs a nominee determination that marks a version as discarded. Record the determination in the nominee declaration history first.',
  },
  // Story 6.11 — reason-code display labels (bounded domain enum).
  // ⚠ MOVED HERE 2026-09-22 (code review): this line sat above the Story 6.18 `nameCheck` block,
  // so it described the wrong object and `reasonCodes` had ⛔ no comment of its own.
  reasonCodes: {
    r5_d_natural_death: 'R5(d) — natural death confirmed',
    r8_90pct_met: 'R8 — 90% standing threshold met',
    concealment_flag_override: 'Concealment flag reviewed — overridden',
    concealment_flag_uphold: 'Concealment flag reviewed — upheld',
    // Story 6.20 (D14, `2026-09-21-239`) — the District Admin's refusal on suspicion. Staff copy.
    post_death_nominee_change: 'Nominee changed on or after the date of death — refused on suspicion (appealable once)',
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

/**
 * An AC8 clerical reason CODE as words — the ONE lookup every surface uses (the District Admin's
 * panel and console, both R9 surfaces, the Pariwar Admin's card). ⛔ Never a name.
 *
 * ⚠ Falls back to the code itself for an unknown value — ⛔ never the string `undefined` — and
 * reads OWN keys only, so a code like `constructor` cannot resolve to an inherited function
 * (code review 2026-09-23; `PendingCaseCard` kept a hand-copied table that had already drifted
 * in case).
 */
export function nameDifferenceReasonLabel(code: string): string {
  const reasons: Record<string, string> = verifierConsoleEn.nameCheck.reasons;
  return Object.hasOwn(reasons, code) ? reasons[code]! : code;
}
