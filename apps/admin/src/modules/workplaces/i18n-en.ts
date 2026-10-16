// Module-local English copy for the workplace LIST, the *"isn't listed"* QUEUE and the people-who-know-me CAMPAIGNS
// (Story 6.36c) — the console precedent: admin chrome copy lives HERE, ⛔ not in @twt/i18n runtime keys.
// `errors` `satisfies` the CONTRACTS' code lists (themselves pinned to the domain's by the API lockstep test) ⇒ a refusal
// the domain adds fails the build here until it has words.

import type { KnownPeopleCampaignRefusalCode, WorkplaceAdminRefusalCode } from '@twt/contracts';

/** A 400 `request.validation` (the API's zod refusal) — ONE line for all three surfaces (code review round 2). */
const VALIDATION = 'Please check the fields and try again.';

export const workplacesEn = {
  nav: 'Workplaces',
  heading: 'Workplaces — schools and offices',
  intro:
    'The schools come from the import. Add an office here, or a school the import missed. Members pick their workplace from this list.',
  importNote: 'An imported school is corrected by the next import — it cannot be renamed or delisted here.',
  neverDeleted: 'A workplace is never deleted: a delisted one is hidden from the members’ list but stays on every record that names it.',
  loading: 'Loading the workplaces…',
  loadError: 'The workplaces could not be loaded.',
  forbidden: 'Only the Super Admin can change this list.',
  filters: { district: 'District', kind: 'Kind', status: 'Showing', search: 'Name contains', any: 'Any' },
  kind: { school: 'School', office: 'Office' } as const,
  status: { listed: 'Listed', delisted: 'Delisted' } as const,
  source: { import: 'Imported', staff: 'Added by staff' } as const,
  columns: { name: 'Name', kind: 'Kind', district: 'District', source: 'Source', status: 'Status', actions: 'Actions' },
  empty: 'Nothing matches.',
  next: 'Next page',
  first: 'Back to the first page',
  rename: 'Rename',
  renameSave: 'Save the name',
  cancel: 'Cancel',
  delist: 'Delist',
  relist: 'List again',
  addHeading: 'Add a workplace',
  addFields: {
    kind: 'Kind',
    name: 'Name (up to 200 characters)',
    district: 'District (as on the list)',
    village: 'Village (optional)',
    blockCode: 'Block code (6 digits, optional)',
    udise: 'UDISE code (11 digits, a school only, optional)',
  },
  addSubmit: 'Add the workplace',
  required: 'A name and a district are needed.',
  saving: 'Saving…',
  saved: 'Saved.',
  generic: 'That could not be saved.',
  validation: VALIDATION,
  errors: {
    'workplace.not_found': 'That workplace is no longer on this Pariwar’s list.',
    'workplace.district_not_found': 'That district is not on this Pariwar’s list — use a district exactly as the list spells it.',
    'workplace.district_mismatch': 'That workplace is in a different district from the request.',
    'workplace.import_managed': 'An imported school is corrected by the next import, not here.',
    'workplace.state_unchanged': 'The workplace is already in that state — reload the list.',
    'workplace.code_taken': 'A school with that UDISE code is already on the list.',
    'workplace.request_not_found': 'That request is no longer in this Pariwar’s queue.',
    'workplace.request_closed': 'That request has changed — the member may have answered or posted again. The queue has been reloaded.',
  } satisfies Record<WorkplaceAdminRefusalCode, string>,
  // A RELIST refused because the row's district left the list (code review round 2) — there is ⛔ district to retype.
  relistDistrictGone: 'This workplace’s district is no longer on the list, so it can’t be listed again.',
};

