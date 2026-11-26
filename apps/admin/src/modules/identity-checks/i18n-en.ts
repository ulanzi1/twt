// Story 3.13 (DL12) — the staff words of the identity check, English only (the admin console is English-only).
//
// ⭐ APPROVED WORD FOR WORD (Task 0.2, 2026-11-25, BigDev: "Approve as shown (Recommended)"; DL6a's words R4): `title`,
// `queue.empty`, `detail.lead`, the two buttons, `history.confirmed` / `history.notConfirmed`, the four reasons,
// `detail.deathBanner`, `detail.notEligible`, and the reveal's `reveal.button` / `reveal.purpose` / `reveal.recorded` /
// `reveal.refused`. ⛔ Change one without a new approval.
// ⭐ Every OTHER string here (form labels, document names, loading and error lines, the nav link — the ones DL12's list did
// not cover) was APPROVED as written at the dev-story's end (2026-11-25, BigDev: "Approve as shown (Recommended)") — AC11.
// ⭐ THREE MORE lines were APPROVED word for word at the code review (2026-11-26, BigDev: "Approve as written (Recommended)";
// D3, `-504` item 6): `reveal.couldNotShow`, `form.savedConfirmed`, `form.savedNotConfirmed`. The queue's `previous` / `next` are
// the console's own paging words ("Previous" / "Next" — the banners list's `banner.page.prev` / `banner.page.next`), ⛔ new ones.
// ⚠ The microcopy gate scans this file for the whole words it bars (`microcopy.yaml`) — say "a claim filed for the death",
// ⛔ the bare word for what a family files.
// ⛔ A staff hint that the member is TOLD the reason — row `3-13a` adds it when its message ships (it would be false before).

export const identityCheckEn = {
  title: 'Identity checks',
  // The console nav link.
  nav: 'Identity checks',
  queue: {
    empty: 'No member is waiting for an identity check.',
    loading: 'Loading…',
    forbidden: 'You do not have access to identity checks in this Pariwar.',
    loadError: 'The list could not be loaded. Try again.',
    member: 'Member',
    signedUp: 'Joined on',
    district: 'District',
    noDistrict: 'No posting on record',
    lastCheck: 'Last check',
    notYetChecked: 'Not checked yet',
    attempts: 'Checks recorded',
    open: 'Open',
    // The house paging words (the banners list).
    previous: 'Previous',
    next: 'Next',
    stateLabels: {
      'lock-in': 'In lock-in',
      'pending-valid': 'Waiting for identity check',
    } as Record<string, string>,
    outcomeLabels: {
      confirmed: 'Confirmed',
      not_confirmed: 'Not confirmed',
    } as Record<string, string>,
  },
  detail: {
    lead: 'This member typed in their identity details when they joined. Check them against an original photo ID, shown to you in person or on a video call. Do not copy or keep the document or its number.',
    deathBanner: 'The Trust has been told this member has died. Their identity is checked on the claim instead.',
    notEligible: 'This member does not need an identity check.',
    loading: 'Loading…',
    forbidden: 'You do not have access to this member’s identity check.',
    notFound: 'Member not found.',
    loadError: 'The identity check could not be loaded. Try again.',
    back: 'Back to identity checks',
    name: 'Name',
    dateOfBirth: 'Date of birth',
    photo: 'Photo on record',
    noPhoto: 'No photo on record',
    mobile: 'Mobile',
    joinedOn: 'Joined on',
    posting: 'Posting',
    noPosting: 'No posting on record',
    history: 'Checks recorded',
    noHistory: 'Not checked yet',
    note: 'Note',
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
    evidenceKind: 'How was the ID shown?',
    documentKind: 'Which ID?',
    reason: 'Why could you not confirm?',
    note: 'Note',
    noteOptional: 'Note (optional)',
    noteRequired: 'Write a note saying what happened.',
    choose: 'Choose…',
    saving: 'Saving…',
    saveError: 'The check could not be saved. Try again.',
    savedConfirmed: 'Identity confirmed.',
    savedNotConfirmed: 'Saved.',
    evidenceKinds: {
      photo_id_in_person: 'In person',
      photo_id_video_call: 'On a video call',
    } as Record<string, string>,
    documentKinds: {
      aadhaar_card: 'Aadhaar card',
      pan_card: 'PAN card',
      voter_id: 'Voter ID card',
      driving_licence: 'Driving licence',
      passport: 'Passport',
      government_service_id: 'Government service ID card',
    } as Record<string, string>,
  },
  reveal: {
    button: 'Show mobile number',
    purpose: 'Shown to you only to arrange this identity check.',
    recorded: 'This showing is recorded.',
    refused: "This member's number can no longer be shown here.",
    couldNotShow: 'The number could not be shown. Try again.',
  },
} as const;

/** Fill `{name}`-style slots. */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m);
}
