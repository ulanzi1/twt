// English console-chrome resolver for the family-memorial REVIEW module (Story 11b.4, Task 7 — AC9).
//
// The admin console is ENGLISH-FACING — it resolves chrome KEYS locally to English (the news-blog / helpdesk per-module
// `i18n-en.ts` precedent). ⛔ The family's words are CONTENT, never chrome: they are shown as stored, ⛔ translated,
// ⛔ resolved through here. The four reasons are the epic's grounds only (`-391` Confirm 2 A) — ⛔ no catch-all.

import type { MemorialDecisionProblem, MemorialReviewReason } from '@twt/contracts';

const EN: Record<string, string> = {
  'memorial.title': 'Family memorials',
  'memorial.subtitle':
    'What a family has written for a member who died, sent with the nominee’s permission. You may approve it, leave out a part (each with its reason), or not approve it — you can never change the family’s words.',
  'memorial.nav': 'Family memorials',
  'memorial.view.pending': 'With the Trust',
  'memorial.view.decided': 'Decided',
  'memorial.list.empty.pending': 'No memorial is waiting for review.',
  'memorial.list.empty.decided': 'No decided memorial yet.',
  'memorial.list.loading': 'Loading memorials…',
  'memorial.list.error': 'Could not load memorials.',
  'memorial.list.sent': 'Sent',
  // The Decided tab's date line, by the row's state (W9): a family withdrawal and a withdrawn approval are ⛔ decisions.
  'memorial.list.decided': 'Decided',
  'memorial.list.withdrawn': 'Withdrawn',
  'memorial.list.approvalWithdrawn': 'Approval withdrawn',
  'memorial.list.takenDown': 'Taken down',
  'memorial.list.member': 'Member who died',
  'memorial.list.state': 'State',
  'memorial.list.open': 'Open',
  'memorial.list.loadMore': 'Load more',
  'memorial.list.loadingMore': 'Loading more…',
  'memorial.noAccess': 'You do not have access to family memorials in this Pariwar. Memorials are reviewed by the Trustee Panel.',
  'memorial.detail.loading': 'Loading…',
  'memorial.detail.error': 'Could not load this memorial.',
  'memorial.detail.notFound': 'This memorial could not be found.',
  'memorial.detail.back': 'Back to the queue',
  'memorial.detail.history': 'Every version the family sent (oldest first)',
  'memorial.detail.versionNo': 'Version',
  'memorial.detail.versionOf': 'of',
  'memorial.detail.version': 'Sent',
  'memorial.detail.thisVersion': 'This version',
  'memorial.detail.words': 'The family’s words, as sent',
  'memorial.detail.unavailable': 'The stored words could not be read right now.',
  'memorial.detail.photo': 'Photo',
  'memorial.detail.altText': 'Description of the photo, as sent',
  'memorial.detail.asApproved': 'As approved',
  'memorial.detail.omitted': '[left out]',
  'memorial.detail.photoLeftOut': 'The photo (and its description) was left out.',
  'memorial.detail.decision': 'Decision',
  'memorial.detail.decidedBy': 'Decided by',
  'memorial.detail.internalNote': 'Internal note (never shown to the family)',
  'memorial.detail.withdrawal': 'Withdrawn',
  'memorial.detail.withdrawnByFamily': 'Withdrawn by the family before review.',
  'memorial.detail.withdrawnByTrust': 'The Trust withdrew its approval.',
  // Story 11b.4a (AC12) — the helpline's take-down; the time follows it.
  'memorial.detail.withdrawnByHelpline': 'Taken down at the nominee’s request',
  'memorial.detail.permission': 'Permission given at sending',
  'memorial.detail.bidiNotice': 'Marked ⟦BIDI⟧: a hidden text-direction control in the family’s text. It is shown so you read what is stored.',
  'memorial.action.approved': 'Approve',
  'memorial.action.approved_with_omissions': 'Approve, leaving out a part',
  'memorial.action.not_approved': 'Do not approve',
  'memorial.decide.title': 'Your decision',
  'memorial.decide.selectHint':
    'Choose each sentence to leave out and the reason for it. This is only an aid — the words themselves are never edited.',
  'memorial.decide.sentencesBody': 'Sentences of the words',
  'memorial.decide.sentencesAlt': 'Sentences of the photo description',
  'memorial.decide.leaveOut': 'Leave out',
  'memorial.decide.reasonFor': 'Reason',
  'memorial.decide.photoLeftOut': 'Leave out the photo (and its description)',
  'memorial.decide.reasonCode': 'Reason for not approving',
  'memorial.decide.chooseReason': 'Choose a reason',
  'memorial.decide.internalNote': 'Internal note — optional; never shown to the family',
  'memorial.decide.submit': 'Record decision',
  'memorial.decide.recorded': 'Decision recorded.',
  'memorial.decide.error': 'Could not record this decision. Please reload and try again.',
  'memorial.decide.alreadyDone': 'This version can no longer be decided — it may have been decided, replaced or withdrawn. Reload to see it.',
  'memorial.withdraw.title': 'Withdraw the Trust’s approval',
  'memorial.withdraw.hint': 'Only for one of the four reasons below. The family is told the reason and may send a new version.',
  'memorial.withdraw.target': 'This withdraws the approval of',
  'memorial.withdraw.reason': 'Reason',
  'memorial.withdraw.internalNote': 'Internal note — optional; never shown to the family',
  'memorial.withdraw.submit': 'Withdraw approval',
  // The two answers of a withdrawal NAME the version they are about ("{n}"): the page can hold the answer for one version
  // beside the form for the next (v1 and v2 both approved — the target moves to v1 once v2's is gone), so an answer that
  // named no version could be read as being about the form beside it. The un-numbered texts are the fallback for a version
  // that is not in the chain (never expected).
  'memorial.withdraw.recorded': 'Approval withdrawn.',
  'memorial.withdraw.recordedFor': 'Approval of Version {n} withdrawn.',
  'memorial.withdraw.error': 'Could not withdraw this approval. Please reload and try again.',
  'memorial.withdraw.errorFor': 'Could not withdraw the approval of Version {n}. Please reload and try again.',
  'memorial.state.none': 'Nothing sent',
  'memorial.state.with_the_trust': 'With the Trust',
  'memorial.state.approved': 'Approved',
  'memorial.state.approved_with_omissions': 'Approved, with a part left out',
  'memorial.state.not_approved': 'Not approved',
  'memorial.state.withdrawn': 'Withdrawn by the family',
  'memorial.state.approval_withdrawn': 'Approval withdrawn by the Trust',
  'memorial.state.taken_down': 'Taken down at the nominee’s request',
  'memorial.reason.attacks_someone_named': 'A personal attack on someone named',
  'memorial.reason.accuses_someone_of_wrongdoing': 'Accuses someone of wrongdoing',
  'memorial.reason.against_the_law': 'Against the law',
  'memorial.reason.identifies_a_child': 'Names or shows a child',
};

