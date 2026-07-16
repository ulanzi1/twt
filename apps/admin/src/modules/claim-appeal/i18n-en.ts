// Module-local English copy for the internal 3-stage appeal admin surface (Story 6.16) — the
// claim-verification / R9-voting precedent: admin chrome copy lives HERE, NOT in @twt/i18n runtime keys, so
// the i18n-parity gate stays untouched (this admin surface is English-facing; no member-app locale parity).

export const appealEn = {
  page: {
    title: 'Claim-denial appeals',
    intro:
      'The internal 3-stage appeal: Stage 1 (an independent District Admin reviewer) → Stage 2 (a State Trustee panel) → Stage 3 (Trustee discretion, final). A reversal republishes the claim to Sahyog Vivran. Every action is human-attributed and audited.',
    claimLabel: 'Claim case id',
    load: 'Load appeal',
    noClaim: 'Enter a claim case id to load its appeal.',
  },
  stage: {
    heading: 'Appeal — stage {stage}',
    state: 'Claim state',
    notInAppeal: 'This claim is not currently in an appeal stage.',
  },
  sla: {
    overdue: 'Overdue — {elapsed} day(s) elapsed vs a {sla}-day SLA',
    withinLabel: '{elapsed} of {sla} day(s) in this stage',
  },
  stage1: {
    heading: 'Stage 1 — District Admin review',
    decisionLabel: 'Decision',
    reverse: 'Reverse the denial',
    advance: 'Do not reverse — advance to Stage 2',
    note: 'A non-reversal automatically advances the appeal to the Stage-2 State Trustee panel. This is NOT a final denial.',
    conflict:
      'You already adjudicated this claim (as its verifier / State Trustee decider / R9 panel voter). A Stage-1 reviewer must be independent — you cannot review this appeal.',
  },
  stage2: {
    heading: 'Stage 2 — State Trustee panel',
    openHeading: 'Open the panel',
    rosterLabel: 'Panel members (one actor id per line, minimum 2)',
    open: 'Open panel',
    voteHeading: 'Cast / revise your vote',
    reverse: 'Reverse',
    deny: 'Deny (advance)',
    castVote: 'Submit vote',
    tally: 'Tally: {reverse} reverse / {deny} deny of {panel} — quorum {quorum} ({met})',
    quorumMet: 'quorum met',
    quorumNotMet: 'quorum not met',
    provisional: 'Provisional outcome: {outcome}',
    finalize: 'Finalize (step-up)',
    finalizeNote: 'A strict reverse-majority over the panel reverses; a tie or sub-majority advances to Stage 3.',
    cancel: 'Cancel panel',
    reasonCodeLabel: 'Cancel reason code',
  },
  stage3: {
    heading: 'Stage 3 — Trustee discretion (final)',
    reverse: 'Reverse the denial',
    uphold: 'Uphold the denial (final)',
    note: 'Stage 3 is final within the internal appeal system.',
  },
  disposition: {
    label: 'Disposition (public, non-identifying) — required on a reversal',
    new_evidence_presented: 'New evidence presented',
    procedural_correction: 'Procedural correction',
    reconsideration_on_merits: 'Reconsideration on merits',
  },
  rationaleLabel: 'Rationale (required, ≤500 chars — confidential, never published)',
  externalRemedy:
    'Note: exhausting this internal appeal does NOT waive the claimant’s right to external legal or consumer-forum recourse (district/state consumer commission, civil court).',
  outcome: {
    reversed: 'This claim’s denial was REVERSED on appeal and has been republished to Sahyog Vivran.',
    upheldFinal: 'This claim’s denial was UPHELD at Stage 3 — the internal appeal ladder is exhausted.',
  },
  audit: {
    heading: 'Appeal decisions by reviewer',
    reviewerLabel: 'Reviewer actor id',
    stageLabel: 'Stage (optional)',
    lookup: 'Look up',
    empty: 'No appeal decisions found for this reviewer in the window.',
    overdueBadge: 'SLA breach',
  },
  submit: 'Submit',
} as const;
