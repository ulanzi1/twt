// Module-local English copy for the Super Admin's WARNING-REASON LIST (Story 6.23a, NW17) — the console precedent:
// admin chrome copy lives HERE, ⛔ not in @twt/i18n runtime keys. ⛔ No microcopy vocabulary term (Trap 11).

import {
  APPROVAL_WARNING_REASON_LABEL_MAX,
  APPROVAL_WARNING_REASON_WHEN_TO_USE_MAX,
  type ApprovalWarningReasonRefusal,
} from '@twt/contracts';

// `errors` below `satisfies Record<ApprovalWarningReasonRefusal, string>` — the CONTRACTS' list, itself pinned to the
// domain's by the contracts ↔ domain lockstep test. ⇒ a refusal the domain adds fails a test there, then the build here
// until it has words (code review round 4 — round 3's hand-mirrored list here was checked by nothing).

export const approvalWarningReasonsEn = {
  nav: 'Warning reasons',
  heading: 'Warning reasons for approving over a warning',
  intro:
    'Approvers choose one of these reasons when they approve a claim while a warning shows, and write their own note. Each reason shows who added it, when, and when to use it.',
  neverEdited:
    'A reason can be replaced by a newer one, but it is never edited or deleted. A replaced reason stays in the history, and every approval keeps the words that were chosen.',
  staffText: 'These words are staff guidance for approvers — they are not shown to members or families.',
  loading: 'Loading the reasons…',
  loadError: 'The reasons could not be loaded.',
  forbidden: 'Only the Super Admin can manage the warning reasons.',
  activeHeading: 'In use',
  historyHeading: 'Replaced (kept for the record)',
  historyEmpty: 'No reason has been replaced yet.',
  builtIn: 'Built in — every Pariwar has it, and it cannot be replaced.',
  addedBy: (name: string, date: string) => `Added by ${name} on ${date}`,
  replacedBy: (label: string, name: string, date: string) => `Replaced by “${label}” (${name}) on ${date}`,
  replacedOn: (date: string) => `Replaced on ${date}`,
  replaces: (label: string) => `Replaces “${label}”`,
  whenToUse: 'When to use',
  labelField: `Reason (up to ${APPROVAL_WARNING_REASON_LABEL_MAX} characters)`,
  whenToUseField: `When to use this reason (up to ${APPROVAL_WARNING_REASON_WHEN_TO_USE_MAX} characters)`,
  tooLong: `The reason can be up to ${APPROVAL_WARNING_REASON_LABEL_MAX} characters, and when to use it up to ${APPROVAL_WARNING_REASON_WHEN_TO_USE_MAX}.`,
  addHeading: 'Add a reason',
  addSubmit: 'Add the reason',
  replace: 'Replace with a newer reason',
  replaceHeading: (label: string) => `Replace “${label}”`,
  replaceSubmit: 'Save the newer reason',
  cancel: 'Cancel',
  saving: 'Saving…',
  saved: 'Saved.',
  required: 'Both the reason and when to use it are needed.',
  stepUpIntro: 'Confirm it is you: a fresh verification code is needed before this change is saved.',
  stepUpSend: 'Send verification code',
  stepUpCode: 'Enter code',
  stepUpVerify: 'Verify and save',
  // Keyed to WHY (code review round 4) — "send it again" is ⛔ wrong advice on a rate limit, and "not accepted" is ⛔ wrong
  // on an outage.
  stepUpSendError: 'The verification code could not be sent. Please send it again.',
  stepUpSendRateLimited: 'Too many codes were asked for. Wait a few minutes, then send a new one.',
  stepUpVerifyError: 'That code was not accepted. Check it, or send a new one.',
  stepUpVerifyUnavailable: 'The code could not be checked just now. Please try again.',
  errors: {
    invalid_text: 'The reason or its note is blank, too long, or uses a word the Trust does not use. Please reword it.',
    // ⛔ Never "the list has been reloaded" — that refetch can itself fail (code review round 4); say what to DO.
    already_replaced: 'This reason was already replaced. Choose from the list as it stands now.',
    not_found: 'That reason is not in this Pariwar’s list. Choose from the list as it stands now.',
    missing_display: 'A reason is attributed to a named person.',
    code_exhausted: 'Could not generate a unique reason code — please try again.',
  } satisfies Record<ApprovalWarningReasonRefusal, string>,
  // `admin.display_name_missing` — the handler checks the actor's display name FIRST, so this (⛔ not `missing_display`)
  // is the refusal that actually arrives.
  displayNameMissing: 'Your admin account has no display name yet, and every reason names who added it. Ask for one to be set first.',
  generic: 'The change could not be saved.',
} as const;
