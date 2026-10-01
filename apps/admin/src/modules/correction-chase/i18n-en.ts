// The correction chase's STAFF copy — Story 6.19b (AC8b). ENGLISH-ONLY (staff copy is English-only, D11).
//
// ⚠ S4 — `microcopy.yaml` scans ALL of `apps/admin/src/**`, comments included: the words it forbids stay out of this
// file and of every component that renders it. ⛔ No word here reads as a refusal — a return is ⛔ not a denial
// (`-227` cl.10), and the queue test pins that on the whole page.

export const correctionChaseEn = {
  heading: 'Correction chase',
  reference: 'Reference',
  referenceHelp: 'The family’s text messages quote this reference.',
  mustAct: {
    heading: 'Who must act',
    family: 'The family must act',
    staff: 'Staff must put it right',
    notSet: 'Who must act: not set',
    setBy: 'set by',
    change: 'Change who must act',
    note: 'Why (required)',
    submit: 'Save the change',
    saved: 'Saved.',
    noteRequired: 'Write a note saying why.',
    unchanged: 'That is already who must act.',
    noLiveReturn: 'This claim is no longer sent back — there is nothing to change.',
    error: 'The change could not be saved. Try again.',
    // ⭐ NEUTRAL (fifth-pass review 2026-10-01): a 403 also reaches a District Admin of ANOTHER district — "a District
    // Admin can" read wrong to them. The page cannot tell which (the session carries only the national grants).
    forbidden: 'Your access does not cover this claim.',
  },
  run: {
    family: 'Family reminders',
    staff: 'Staff reminders',
    direction: 'Family reminders (restarted by the Super Admin)',
    day: 'day',
    of90: 'of 90',
    ended: 'ended',
    endedOn: 'ended on',
    started: 'started on',
    next: 'next reminder',
    // An OPEN run past its 90 days (the close is a separate step) — ⛔ never "day 95 of 90".
    pastDay90: 'past day 90',
    none: 'No reminder run yet.',
  },
  flags: {
    cannotRemind: 'Cannot remind the family',
    reasons: {
      undetermined: 'the nominees in force at the death are not yet determined',
      no_contact_record: 'there is no contact record for this claim',
      agreement_not_live: 'the family’s agreement to be contacted is not in force',
    },
    claimantUnresolved: 'The claimant is linked to a nominee who is not in force — the claimant cannot be reminded',
    awaitingCheck: 'The family has corrected the details — awaiting your check',
    escalated: 'Escalated to the Pariwar Admin',
  },
  people: {
    heading: 'People to reach',
    nominee: 'Nominee',
    claimant: 'Claimant',
    status: {
      reached: 'reached',
      dead: 'dead number',
      unreachable: 'unreachable',
      not_yet: 'not yet reached',
    },
    since: 'since',
    reminders: 'reminders accepted',
  },
  letters: {
    heading: 'Posted letters',
    none: 'No letter recorded.',
    posted: 'posted',
    delivered: 'delivered',
    notDelivered: 'delivery not recorded',
    overdue: 'overdue — no delivery recorded 14 days after posting',
    deliveredLate: 'delivered more than 14 days after posting',
    screenshot: 'View the screenshot',
    screenshotError: 'The screenshot could not be opened. Try again.',
    screenshotLoad: 'Get the screenshot link',
    screenshotOpen: 'Open the screenshot (new tab)',
    screenshotBadLink: 'The screenshot link is not a secure link — it was not opened.',
    screenshotNotFound: 'No screenshot is on record for this letter. Reload the page.',
    screenshotExpired: 'The screenshot link expired. Get a new link to open it.',
    record: 'Record a posted letter',
    postedOn: 'Posting date',
    tracking: 'Tracking number',
    save: 'Save the letter',
    showAddress: 'Show the address',
    hideAddress: 'Hide the address',
    address: 'Address',
    addressShown: 'The address is shown below. It hides itself after a few minutes.',
    addressHidden: 'The address is hidden again.',
    // A READ failed — ⛔ "could not be saved" (nothing was being saved).
    addressError: 'The address could not be shown. Try again.',
    stepUpIntro: 'Showing an address needs a fresh verification. We will send you a code.',
    sendCode: 'Send the code',
    codeSent: 'We sent you a code. Enter it below.',
    resendCode: 'Send a new code',
    codeResent: 'We sent you a new code. Enter it below.',
    code: 'Code',
    verify: 'Verify and show',
    codeWrong: 'That code is not right, or it has expired. Send a new code and try again.',
    codeNotSent: 'The code could not be sent. Try again.',
    codeNotChecked: 'The code could not be checked. Try again.',
    codeRequired: 'Enter the code we sent you.',
    // ⭐ NEUTRAL — see `mustAct.forbidden`.
    forbidden: 'Your access does not cover this claim.',
    sessionExpired: 'Your session has ended. Sign in again to continue.',
    rateLimited: 'Too many attempts in a short time. Wait a few minutes, then try again.',
    deliveryBusy: 'A delivery is still being saved. Wait for it to finish, then try again.',
    fieldsRequired: 'Enter the posting date and the tracking number.',
    secondWaitsForDelivery: 'Record the first letter’s delivery before a second letter — a second letter follows the first one’s delivery.',
    deliveryHeading: 'Record the delivery',
    deliveryOf: 'letter #',
    deliveryFieldsRequired: 'Enter the delivery date and choose the screenshot.',
    deliveredOn: 'Delivery date',
    file: 'Screenshot of the delivery (JPEG, PNG or WebP)',
    saveDelivery: 'Save the delivery',
    // ⭐ With the posting date — under K1 two letters (of two runs) can both be #1.
    deliveryRecorded: (sequence: number, postedOn: string): string =>
      `Delivery recorded for letter #${String(sequence)} posted ${postedOn}.`,
    limit: 'Two letters are already recorded for this person.',
    refusals: {
      // ⭐ NEUTRAL — the server also refuses while the nominees in force are not yet determined (D30 `undetermined`).
      not_letter_eligible:
        'A letter cannot be recorded for this person right now — either the text reminders have not been found unable to reach them, or the nominees in force at the death are not yet determined.',
      address_missing: 'This person’s postal address is not on the contact record.',
      agreement_not_live: 'The family’s agreement to be contacted is not in force.',
      limit_reached: 'Two letters are already recorded for this person.',
      no_family_run: 'This claim has no family reminder run.',
      already_delivered: 'The delivery is already recorded.',
      delivered_before_posted: 'The delivery date is before the posting date.',
      first_not_delivered: 'Record the first letter’s delivery before a second letter — a second letter follows the first one’s delivery.',
      posted_before_run: 'The posting date is before this claim was sent back for correction. Check the date.',
      posted_before_first_delivery:
        'The second letter’s posting date is before the first letter was delivered. Check the date.',
      number_unverified: 'We could not check this person’s current number just now. Try again in a minute.',
      date_in_future: 'The date is in the future. Use today’s date or an earlier one.',
      too_large: 'The screenshot is too large. Upload an image of 10 MB or less.',
      unsupported_media_type: 'Upload the screenshot as a JPEG, PNG or WebP image.',
      empty: 'The screenshot file is empty. Choose the image again.',
      no_file: 'Choose the screenshot to upload.',
      delivered_on_required: 'Enter the delivery date.',
      not_found: 'This letter is no longer on record. Reload the page.',
    } as Record<string, string>,
    error: 'This could not be saved. Try again.',
    saved: 'Saved.',
  },
  queue: {
    nav: 'Correction queue',
    // ⭐ NEUTRAL wording — the page cannot tell a Pariwar Admin from a District Admin (the session carries only the
    // national grants), and "escalated to me" read wrong to the District Admin who was chased.
    escalatedOnly: 'Show only the chases escalated to the Pariwar Admin',
    highlighted: 'This is the claim you opened from a reminder.',
    // A REFETCH failed while a list is on screen — the list stays (a typed field, a revealed address, a confirmation
    // survive); this line says it may be out of date.
    refetchError: 'The list could not be refreshed, so it may be out of date. Reload the page to try again.',
    claimNotShown:
      'The claim you opened from a reminder is not in this list — it may be filtered out, further down than this page shows, or already resubmitted.',
  },
} as const;
