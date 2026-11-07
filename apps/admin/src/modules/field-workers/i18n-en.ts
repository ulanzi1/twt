// English console copy for the field-worker screens — Story 13.1a (Task 9; AC11). The admin console is English-only (the per-module
// `i18n-en.ts` precedent). Every page and `derive.ts` read copy ONLY through `resolveEn`; `tests/field-worker-derive.test.ts` walks
// every key. `{token}` substitution only; a missing key or parameter THROWS (a silent key-as-text would ship a broken page).

const EN: Record<string, string> = {
  // ── Navigation ──
  'fw.nav': 'Field workers',
  'fw.nav.register': 'Register a worker',
  'fw.nav.approvals': 'Awaiting approval',
  'fw.nav.find': 'Find a worker',
  'fw.nav.label': 'Field-worker pages',

  // ── Shared ──
  'fw.loading': 'Loading…',
  'fw.retry': 'Try again',
  // The 403 line differs by screen (review CR11): what a refusal means depends on what the admin was doing.
  'fw.noAccess': 'You do not have access to this. A District Admin can act only in their own district; approving is for a Pariwar Admin.',
  'fw.noAccessRegister': 'You do not have access to register workers here. A District Admin can register only in their own district.',
  'fw.noAccessFind': 'You do not have access to this district’s workers. Choose a district you manage, or ask a Pariwar Admin.',
  'fw.noAccessCode': 'You do not have access to give out this worker’s code. A District Admin can do this only in their own district.',
  'fw.noAccessDistrict': 'Choose a district you manage. Only a Pariwar Admin can see every district at once.',
  'fw.forName': 'for {name}',
  'fw.signIn': 'Your session has ended. Redirecting to sign in…',
  'fw.unknownError': 'Something went wrong ({code}). Try again; if it keeps happening, tell the maintainer.',
  'fw.state.pending_kyc': 'Awaiting approval',
  'fw.state.active': 'Active',
  'fw.state.suspended': 'Suspended',
  'fw.state.terminated': 'Ended',
  'fw.district': 'District',
  'fw.district.choose': 'Choose a district',
  'fw.district.all': 'All districts',
  'fw.district.typed': 'Or type the district exactly',
  'fw.district.typedHint': 'Type it exactly as the Pariwar records it — capital letters and spaces count.',
  'fw.district.truncated': 'This Pariwar has more districts than can be listed here. If yours is missing, type it exactly below.',
  'fw.district.loadError': 'Could not load the districts.',
  'fw.registeredBy': 'Registered by {name}',
  'fw.registeredOn': 'Registered {date}',

  // ── Register ──
  'fw.register.title': 'Register a field worker',
  'fw.register.intro': 'The worker is registered as awaiting approval. A Pariwar Admin approves them before they can be given their code.',
  'fw.register.name': 'Name',
  'fw.register.mobile': 'Mobile number',
  'fw.register.submit': 'Register',
  'fw.register.submitting': 'Registering…',
  'fw.register.done': 'Registered, awaiting a Pariwar Admin’s approval.',
  'fw.register.doneId': 'Worker ID: {id}',
  'fw.register.another': 'Register another',
  'fw.register.chooseDistrict': 'Choose or type the district.',
  'fw.register.nameRequired': 'Enter the worker’s name.',
  'fw.register.mobileRequired': 'Enter the worker’s mobile number.',

  // ── Errors (the registration's codes) ──
  'fw.err.keyRequired': 'The request was incomplete. Try again.',
  'fw.err.inProgress': 'This is still being processed. Wait a moment and try again.',
  'fw.err.mobileTaken': 'A field worker with this mobile number is already registered in this Pariwar.',
  'fw.err.nameInvalid': 'This name cannot be used. Use letters, without symbols that do not show.',
  'fw.err.mobileInvalid': 'Enter a 10-digit Indian mobile number.',
  'fw.err.districtUnknown': 'This district is not one the Pariwar records. Choose one from the list, or type it exactly.',
  'fw.err.codesExhausted': 'No code could be set aside just now. Try again later.',
  'fw.err.displayName': 'Your admin account has no display name yet, so this cannot be recorded. Ask the maintainer to add one.',
  'fw.err.validation': 'Something in the form is not valid. Check each field.',
  'fw.err.notFound': 'This worker could not be found. Reload the list and try again.',
  'fw.err.changedMeanwhile': 'This worker was changed at the same moment by someone else. Reload and try again.',
  'fw.err.kycNotDone': 'The identity check could not be recorded for this worker. Reload the list and try again.',
  'fw.err.cursorInvalid': 'The list position is no longer valid. Load the list again.',
  'fw.err.rateLimited': 'Too many requests just now. Wait a moment and try again.',
  'fw.err.districtUnchanged': 'The worker already reports to that district.',
  'fw.err.endedOnInvalid': 'The date must be a real date, not in the future and not before the worker was registered.',

  // ── Awaiting approval ──
  'fw.approvals.title': 'Workers awaiting approval',
  'fw.approvals.intro': 'Approving confirms the identity check done at the interview and lets the worker be credited. Only a Pariwar Admin approves.',
  'fw.approvals.empty': 'No workers are awaiting approval here.',
  'fw.approvals.review': 'Review',
  'fw.approvals.reviewNamed': 'Review {name}',
  'fw.approvals.approve': 'Approve',
  'fw.approvals.approving': 'Approving…',
  'fw.approvals.approved': '{name} is approved and active. Find a worker shows whether their code text arrived.',
  'fw.approvals.failedNamed': 'Could not approve {name}. {reason}',
  'fw.approvals.alreadyDone': 'This worker is already approved, or is no longer awaiting approval.',
  'fw.approvals.moved': 'This worker was moved to another district meanwhile. Reload and try again.',
  'fw.approvals.close': 'Close',

  // ── Shared list ──
  'fw.list.more': 'Load more',
  'fw.list.moreShown': '{n} more workers shown.',
  'fw.list.moreShownOne': '1 more worker shown.',
  'fw.list.noMore': 'No more workers.',
  'fw.list.moreError': 'Could not load more workers. Try again.',
  'fw.list.refreshError': 'Could not refresh the workers. The list below may be out of date.',
  'fw.list.keyUnavailable': 'The key service is unavailable just now. Try again shortly.',
  'fw.list.unreadable': 'A worker’s stored details cannot be read. Do not approve; tell the maintainer.',

  // ── Detail ──
  'fw.detail.title': 'Worker details',
  'fw.detail.loaded': 'Worker details loaded.',
  'fw.detail.mobile': 'Mobile',
  'fw.detail.state': 'Status',
  'fw.detail.registration': 'Registration',
  'fw.detail.approval': 'Approval',
  'fw.detail.approvedBy': 'Approved by {name}',
  'fw.detail.codeSms': 'Code text',
  'fw.codeSms.sending': 'Code SMS: sending',
  'fw.codeSms.sent': 'Code SMS: sent, not yet confirmed',
  'fw.codeSms.delivered': 'Code SMS: delivered',
  // Story 13.1c AD10 (a) (13.1b C7 / CB9): a suspended or ended worker's by-hand read answers 409, so the tail is conditional.
  'fw.codeSms.not_delivered': 'Code SMS not delivered - if the worker is active, give the code by hand when they ask',
  'fw.codeSms.not_confirmed': 'Code SMS outcome unknown, it may have arrived - if the worker is active, give the code by hand when they ask',

  // ── Find a worker ──
  'fw.find.title': 'Find a worker',
  'fw.find.intro':
    'Choose a district, and a status (Active to start with), to see those workers. Check a worker’s details with them first, then show their code, only to read it to them when they ask. Each look at the details or the code is recorded. From the details you can also move, suspend, reactivate or end a worker, and see their history.',
  // Story 13.1c (AD8) — the state selector; "Waiting for approval" is here because a waiting worker can be moved or ended.
  'fw.find.state': 'Status',
  'fw.find.state.pending_kyc': 'Waiting for approval',
  'fw.find.state.active': 'Active',
  'fw.find.state.suspended': 'Suspended',
  'fw.find.state.terminated': 'Ended',
  'fw.find.empty.pending_kyc': 'No workers waiting for approval in this district.',
  'fw.find.empty.suspended': 'No suspended workers in this district.',
  'fw.find.empty.terminated': 'No ended workers in this district.',
  'fw.find.check': 'Check details',
  'fw.find.chooseFirst': 'Choose a district to see its workers.',
  'fw.find.empty': 'No active workers in this district.',

  // ── The code ──
  'fw.code.show': 'Show code',
  'fw.code.hide': 'Hide code',
  'fw.code.loading': 'Fetching the code…',
  'fw.code.readAloud': 'For reading to the worker only. It hides itself after a minute, and each look is recorded.',
  'fw.code.label': 'Code: {spelled}',
  // The persistent live region — ⛔ never the digits (review CR6).
  'fw.code.liveShown': 'Code shown for {name}. It hides in {seconds} seconds.',
  'fw.code.liveHidden': 'Code hidden.',
  'fw.code.notApproved': 'This worker is not approved yet, so they have no code to give.',
  'fw.code.suspended': 'This worker is suspended. Their code cannot be given out until they are reinstated.',
  'fw.code.ended': 'This worker’s engagement has ended. Their code is not given out.',
  'fw.code.unavailable': 'This worker has no code to give in their current state.',

  // ── Story 13.1c — the acts on an opened worker (AD8) ──
  'fw.actions.title': 'Actions',
  'fw.actions.none': 'This worker’s engagement has ended. No further action can be taken here.',
  'fw.actions.move': 'Move',
  'fw.actions.suspend': 'Suspend',
  'fw.actions.reactivate': 'Reactivate',
  'fw.actions.end': 'End',
  'fw.actions.confirm': 'Confirm',
  'fw.actions.cancel': 'Cancel',
  'fw.actions.saving': 'Saving…',
  'fw.actions.reason': 'Reason',
  'fw.actions.reason.choose': 'Choose a reason',
  'fw.actions.move.intro': 'Moving changes which District Admin manages the worker. Their code, status and history stay the same.',
  'fw.actions.move.to': 'Move to district',
  'fw.actions.move.choose': 'Choose a district',
  'fw.actions.move.noOther': 'This Pariwar records no other district to move the worker to.',
  'fw.actions.suspend.intro': 'While suspended, the worker’s code cannot be given out and credits no new teacher.',
  'fw.actions.reactivate.intro': 'Reactivating makes the worker active again: their code can be given out and credits new teachers.',
  // Row 13-1f rewords this line when the undo of a mistaken ending exists (`-454` Q1 A).
  'fw.actions.end.final': 'Ending is final. Their code stops crediting new teachers; to work again they must be registered again.',
  'fw.actions.end.lastDay': 'Last day',
  'fw.actions.end.dateOfDeath': 'Date of death',
  // `-454` Q4 A — a line, ⛔ a checkbox or a recorded attestation (the Panel accepted "the officer's judgement alone").
  'fw.actions.end.inactiveHint': 'End a worker for this only after you have tried to reach them.',
  'fw.actions.done.move': '{name} now reports to {district}.',
  'fw.actions.done.suspend': '{name} is suspended.',
  'fw.actions.done.reactivate': '{name} is active again.',
  'fw.actions.done.end': '{name}’s engagement has ended.',
  'fw.actions.failedNamed': 'Could not {act} {name}. {reason}',
  'fw.actions.noAccess.move': 'Only a Pariwar Admin can move a worker directly.',
  'fw.actions.noAccess.suspend': 'You do not have access to suspend this worker. A District Admin can do this only in the worker’s own district.',
  'fw.actions.noAccess.reactivate': 'You do not have access to reactivate this worker. A District Admin can do this only in the worker’s own district.',
  'fw.actions.noAccess.end': 'You do not have access to end this worker’s engagement. A District Admin can do this only in the worker’s own district.',
  'fw.actions.moved': 'This worker was moved by someone else while you were working. Reload to see their district.',
  'fw.actions.stateChanged': 'This worker’s status was changed by someone else meanwhile. Reload to see it.',

  // ── Reasons — labels, never codes ──
  'fw.reason.under_review': 'Under review',
  'fw.reason.at_worker_request': 'At the worker’s request',
  'fw.reason.left_voluntarily': 'Left',
  'fw.reason.inactive': 'Stopped working',
  'fw.reason.registered_in_error': 'Registered by mistake',
  'fw.reason.died': 'Died',
  'fw.reason.reassigned': 'Reassigned by the Trust',

  // ── Story 13.1c — the worker's history (AD7, AD8) ──
  'fw.history.show': 'Show history',
  'fw.history.title': 'History',
  'fw.history.loaded': 'History loaded.',
  'fw.history.empty': 'Nothing is recorded for this worker yet.',
  'fw.history.more': 'Load more',
  'fw.history.moreError': 'Could not load more of the history. Try again.',
  'fw.history.noAccess': 'You do not have access to this worker’s history. A District Admin can see it only in the worker’s own district.',
  'fw.history.by': 'by {name}, {role}',
  // AD7 — a missing or blank display name; ⛔ an email.
  'fw.history.unknownOfficer': 'an officer (name not recorded)',
  'fw.history.event.field_worker.registered': 'Registered',
  'fw.history.event.field_worker.kyc_completed': 'Identity check accepted',
  'fw.history.event.field_worker.activated': 'Approved',
  'fw.history.event.field_worker.suspended': 'Suspended',
  'fw.history.event.field_worker.reactivated': 'Reactivated',
  'fw.history.event.field_worker.terminated': 'Ended',
  'fw.history.event.field_worker.posted': 'Moved',
  'fw.history.district': 'District: {district}',
  'fw.history.move': 'From {from} to {to}',
  'fw.history.reason': 'Reason: {reason}',
  'fw.history.lastDay': 'Last day: {date}',
  'fw.history.dateOfDeath': 'Date of death: {date}',
  'fw.role.district_admin': 'District Admin',
  'fw.role.pariwar_admin': 'Pariwar Admin',
  'fw.role.super_admin': 'Super Admin',
  'fw.role.unknown': 'role not recorded',
};

export function resolveEn(key: string, params: Readonly<Record<string, string | number>> = {}): string {
  const text = EN[key];
  if (text === undefined) throw new Error(`[field-workers i18n] unknown key '${key}'`);
  return text.replace(/\{(\w+)\}/g, (_m, name: string) => {
    const v = params[name];
    if (v === undefined) throw new Error(`[field-workers i18n] '${key}' needs the parameter '${name}'`);
    return String(v);
  });
}

/** Every key — the copy test walks them (each resolves; no stray brace once its params are given). */
export const FIELD_WORKER_EN_KEYS: readonly string[] = Object.keys(EN);
