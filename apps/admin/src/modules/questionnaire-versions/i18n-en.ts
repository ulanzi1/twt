// Module-local English copy for the QUESTIONNAIRES page (Story 6.33, `2026-10-30-421` QE16) — the console precedent: admin
// chrome copy lives HERE, ⛔ in @twt/i18n runtime keys. The two counsel warnings are QE10's words VERBATIM (AC9).

import type { QuestionnaireVersionKind } from '@twt/contracts';

export type CounselScope = 'this' | 'every';

export const questionnaireVersionsEn = {
  nav: 'Questionnaires',
  heading: 'Questionnaires',
  intro:
    'The questions the neighbours are asked, and the questions the inspector asks the family. A Pariwar Admin proposes a new version, an approver approves it, and the Super Admin makes it live. Every version is kept; a reply or a visit keeps the version it started on.',
  loading: 'Loading the questionnaires…',
  loadError: 'The questionnaires could not be loaded. Please try again.',
  forbidden: 'You do not have access to the questionnaires of this Pariwar.',
  kinds: {
    peer_mesh: "The neighbours' questions",
    ground_inspection: "The inspector's questions for the family",
  } satisfies Record<QuestionnaireVersionKind, string>,
  inForce: (versionId: string | null, source: 'own' | 'all' | 'code' | null): string =>
    versionId === null
      ? 'In force: no version.'
      : `In force: ${versionId} — ${source === 'own' ? "this Pariwar's own version" : source === 'all' ? 'the version for every Pariwar' : 'the version the Trust Panel ruled'}.`,
  /** QE12 R8 — what the resolver passed over. */
  skipped: (versionId: string, reason: 'invalid' | 'stale', serving: string | null): string =>
    `In force: ${versionId} — ${reason === 'invalid' ? 'failed validation' : 'out of date'}, serving ${serving ?? 'no version'}.`,
  versions: 'Versions',
  noVersions: 'No staff-written version yet.',
  stage: {
    code: 'Ruled by the Trust Panel',
    proposed: 'Proposed',
    approved: 'Approved',
    returned: 'Returned',
    withdrawn: 'Withdrawn',
    published: 'Live',
  },
  view: 'View',
  /** RV29 — one accessible name per row (the visible text stays "View"). */
  viewVersion: (versionId: string): string => `View ${versionId}`,
  newVersion: 'Start a new version',
  historyElsewhere: 'Proposed and approved in another Pariwar',
  step: {
    proposed: 'Proposed',
    approved: 'Approved',
    returned: 'Returned',
    withdrawn: 'Withdrawn',
    made_live: 'Made live',
    pariwar_reverted: 'Reverted this Pariwar to the version for every Pariwar',
  },
  forTarget: (target: string | null, thisPariwarId?: string): string =>
    target === null ? 'for every Pariwar' : target === thisPariwarId ? 'for this Pariwar' : `for Pariwar ${target}`,
  direct: 'Added directly by the Super Admin',
  reason: (r: string) => `Reason: ${r}`,
  badge: {
    ruled: 'Ruled (locked)',
    staff: 'Added by staff',
    healthPending: 'Health — counsel pending',
    encrypted: 'Answers encrypted',
    outOfDate: 'Out of date — rebase',
  },
  change: { new: 'New', changed: 'Changed', unchanged: 'Unchanged', removed: 'Removed' },
  hindi: 'Hindi',
  warningsHeading: 'Please note',
  problemsHeading: 'This version failed a check',
  // ── actions ──
  approve: 'Approve',
  returnIt: 'Return',
  returnNote: 'Why it is returned (required)',
  withdraw: 'Withdraw',
  makeLive: 'Make live',
  revert: 'Revert this Pariwar to the version for every Pariwar',
  hindiTick: 'I have read every Hindi line',
  classificationTick: 'I have checked which questions are about health',
  scopeThis: 'This Pariwar',
  scopeAll: 'All Pariwars',
  /** RV29 — the radio groups' names (a `<legend>` each). */
  scopeLegend: 'Make this version live for',
  directScopeLegend: 'Make this new version live for',
  keepingOwn: (n: number, names: string): string =>
    n === 0
      ? 'No Pariwar keeps its own version.'
      : n === 1
        ? `1 Pariwar keeps its own version: ${names}`
        : `${n} Pariwars keep their own version: ${names}`,
  /** RV13 — the list is read BEFORE the confirm (QE7 (a)); the confirm waits for it. */
  keepingLoading: 'Finding the Pariwars that keep their own version…',
  keepingError: 'The Pariwars that keep their own version could not be listed, so this cannot be made live for every Pariwar yet. Please try again.',
  /** RP13 — the failed list can be asked for again from where the failure is said. */
  keepingRetry: 'Try again',
  baseMoved:
    'Another version was made live since this one was started. Making this one live replaces it — its changes are not in this version.',
  baseMovedAck: 'I understand — make this version live anyway',
  /** QE10 — VERBATIM, per kind (AC9). */
  counselWarning: (kind: QuestionnaireVersionKind, scope: CounselScope): string =>
    kind === 'peer_mesh'
      ? `This version has a health question that counsel has not yet cleared. Until counsel's basis is recorded, the neighbours in ${scope === 'this' ? 'this Pariwar' : 'every Pariwar'} will not be texted and the question will not be shown.`
      : `This version has a health question that counsel has not yet cleared. Until counsel's basis is recorded, the question will not be shown at the visit in ${scope === 'this' ? 'this Pariwar' : 'every Pariwar'}.`,
  // ── the editor ──
  editorHeading: 'A new version',
  editorFrom: (versionId: string) => `Started from ${versionId}. The questions the Trust Panel ruled are shown locked.`,
  /** QE8 C12 — guidance (⛔ a check: it cannot be checked by a machine). */
  /** QE5 — shown when the Trust Panel's CURRENT questions could not be read (the base's are shown instead). */
  ruledUnavailable: 'The Trust Panel’s current questions could not be loaded; the ones shown are from the version this started from.',
  guidance:
    'Ask about the member who died — never about the person answering (a neighbour or the family). Every question you add is optional, its answers are stored encrypted, and it never holds, flags or refuses a claim.',
  addQuestion: 'Add a question',
  remove: 'Remove',
  moveUp: 'Move up',
  moveDown: 'Move down',
  key: 'Key (lower-case letters, digits and _)',
  /** RV29 — a name for each question's group (visually hidden) and for each repeated option field. */
  questionLegend: (n: number, key: string): string => `Question ${n}${key.trim() === '' ? '' : ` — ${key.trim()}`}`,
  kindLabel: 'Kind',
  kindOption: { single: 'One choice', multi: 'Several choices', yes_no: 'Yes or no' },
  questionEn: 'Question (English) — write {member} for the member’s name',
  questionHi: 'Question (Hindi)',
  optionCode: (q: number, o: number): string => `Code — question ${q}, option ${o}`,
  optionEn: (q: number, o: number): string => `Option (English) — question ${q}, option ${o}`,
  optionHi: (q: number, o: number): string => `Option (Hindi) — question ${q}, option ${o}`,
  standsAlone: 'Stands alone',
  standsAloneFor: (q: number, o: number): string => `Stands alone — question ${q}, option ${o}`,
  addOption: 'Add an option',
  showAfter: 'Shown only after the answer to (optional)',
  showAfterCodes: 'Codes (comma-separated)',
  healthLabel: 'This question is about health (it is not shown until counsel’s basis is recorded)',
  propose: 'Propose this version',
  makeLiveDirect: 'Make live directly',
  directReason: 'Reason (required)',
  cancel: 'Cancel',
  saved: 'Saved.',
  // ── step-up (the ApprovalWarningReasonsPage precedent) ──
  stepUpIntro: 'Making a version live changes what families are asked. Please confirm it is you.',
  stepUpSend: 'Send me a code',
  stepUpSendError: 'The code could not be sent. Please try again.',
  stepUpCode: 'Code',
  stepUpVerify: 'Confirm',
  stepUpVerifyError: 'That code was not accepted.',
  errors: {
    'questionnaire.not_found': 'This version is not available in this Pariwar.',
    'questionnaire.base_invalid': 'The version it was started from is not available.',
    'questionnaire.not_approvable': 'This version can no longer be approved or returned.',
    'questionnaire.not_withdrawable': 'This version can no longer be withdrawn.',
    'questionnaire.not_publishable': 'This version cannot be made live there.',
    'questionnaire.base_moved': 'Another version was made live since this one was started.',
    'questionnaire.ruled_base_moved': 'The Trust Panel’s questions changed since this version was started. Start a new version from the one in force.',
    'questionnaire.nothing_to_revert': 'This Pariwar has no own version to revert.',
    'questionnaire.hindi_review_required': 'Please confirm you have read every Hindi line.',
    'questionnaire.classification_attestation_required': 'Please confirm you have checked which questions are about health.',
    'questionnaire.not_author': 'Only the person who proposed it can withdraw it.',
    'questionnaire.definition_invalid': 'This version of the questions is not allowed:',
    /** RV21 — the API's zod refusal (400): the fields it names follow. */
    'request.validation': 'Some fields were not accepted:',
  } as Record<string, string>,
  genericError: 'That did not work. Please try again.',
};