export const workplaceRequestsEn = {
  nav: 'Workplace requests',
  heading: 'Workplace requests — “my workplace isn’t listed”',
  intro:
    'A member could not find their workplace and typed its name. Find it on the list and suggest it — the member is asked to confirm. Your suggestion changes nothing until the member says yes.',
  noMemberShown: 'The member is not named here — only what they typed, to help you find the place.',
  onlySuperAdminAdds: 'If the workplace is not on the list at all, ask the Super Admin to add it, then suggest it.',
  tabs: { pending: 'Waiting for a suggestion', suggested: 'Waiting for the member' } as const,
  tabsLabel: 'Which requests',
  filters: { district: 'District' },
  loading: 'Loading the requests…',
  loadError: 'The requests could not be loaded.',
  forbidden: 'Only a Pariwar Admin can review these requests.',
  empty: 'No requests here.',
  typed: (name: string) => `Typed: “${name}”`,
  typedErased: 'The typed name was erased.',
  place: (place: string) => `Place: ${place}`,
  typedPlaceErased: 'The typed place was erased.',
  district: (d: string) => `District: ${d}`,
  started: (date: string) => `Started there: ${date}`,
  received: (date: string) => `Received: ${date}`,
  sameName: (n: number) => (n === 1 ? 'One other request typed the same name.' : `${n} other requests typed the same name.`),
  suggestedAs: (name: string) => `Suggested: ${name} — waiting for the member to confirm.`,
  staleSuggestion: 'An earlier suggestion can no longer be used (it was taken off the list). Please suggest again.',
  suggest: 'Suggest a workplace',
  pickerSearch: 'Search the listed workplaces of this district',
  pickerLoading: 'Searching…',
  pickerLoadError: 'The search could not be completed.',
  pickerEmpty: 'Nothing listed in this district matches.',
  pickerResults: (n: number) => (n === 1 ? 'One listed workplace matches.' : `${n} listed workplaces match.`),
  pickerMore: 'More results — refine your search.',
  pickerNote: 'Only this district’s listed workplaces are shown. If the request’s district was just renamed, reload the queue.',
  suggestThis: 'Suggest this one',
  close: 'Close — it names no real workplace',
  cancel: 'Cancel',
  next: 'Next page',
  first: 'Back to the first page',
  saved: 'Saved.',
  generic: 'That could not be saved.',
  validation: VALIDATION,
};

export const campaignEn = {
  heading: 'Ask members to name the people who know them',
  // `-342` call 1's audience (code review round 2 — ⛔ the superseded `-330` SW16 (5) "fewer than three accepted").
  intro:
    'For the days you choose, a card in the app asks members to name the people who know them. It is shown to a member who can use this feature, who has room for one more person (fewer than three asked or accepted), and who has asked nobody since the campaign began. Nothing is sent to anyone’s phone.',
  startsOn: 'From (IST)',
  endsOn: 'Until (IST, at most 30 days)',
  start: 'Start the campaign',
  end: 'End it now',
  listHeading: 'Campaigns',
  empty: 'No campaign yet.',
  loading: 'Loading the campaigns…',
  loadError: 'The campaigns could not be loaded.',
  forbidden: 'Only a Pariwar Admin can run a campaign.',
  next: 'Next page',
  first: 'Back to the first page',
  window: (from: string, to: string) => `${from} to ${to}`,
  status: { scheduled: 'Planned', live: 'Running', finished: 'Finished', ended: 'Ended early' } as const,
  required: 'Choose both dates.',
  saved: 'Saved.',
  generic: 'That could not be saved.',
  validation: VALIDATION,
  errors: {
    'known_people_campaign.window_invalid': 'A campaign runs from today or later, for at most 30 days.',
    'known_people_campaign.overlap': 'Another campaign is already planned for some of those days.',
    'known_people_campaign.not_live': 'That campaign has already ended.',
    'known_people_campaign.not_found': 'That campaign is not in this Pariwar.',
  } satisfies Record<KnownPeopleCampaignRefusalCode, string>,
};

export const stepUpEn = {
  intro: 'This change needs a fresh check. Send a code to your phone and enter it.',
  send: 'Send the code',
  sendError: 'The code could not be sent.',
  sendRateLimited: 'Too many codes were asked for — wait a minute and try again.',
  code: 'Code',
  verify: 'Verify and save',
  verifyError: 'That code was not accepted.',
  // A 429 on VERIFY is ⛔ a judgement of the code (code review round 2) — its own line, in the send line's register.
  verifyRateLimited: 'Too many attempts — wait a few minutes and try again.',
  verifyUnavailable: 'The code could not be checked — try again.',
  cancel: 'Cancel — don’t make this change',
  // The held write, named (code review round 2).
  waiting: (what: string) => `Waiting to save: ${what}`,
  held: {
    add: (name: string) => `add “${name}”`,
    rename: (name: string) => `rename to “${name}”`,
    delist: (name: string) => `delist “${name}”`,
    relist: (name: string) => `list “${name}” again`,
    suggest: (name: string) => `suggest “${name}”`,
    close: (typed: string | null) => (typed !== null ? `close the request for “${typed}”` : 'close this request'),
  },
};
