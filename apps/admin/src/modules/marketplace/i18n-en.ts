// English console-chrome resolver for the partner-offer (module) admin surface — Story 12.2 (Task 8.2; AC11, AC12).
//
// The admin console is ENGLISH-FACING (the per-module `i18n-en.ts` precedent). The OFFER's own bilingual copy (name /
// description, English + Hindi) is member-facing CONTENT, authored in the wizard and validated in the domain — ⛔ this
// chrome. ⭐ Every sentence the story QUOTES lives here VERBATIM (the Policy-meaning restatements, AC11's opening line and
// step notices, AC12's ticks and author / single-admin lines, the C10 warning, the QE11 secret copy); the derivations and
// the pages read them only through `resolveEn`, and `tests/marketplace-derive.test.ts` pins them through the real resolver.
//
// `{token}` substitution only; a missing key or a missing parameter THROWS (a silent key-as-text would ship a broken page).

const EN: Record<string, string> = {
  // ── List page ──
  'module.list.title': 'Partner offers',
  'module.list.subtitle':
    'Offers a partner makes to this Pariwar’s members. An offer is written as a draft, then another admin reviews and publishes it.',
  'module.list.new': 'New offer',
  'module.list.filter': 'Show',
  'module.list.filter.all': 'All offers',
  'module.list.empty': 'No offers yet.',
  'module.list.error': 'Could not load the offers. Try refreshing the page.',
  'module.list.more': 'Load more',
  'module.list.open': 'Open',
  'module.list.openNamed': 'Open {name}',
  'module.list.window': '{from} – {until}',

  // ── Shared ──
  'module.loading': 'Loading…',
  'module.retry': 'Try again',

  // ── States ──
  'module.state.draft': 'Draft',
  'module.state.scheduled': 'Scheduled',
  'module.state.active': 'Live',
  'module.state.archived': 'Withdrawn or ended',

  // ── Wizard chrome ──
  'module.wizard.title': 'New partner offer',
  'module.wizard.correctedTitle': 'Corrected copy of an offer',
  'module.wizard.opening':
    'Your answers stay on this page until you press Create draft. Reloading or leaving the page loses them.',
  'module.wizard.loadingFrom': 'Loading the offer to copy…',
  'module.wizard.loadFromError': 'Could not load the offer to copy.',
  'module.wizard.back': 'Back',
  'module.wizard.next': 'Next',
  'module.wizard.create': 'Create draft',
  'module.wizard.creating': 'Creating…',
  'module.wizard.stepOf': 'Step {n} of {total}',
  'module.wizard.step.a': 'Partner and offer text',
  'module.wizard.step.b': 'Who is eligible',
  'module.wizard.step.c': 'Audience',
  'module.wizard.step.d': 'When it is open',
  'module.wizard.step.e': 'Places',
  'module.wizard.step.f': 'Partner hand-off',
  'module.wizard.step.summary': 'Summary',
  'module.wizard.issue': 'Please fix: {message}',
  'module.wizard.issueField': 'Please fix “{field}”: {message}',

  // ── Step (a) ──
  'module.field.partner': 'Partner',
  'module.field.nameEn': 'Offer name (English)',
  'module.field.nameHi': 'Offer name (Hindi)',
  'module.field.descriptionEn': 'Description (English)',
  'module.field.descriptionHi': 'Description (Hindi)',
  'module.reason.partner': 'Choose a partner.',
  'module.reason.nameEn': 'Enter the offer name in English.',
  'module.reason.nameHi': 'Enter the offer name in Hindi.',
  'module.reason.descriptionEn': 'Enter the description in English.',
  'module.reason.descriptionHi': 'Enter the description in Hindi.',
  'module.reason.nameTooLong': 'An offer name can be at most 120 characters.',
  'module.reason.descriptionTooLong': 'A description can be at most 2000 characters.',

  // ── Partner picker ──
  'module.partner.choose': 'Choose a partner',
  'module.partner.none': 'No partners are registered yet.',
  'module.partner.loadError': 'Could not load the partners.',
  'module.partner.new': 'Register a new partner',
  'module.partner.nameEn': 'Partner name (English)',
  'module.partner.nameHi': 'Partner name (Hindi)',
  'module.partner.save': 'Register partner',
  'module.partner.saving': 'Registering…',
  'module.partner.cancel': 'Cancel',
  'module.partner.hint': 'A partner cannot be renamed later. A misspelt partner is registered again under the right name.',
  'module.partner.nameTaken': 'A partner with this English name is already registered. Choose it from the list.',
  'module.partner.nameInvalid': 'Check both names: each needs letters, and the Hindi name needs Hindi text.',
  'module.partner.error': 'Could not register the partner. Try again.',

  // ── Step (b) ──
  'module.eligibility.all': 'All statuses',
  'module.eligibility.only': 'Only these statuses',
  'module.reason.eligibilityMode': 'Choose whether the offer is for every status or only some.',
  'module.reason.eligibilityStates': 'Tick at least one status.',
  'module.status.pending-kyc': 'Waiting for KYC',
  'module.status.pending-fee': 'Waiting for the joining fee',
  'module.status.pending-valid': 'Lock-in over — waiting for a trustee to check identity',
  'module.status.lock-in': 'In the lock-in period',
  'module.status.active': 'Active',
  'module.status.active-in-grace': 'Active (grace period)',
  'module.status.lapsed-unpaid': 'Lapsed (unpaid)',
  'module.eligibility.noMemberYet':
    'No member can be in these statuses yet: Lock-in over — waiting for a trustee to check identity; Active; Active (grace period); Lapsed (unpaid). The step that ends the lock-in period is not built yet.',
  'module.eligibility.reachesNoMember': 'This offer reaches no member for now.',
  'module.eligibility.statusesLabel': 'Membership statuses',

  // ── Step (c) ──
  'module.scope.members-all': 'Every member of the Pariwar',
  'module.scope.state': 'Members in some states',
  'module.scope.district': 'Members in some districts',
  'module.scope.roleCohort': 'Targeting by role or cohort is not available.',
  'module.scope.noStates': 'A state audience is not available: this Pariwar has no published place list with states.',
  'module.scope.noDistricts': 'A district audience is not available: this Pariwar has no districts recorded.',
  'module.scope.search': 'Search places',
  'module.scope.noMatch': 'No place matches the search.',
  'module.scope.tooLong': 'Cannot be used: longer than 120 characters.',
  'module.scope.truncated':
    'This Pariwar has more districts than can be shown here. Only the first {n} are listed, so only those can be chosen.',
  'module.scope.sourceTree': 'Places from the Pariwar’s published place list.',
  'module.scope.sourceWorkplaces': 'Districts from the Pariwar’s listed workplace districts.',
  'module.scope.inState': '{district} ({state})',
  'module.scope.chosen': '{n} chosen',
  'module.scope.notListed': 'Chosen, but not in the list shown here (it may have been removed, or be past the first 200):',
  'module.scope.removeNamed': 'Remove {value}',
  'module.scope.loadError': 'Could not load the places.',
  'module.reason.scopeKind': 'Choose the audience.',
  'module.reason.scopeValues': 'Choose at least one place.',
  'module.reason.scopeTooMany': 'Choose at most 200 places.',

  // ── Step (d) ──
  'module.field.validFrom': 'Opens',
  'module.field.validUntil': 'Closes',
  'module.window.ist': 'India time: {time}',
  'module.window.browser': 'Your computer’s time: {time}',
  'module.reason.validFrom': 'Enter when the offer opens.',
  'module.reason.validUntil': 'Enter when the offer closes.',
  'module.reason.windowOrder': 'The closing time must be after the opening time.',
  'module.reason.windowYear': 'Dates before the year 2000 are not accepted.',

  // ── Step (e) ──
  'module.places.unlimited': 'Unlimited places',
  'module.places.fixed': 'A fixed number of places',
  'module.field.places': 'Number of places',
  'module.reason.placesMode': 'Choose unlimited places or a number of places.',
  'module.reason.places': 'Enter a whole number of places, 1 or more.',

  // ── Step (f) ──
  'module.field.leadUrl': 'Lead hand-off address (https://…)',
  'module.field.secretName': 'Signing key — Secret Manager secret name',
  'module.secret.copy': 'The Secret Manager secret must exist before leads are sent (a later release). This is its NAME, never the key.',
  'module.reason.leadUrl': 'Enter the lead hand-off address.',
  'module.reason.leadUrlHttps': 'The address must start with https://.',
  'module.reason.leadUrlTooLong': 'The address can be at most 4096 characters.',
  'module.reason.secretName': 'Enter the secret name.',
  'module.reason.secretNameShape': 'A secret name uses only letters, digits, - and _ (at most 255).',

  // ── Summary (the Policy-meaning restatements — 12.1's meanings, restated, ⛔ changed) ──
  'module.summary.previewEn': 'Preview (English)',
  'module.summary.previewHi': 'Preview (Hindi)',
  'module.summary.partner': 'Partner: {name}',
  'module.summary.audience': 'Audience',
  'module.summary.eligibility': 'Statuses',
  'module.summary.window': 'Open',
  'module.summary.places': 'Places',
  'module.audience.membersAll': 'Offered to: every member of the Pariwar',
  'module.audience.state': 'Only members whose state is one of: {places}',
  'module.audience.district': 'Only members whose district is one of: {places}',
  'module.audience.noDistrict': 'Members with no recorded workplace district are not reached by a state or district audience.',
  'module.audience.unlistedDistrict':
    'Members whose recorded workplace district is not one of the places listed here are not reached by a district audience.',
  'module.audience.matchesNobody': 'An audience that matches no member reaches nobody.',
  'module.eligibility.none': 'No status restriction — every member in the audience',
  'module.eligibility.onlyThese': 'Only members in these statuses: {statuses}',
  'module.eligibility.leftOrErased':
    'When the offer shelf opens, it will also refuse members who have left the Pariwar or whose data was erased.',
  'module.window.range': 'From {from} to {until} (India time)',
  'module.places.count': '{n} places',
  'module.places.one': '1 place',

  // ── Errors (the create / publish / withdraw codes) ──
  'module.error.manifest_invalid': 'Some offer details are not valid. The step with the problem is shown.',
  'module.error.window_ended': 'The offer window has already ended. Choose a later closing time.',
  'module.error.window_ended_detail':
    'The offer window has already ended, so this draft cannot be published. Withdraw it, then start a corrected copy with a later closing time.',
  'module.error.partner_unknown': 'That partner is not registered in this Pariwar. Choose another partner.',
  'module.error.state_scope_requires_geo_tree': 'A state audience needs a published place list with states. Choose another audience.',
  'module.error.scope_value_unknown': 'Some chosen places are not recorded for this Pariwar any more. Choose them again.',
  'module.error.not_draft': 'Only a draft can be published. Reload the page.',
  'module.error.already_published': 'This offer has already been published. Reload the page.',
  'module.error.illegal_transition': 'This offer cannot be withdrawn from its current state. Reload the page.',
  'module.error.concurrent_change': 'This offer was changed at the same time. Reload the page.',
  'module.error.not_found': 'This offer was not found.',
  'module.error.idempotency_in_progress': 'The last attempt is still being processed. Wait a moment and try again.',
  'module.error.forbidden': 'You do not have permission to manage partner offers in this Pariwar.',
  'module.error.generic': 'Something went wrong. Try again.',

  // ── Detail page ──
  'module.detail.back': 'All offers',
  'module.detail.loadError': 'Could not load this offer.',
  'module.detail.refreshError': 'Could not refresh this offer. What you see may be out of date.',
  'module.detail.membersCannotSee': 'Members cannot see offers yet. The member offer shelf comes in a later release.',
  'module.detail.state': 'State: {state}',
  'module.detail.author': 'Written by {name}',
  'module.detail.partner': 'Partner: {en} / {hi}',
  'module.detail.leadUrl': 'Lead hand-off address: {url}',
  'module.detail.secretName': 'Signing key secret name: {name}',
  'module.detail.notPublished': 'Not published yet.',
  'module.detail.publishedScheduled': 'Published by {name} on {at} — goes live at its opening time.',
  'module.detail.publishedActive': 'Published by {name} on {at}.',
  'module.detail.publishHeading': 'Review and publish',
  'module.detail.tick.tone':
    'I have reviewed this copy against every section of the TWT tone-review checklist (voice; register; prohibited frames; grief context; reviewer attestation), and I am not its author',
  'module.detail.tick.hindi': 'I have reviewed the Hindi text',
  'module.detail.tick.partner': 'The partner agreement for this offer is signed and includes TWT’s visual-discipline term',
  'module.detail.publish': 'Publish',
  'module.detail.publishing': 'Publishing…',
  'module.detail.published': 'Published.',
  'module.detail.authorCannotPublish': 'Another admin must review and publish this offer — you wrote it.',
  'module.detail.singleAdmin':
    'A Pariwar with only one admin cannot publish an offer: another admin, or a super admin granted in this Pariwar, must review and publish it.',
  'module.detail.stepUpLabel': 'publish this offer',
  'module.detail.stepUpAgain': 'The extra confirmation did not cover publishing this offer. Press Publish to start again.',
  'module.detail.withdraw': 'Withdraw this offer',
  'module.detail.withdrawing': 'Withdrawing…',
  'module.detail.withdrawn': 'Withdrawn.',
  'module.detail.correctedCopy': 'Start a corrected copy',
  'module.detail.correctedCopyHint':
    'An offer cannot be edited. To correct it, withdraw it and start a corrected copy, which is a new draft.',
  'module.detail.leadWarning':
    '{n} members registered interest in this offer. A corrected copy starts with all places free; those members can register again, and the partner may receive a second lead for the same member.',
};

/** Resolve a chrome key, substituting `{token}`s. Throws on an unknown key or a missing parameter. */
export function resolveEn(key: string, params: Readonly<Record<string, string | number>> = {}): string {
  const text = EN[key];
  if (text === undefined) throw new Error(`[marketplace i18n] unknown key '${key}'`);
  return text.replace(/\{(\w+)\}/g, (_m, name: string) => {
    const v = params[name];
    if (v === undefined) throw new Error(`[marketplace i18n] '${key}' needs the parameter '${name}'`);
    return String(v);
  });
}

/** Every key — the copy test walks them (each resolves; no stray brace once its params are given). */
export const MODULE_EN_KEYS: readonly string[] = Object.keys(EN);
