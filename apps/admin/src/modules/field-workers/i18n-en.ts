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
  'fw.noAccess': 'You do not have access to this. A District Admin can act only in their own district; approving is for a Pariwar Admin.',
  'fw.noAccessDistrict': 'Choose a district you manage. Only a Pariwar Admin can see every district at once.',
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
  'fw.err.keyRequired': 'The request was incomplete. Press Register again.',
  'fw.err.inProgress': 'This is still being processed. Wait a moment and try again.',
  'fw.err.mobileTaken': 'A field worker with this mobile number is already registered in this Pariwar.',
  'fw.err.nameInvalid': 'This name cannot be used. Use letters, without symbols that do not show.',
  'fw.err.mobileInvalid': 'Enter a 10-digit Indian mobile number.',
  'fw.err.districtUnknown': 'This district is not one the Pariwar records. Choose one from the list, or type it exactly.',
  'fw.err.codesExhausted': 'No code could be set aside just now. Try again later.',
  'fw.err.displayName': 'Your admin account has no display name yet, so this cannot be recorded. Ask the maintainer to add one.',
  'fw.err.validation': 'Something in the form is not valid. Check each field.',

  // ── Awaiting approval ──
  'fw.approvals.title': 'Workers awaiting approval',
  'fw.approvals.intro': 'Approving confirms the identity check done at the interview and lets the worker be credited. Only a Pariwar Admin approves.',
  'fw.approvals.empty': 'No workers are awaiting approval here.',
  'fw.approvals.review': 'Review',
  'fw.approvals.reviewNamed': 'Review {name}',
  'fw.approvals.approve': 'Approve',
  'fw.approvals.approveNamed': 'Approve {name}',
  'fw.approvals.approving': 'Approving…',
  'fw.approvals.approved': '{name} is approved and active.',
  'fw.approvals.alreadyDone': 'This worker is already approved, or is no longer awaiting approval.',
  'fw.approvals.moved': 'This worker was moved to another district meanwhile. Reload and try again.',
  'fw.approvals.close': 'Close',

  // ── Shared list ──
  'fw.list.error': 'Could not load the workers.',
  'fw.list.more': 'Load more',
  'fw.list.moreShown': '{n} more workers shown.',
  'fw.list.moreShownOne': '1 more worker shown.',
  'fw.list.noMore': 'No more workers.',
  'fw.list.moreError': 'Could not load more workers. Try again.',
  'fw.list.keyUnavailable': 'The key service is unavailable just now. Try again shortly.',
  'fw.list.unreadable': 'A worker’s stored details cannot be read. Do not approve; tell the maintainer.',

  // ── Detail ──
  'fw.detail.title': 'Worker details',
  'fw.detail.mobile': 'Mobile',
  'fw.detail.approvedBy': 'Approved by {name}',

  // ── Find a worker ──
  'fw.find.title': 'Find a worker',
  'fw.find.intro': 'Choose a district to see its active workers. Show a worker’s code only to read it to them, when they ask.',
  'fw.find.chooseFirst': 'Choose a district to see its workers.',
  'fw.find.empty': 'No active workers in this district.',

  // ── The code ──
  'fw.code.show': 'Show code',
  'fw.code.showNamed': 'Show the code of {name}',
  'fw.code.hide': 'Hide code',
  'fw.code.loading': 'Fetching the code…',
  'fw.code.readAloud': 'For reading to the worker only. It hides itself after a minute, and each look is recorded.',
  'fw.code.label': 'Code: {spelled}',
  'fw.code.notApproved': 'This worker is not approved yet, so they have no code to give.',
  'fw.code.suspended': 'This worker is suspended. Their code cannot be given out until they are reinstated.',
  'fw.code.ended': 'This worker’s engagement has ended. Their code is not given out.',
  'fw.code.unavailable': 'This worker has no code to give in their current state.',
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
