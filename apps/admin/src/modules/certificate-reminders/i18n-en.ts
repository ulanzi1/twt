// The replacement-certificate reminder's STAFF copy — Story 6.19d (AC5; `2026-10-03-276` CR10, CR11). ENGLISH-ONLY
// (staff copy is English-only, D11).
//
// ⚠ `microcopy.yaml` scans ALL of `apps/admin/src/**`, comments included: the urgency and moderation-advice phrases it
// forbids stay out of this file and every component that renders it. ⛔ No name, ⛔ no number, ⛔ no address in any of
// it. ⭐ The day-13 escalation is a RECORD in v1 — it reaches ⛔ no Pariwar Admin (⛔ no push, ⛔ no Pariwar-Admin
// surface), so its line says so and is ⛔ never worded as sent or notified (CR10).

export const certificateRemindersEn = {
  nav: 'Certificate reminders',
  heading: 'Certificate reminders',
  intro:
    'Families asked for a death certificate with a clear date of death. They are reminded by text on the Panel’s days, for up to 180 days. A claim is never refused or closed because the certificate is late.',
  loading: 'Loading…',
  loadError: 'The list could not be loaded.',
  empty: 'No family is being reminded about a certificate.',
  truncated: 'Only some claims are listed. Older, more overdue ones are kept, but are not shown here.',
  cause: {
    rejected: 'Certificate not accepted',
    missing: 'No certificate received',
  } as Record<string, string>,
  run: {
    day: 'day',
    nextReminder: 'next reminder on',
    noMore: 'No more reminders are scheduled.',
    ended: 'Reminders have ended.',
  },
  pause: {
    outside_window: 'Paused — the claim is not being checked.',
    certificate_accepted: 'Paused — the certificate is accepted.',
    certificate_not_rejected: 'Paused — the certificate is with the District Admin.',
  } as Record<string, string>,
  cannotRemind: {
    no_contact_record: 'Cannot remind: there is no contact record for this claim — the helpline can add one.',
    agreement_not_live: 'Cannot remind: the family’s agreement to be contacted is not in force.',
  } as Record<string, string>,
  role: {
    nominee: 'nominee',
    claimant: 'claimant',
  } as Record<string, string>,
  sms: {
    not_yet_reminded: 'Not yet reminded',
    reminded: 'Reminded by text',
    number_not_working: 'Number not working',
    unreachable: 'Unreachable',
    no_number: 'No number',
    not_sent: 'Text not sent (a system fault)',
    letter_delivered_no_sms: 'Letter delivered — no further texts',
  } as Record<string, string>,
  escalation: (date: string): string => `Escalation recorded on ${date} (the Pariwar Admin is not notified in this version).`,
  letter: {
    owed: 'A letter is owed — this person’s number does not work.',
    mustSay:
      'The letter must say: the family’s claim still needs a death certificate that clearly shows the date of death, and how to send it — in the app or through the helpline.',
    posted: 'posted',
    delivered: 'delivered',
    overdue: 'No delivery recorded within 14 days of posting.',
    deliveredLate: 'Delivered more than 14 days after posting.',
    showAddress: 'Show the address (asks for a fresh code)',
    code: 'The code we sent you',
    postedOn: 'Posting date',
    tracking: 'Tracking number',
    record: 'Record the posted letter',
    recorded: 'Letter recorded.',
    postRequired: 'Enter the posting date and the tracking number.',
    deliveredOn: 'Delivery date',
    screenshot: 'Delivery screenshot',
    recordDelivery: 'Record the delivery',
    deliveryRecorded: 'Delivery recorded.',
    deliverRequired: 'Enter the delivery date and add the screenshot.',
    onlyOne: 'Only one letter is sent to each person on a claim.',
    screenshotLoad: 'Load the delivery screenshot (asks for a fresh code)',
    screenshotOpen: 'Open the delivery screenshot',
    screenshotExpired: 'The link expired — load it again.',
    screenshotError: 'The screenshot could not be loaded.',
  },
  errors: {
    forbidden: 'Your access does not cover this.',
    sessionExpired: 'Your session has ended — sign in again.',
    rateLimited: 'Too many attempts — wait a minute and try again.',
    saveFailed: 'That did not go through — try again.',
    tooLarge: 'The screenshot is too large. Upload an image of 10 MB or less.',
    unsupportedMediaType: 'Upload the screenshot as a JPEG, PNG or WebP image.',
  },
} as const;
