// English console-chrome resolver for the family-memorial TAKE-DOWN module (Story 11b.4a, Task 9.2 — AC11, AC14).
//
// The admin console is ENGLISH-FACING (the per-module `i18n-en.ts` precedent); operator copy is precise (UX-DR55 operator
// register). The family's words are CONTENT, ⛔ never chrome: shown as the page shows them, ⛔ never resolved through here.
// ⭐ The operator script is the APPROVED text (AC14, BigDev 2026-10-27, `2026-10-27-412`) — ⛔ never changed without BigDev's say.
// The word "immediately" appears ⛔ nowhere here (Trap 11 — a take-down leaves the page within about 5 minutes once an edge
// cache exists).

const EN: Record<string, string> = {
  'takedown.nav': 'Memorial take-downs',
  'takedown.title': 'Family memorial take-downs',
  'takedown.subtitle':
    'Only the nominee who sent a memorial can have it taken down. Find the memorial, call that nominee back on the number shown, and only then record their request.',
  'takedown.noAccess': 'You do not have access to memorial take-downs in this Pariwar.',
  'takedown.lookup.label': 'Registered mobile number of the member who died',
  'takedown.lookup.submit': 'Find',
  'takedown.lookup.none': 'No member has this registered mobile number.',
  'takedown.lookup.error': 'Could not search just now. Please try again.',
  'takedown.lookup.drives': 'Drives with a memorial on the page',
  'takedown.lookup.noDrives': 'This member has no memorial on any Sahyog Vivran page.',
  'takedown.lookup.openRequest': 'A request is open',
  'takedown.lookup.drivesLoading': 'Loading this member’s drives…',
  'takedown.lookup.drivesError': 'Could not load this member’s drives. Please try again.',
  'takedown.open.title': 'Open requests, oldest first',
  'takedown.open.loading': 'Loading the open requests…',
  'takedown.open.error': 'Could not load the open requests. Please reload.',
  'takedown.open.empty': 'No request is open.',
  'takedown.open.due': 'Due',
  'takedown.open.overdue': 'Overdue',
  'takedown.open.firstContact': 'Nominee first asked',
  'takedown.open.drive': 'Drive',
  'takedown.open.status': 'Status',
  'takedown.drive.loading': 'Loading the drive…',
  'takedown.drive.notFound': 'There is no memorial to take down on this drive.',
  'takedown.drive.error': 'Could not load this drive. Please reload.',
  'takedown.drive.onPage': 'On the Sahyog Vivran page now',
  'takedown.drive.notOnPage': 'No memorial is on the page for this drive.',
  'takedown.drive.wordsUnavailable': 'The words could not be read just now.',
  'takedown.drive.photo': 'The photo',
  'takedown.callBack.title': 'Call this nominee back',
  'takedown.callBack.body': 'Only this nominee — the one who sent the memorial on the page — can ask for it to be taken down. Anyone else who calls: listen, and ask them to have the nominee call.',
  'takedown.callBack.unreadable': 'Not readable just now',
  'takedown.script.title': 'Before you take it down',
  'takedown.script.intro':
    'Before you take it down, ask what is troubling them. Offer what is smaller than removal: leaving out a sentence or a name, removing only the photo, or sending a new version.',
  'takedown.script.send_now':
    'The nominee can send a new version from the app now. This memorial stays on the page until the Trust approves the new one.',
  'takedown.script.take_down_first':
    'A new version can be sent only after this one is taken down, so the memorial will be off the page while the Trust reviews the new one.',
  'takedown.script.currentNominee': 'A new version is sent by the current nominee.',
  'takedown.script.currentNomineeOther': 'A new version is sent by the current nominee, {name}, who is not the person who asked.',
  'takedown.confirm.latency': 'It leaves the page within about 5 minutes.',
  'takedown.record.title': 'Record the nominee’s request',
  'takedown.record.calledBack': 'I called the nominee back on this number and they asked for it',
  'takedown.record.firstContact': 'When the nominee first asked (the 7 days run from here)',
  'takedown.record.submit': 'Record the request',
  'takedown.record.retry': 'Try again',
  'takedown.record.recorded': 'Request recorded.',
  'takedown.requests.title': 'Requests',
  'takedown.requests.open': 'Open',
  'takedown.requests.received': 'Recorded',
  'takedown.requests.decidedLate': 'decided after the due date',
  'takedown.outcome.taken_down': 'Taken down',
  'takedown.outcome.kept': 'Kept',
  'takedown.outcome.superseded': 'Superseded',
  'takedown.decide.title': 'Decide the request',
  'takedown.action.takeDown': 'Take it down',
  'takedown.action.confirmTakeDown': 'Confirm: take it down',
  'takedown.action.kept': 'The nominee chose to keep it',
  'takedown.action.superseded': 'Close: the memorial on the page has changed',
  'takedown.action.cancel': 'Cancel',
  'takedown.stepUp.needed': 'Taking a memorial down needs a fresh verification.',
  'takedown.stepUp.send': 'Send me a code',
  'takedown.stepUp.sent': 'Code sent. Enter it below.',
  'takedown.stepUp.sendError': 'Could not send a code just now. Please try again.',
  'takedown.stepUp.code': 'Code',
  'takedown.stepUp.verify': 'Verify',
  'takedown.stepUp.verifyError': 'Could not verify that code. Check it, or send a new code, and try again.',
  'takedown.decided': 'Recorded.',
  'error.memorial_takedown.not_found': 'There is no memorial to take down on this drive any more.',
  'error.memorial_takedown.request_open': 'This drive already has an open request.',
  'error.memorial_takedown.already_decided': 'This request has already been decided.',
  'error.memorial_takedown.shown_changed':
    'The memorial on the page is no longer the one this nominee asked about. Close the request as changed, and ask the nominee of the version now shown to call.',
  'error.memorial_takedown.shown_unchanged': 'The memorial on the page has not changed, so the request cannot be closed as changed.',
  'error.memorial_takedown.first_contact_out_of_range': 'The nominee’s first contact must be in the last 7 days, and not in the future.',
  'error.record.shown_changed':
    'The memorial on the page changed while you were on the call, so nothing was recorded. Reload this drive, check who the nominee is now, and call them back before recording.',
  'error.unknown': 'Could not record this. Please reload and try again.',
};

export function resolveEn(key: string): string {
  return EN[key] ?? key;
}

/** A refusal's plain-English sentence by its code; anything this build does not know gets the generic sentence. */
export function errorSentence(code: string | undefined): string {
  return code !== undefined && Object.prototype.hasOwnProperty.call(EN, `error.${code}`) ? EN[`error.${code}`]! : EN['error.unknown']!;
}

/** The record form's refusals: `errorSentence`, except `shown_changed`, which at record time has no request to close. */
export function recordErrorSentence(code: string | undefined): string {
  return code === 'memorial_takedown.shown_changed' ? EN['error.record.shown_changed']! : errorSentence(code);
}
