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
// ⭐ Round 3 of the code review (2026-11-26, BigDev: "Approve as written (Recommended)"; R3-D3, Decision `2026-11-26-505` items 3–4)
// APPROVED word for word: `queue.previous` / `queue.next` ("Previous" / "Next"); `detail.stateLabels` (the member's state on the
// detail for a member NOT awaiting a check — the queue keeps its two); `history.confirmed` / `history.notConfirmed` (they REPLACE
// the Task-0.2 pair: the how / which ID of a confirmation, and who recorded a not-confirmed act — DL8); `detail.retry` ("Try
// again", the load error's button); `form.displayNameMissing` (a save refused because the account has no display name).
// ⭐ Round 4 (2026-11-26, BigDev: "Show a line (Recommended)"; R4-D1, Decision `2026-11-26-506` item 1) APPROVED word for word:
// `reveal.hiddenAway` (a number that arrived while the page was hidden, so it was ⛔ shown).
// ⭐ 2026-11-26 — Story 3.13a SHIPPED the staff hint that the member is shown the reason, with its message (same PR — it would be
// false before): `form.reasonToldToMember`, DL9 option (b), BigDev: "Build questions as recommended" (Decision `2026-11-26-509`).

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
    // The load error's button — one re-read per press (`-505` item 3).
    retry: 'Try again',
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
    // The member's state for a member NOT awaiting a check (`-505` item 4); `lock-in` / `pending-valid` read in the queue's words.
    stateLabels: {
      'pending-kyc': 'Has not finished joining',
      'pending-fee': 'Fee not paid yet',
      active: 'Active member',
      'active-in-grace': 'Active, payment overdue',
      'lapsed-unpaid': 'Lapsed: not paid',
      withdrawn: 'Withdrawn',
      anonymized: 'Details erased',
    } as Record<string, string>,
  },
  history: {
    // `{how}` / `{document}` are the approved form labels (`form.evidenceKinds` / `form.documentKinds`) — `-505` item 3.
    confirmed: 'Identity confirmed by {name} on {date} ({how}, {document}).',
    notConfirmed: 'Not confirmed by {name} on {date}: {reason}.',
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
    // Story 3.13a (DL9 (b), `-509`) — under the reason choice; true only since the member's card ships.
    reasonToldToMember: 'The app shows the member this reason.',
    note: 'Note',
    noteOptional: 'Note (optional)',
    noteRequired: 'Write a note saying what happened.',
    choose: 'Choose…',
    saving: 'Saving…',
    saveError: 'The check could not be saved. Try again.',
    // A save refused with 409 `admin.display_name_missing` — a retry can never work (`-505` item 3).
    displayNameMissing: 'Your account has no display name yet, so it cannot record a check. Ask the Super Admin.',
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
    hiddenAway: 'The number was hidden because you left this page. Press again to see it.',
  },
} as const;

/** Fill `{name}`-style slots. */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m);
}