/**
 * Why a decision's choices cannot be recorded — ONE complete sentence per problem the shared validator can name (the
 * browser pre-check and the server's `400 memorial_review.invalid_omissions` carry the same `MemorialDecisionProblem`).
 * `Record<MemorialDecisionProblem, …>`: a problem added to the contract does not compile here until it has its sentence.
 * ⚠ Each stands ALONE — ⛔ no lead-in to join it to, so ⛔ no dangling colon.
 */
const PROBLEM_SENTENCES: Record<MemorialDecisionProblem, string> = {
  action_shape: 'The choices do not match the decision you chose. Check them and try again.',
  photo_left_out_without_photo: 'This version has no photo, so there is no photo to leave out.',
  alt_text_span_with_photo_left_out:
    'The photo’s description goes with the photo. Leave out the photo, or parts of its description, but not both.',
  alt_text_span_without_alt_text: 'This version has no photo description, so no part of one can be left out.',
  span_empty: 'A chosen part is empty. Choose a sentence that has words in it.',
  span_out_of_range: 'A chosen part is outside the family’s words. Reload the page and choose again.',
  span_order: 'Two chosen parts touch. Give them the same reason so they are left out together.',
  span_not_grapheme_boundary: 'A chosen part cuts through a letter. Choose whole sentences.',
  span_blank: 'A chosen part has no visible words. Choose a sentence that has words in it.',
  span_crosses_paragraph: 'A chosen part runs across a paragraph break. Choose parts that sit inside one paragraph.',
  nothing_left: 'Nothing of the words would be left. Choose “Do not approve” instead.',
  alt_text_nothing_left:
    'Nothing of the photo’s description would be left while the photo stays. Leave out the photo instead — it takes its description with it.',
};

/** A problem this build does not know (a newer server) — still a complete sentence, never a lead-in with nothing after it. */
const PROBLEM_UNKNOWN = 'These choices could not be recorded. Reload the page, check them and try again.';

/** The sentence for a `MemorialDecisionProblem`; anything else (missing, unknown, not a string) gets the generic one. */
export function problemSentence(problem: unknown): string {
  return typeof problem === 'string' && Object.prototype.hasOwnProperty.call(PROBLEM_SENTENCES, problem)
    ? PROBLEM_SENTENCES[problem as MemorialDecisionProblem]
    : PROBLEM_UNKNOWN;
}

export function resolveEn(key: string): string {
  return EN[key] ?? key;
}

/** What a withdrawal answered, naming the version (1-based place in the chain) it was about; `null` ⇒ the un-numbered text. */
export function withdrawAnswer(kind: 'recorded' | 'error', versionNo: number | null): string {
  return versionNo === null
    ? resolveEn(`memorial.withdraw.${kind}`)
    : resolveEn(`memorial.withdraw.${kind}For`).replace('{n}', String(versionNo));
}

export function reasonLabel(reason: MemorialReviewReason): string {
  return resolveEn(`memorial.reason.${reason}`);
}
