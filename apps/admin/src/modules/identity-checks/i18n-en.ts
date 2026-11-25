// Story 3.13 (DL12) — the staff words of the identity check, English only (the admin console is English-only).
//
// ⭐ APPROVED WORD FOR WORD (Task 0.2, 2026-11-25, BigDev: "Approve as shown (Recommended)"; DL6a's words R4): `title`,
// `queue.empty`, `detail.lead`, the two buttons, `history.confirmed` / `history.notConfirmed`, the four reasons,
// `detail.deathBanner`, `detail.notEligible`, and the reveal's `reveal.button` / `reveal.purpose` / `reveal.recorded` /
// `reveal.refused`. ⛔ Change one without a new approval.
// ⚠ Every OTHER string here is marked `// (label)` — form labels, document names, loading and error lines the DL12 list did
// not cover; put to BigDev with the story's completion (AC11).
// ⚠ The microcopy gate scans this file for the whole words it bars (`microcopy.yaml`) — say "a claim filed for the death",
// ⛔ the bare word for what a family files.
// ⛔ A staff hint that the member is TOLD the reason — row `3-13a` adds it when its message ships (it would be false before).

export const identityCheckEn = {
  title: 'Identity checks',
  // (label) the console nav link.
  nav: 'Identity checks',
  queue: {
    empty: 'No member is waiting for an identity check.',
    loading: 'Loading…', // (label)
    forbidden: 'You do not have access to identity checks in this Pariwar.', // (label)
    loadError: 'The list could not be loaded. Try again.', // (label)
    member: 'Member', // (label)
    signedUp: 'Joined on', // (label)
    district: 'District', // (label)
    noDistrict: 'No posting on record', // (label)
    lastCheck: 'Last check', // (label)
    notYetChecked: 'Not checked yet', // (label)
    attempts: 'Checks recorded', // (label)
    open: 'Open', // (label)
    stateLabels: {
      'lock-in': 'In lock-in', // (label)
      'pending-valid': 'Waiting for identity check', // (label)
    } as Record<string, string>,
    outcomeLabels: {
      confirmed: 'Confirmed', // (label)
      not_confirmed: 'Not confirmed', // (label)
    } as Record<string, string>,
  },
  detail: {
    lead: 'This member typed in their identity details when they joined. Check them against an original photo ID, shown to you in person or on a video call. Do not copy or keep the document or its number.',
    deathBanner: 'The Trust has been told this member has died. Their identity is checked on the claim instead.',
    notEligible: 'This member does not need an identity check.',
    loading: 'Loading…', // (label)
    forbidden: 'You do not have access to this member’s identity check.', // (label)
    notFound: 'Member not found.', // (label)
    loadError: 'The identity check could not be loaded. Try again.', // (label)
    back: 'Back to identity checks', // (label)
    name: 'Name', // (label)
    dateOfBirth: 'Date of birth', // (label)
    photo: 'Photo on record', // (label)
    noPhoto: 'No photo on record', // (label)
    mobile: 'Mobile', // (label)
    joinedOn: 'Joined on', // (label)
    posting: 'Posting', // (label)
    noPosting: 'No posting on record', // (label)
    history: 'Checks recorded', // (label)
    noHistory: 'Not checked yet', // (label)
    note: 'Note', // (label)
  },
  history: {
    confirmed: 'Identity confirmed by {name} on {date}.',
    notConfirmed: 'Not confirmed on {date}: {reason}.',
  },
  reasons: {
    details_do_not_match: 'Details do not match the ID',
    photo_does_not_match: 'Photo does not match',
    no_document_shown: 'No ID was shown',
    member_not_reached: 'Could not reach the member',
  } as Record<string, string>,
  form: {
    confirm: 'Confirm identity',
    couldNotConfirm: 'Could not confirm',
    evidenceKind: 'How was the ID shown?', // (label)
    documentKind: 'Which ID?', // (label)
    reason: 'Why could you not confirm?', // (label)
    note: 'Note', // (label)
    noteOptional: 'Note (optional)', // (label)
    noteRequired: 'Write a note saying what happened.', // (label)
    choose: 'Choose…', // (label)
    saving: 'Saving…', // (label)
    saveError: 'The check could not be saved. Try again.', // (label)
    evidenceKinds: {
      photo_id_in_person: 'In person', // (label)
      photo_id_video_call: 'On a video call', // (label)
    } as Record<string, string>,
    documentKinds: {
      aadhaar_card: 'Aadhaar card', // (label)
      pan_card: 'PAN card', // (label)
      voter_id: 'Voter ID card', // (label)
      driving_licence: 'Driving licence', // (label)
      passport: 'Passport', // (label)
      government_service_id: 'Government service ID card', // (label)
    } as Record<string, string>,
  },
  reveal: {
    button: 'Show mobile number',
    purpose: 'Shown to you only to arrange this identity check.',
    recorded: 'This showing is recorded.',
    refused: "This member's number can no longer be shown here.",
  },
} as const;

/** Fill `{name}`-style slots. */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m);
}
