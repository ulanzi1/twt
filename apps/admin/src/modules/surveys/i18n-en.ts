// English console-chrome resolver for the Survey/Poll admin module (Story 10.15, Task 8).
//
// The admin console is ENGLISH-FACING — it resolves chrome KEYS locally to English (the banners /
// news-blog / helpdesk per-module `i18n-en.ts` precedent). The SURVEY's OWN bilingual copy
// (title/body + title_hi/body_hi) and its QUESTIONS are member-facing CONTENT, authored in the editor
// and validated in the domain — NOT this chrome, and NOT a packages/i18n catalog key.
//
// Sibling-module discipline ([[feedback_story_validate_footguns]]): this is the surveys module,
// distinct from banners and news-blog — do not cross-wire their components or their strings.
//
// ── ⛔ THE WORD `quorum` DOES NOT APPEAR IN THIS FILE, AND MUST NOT (LBD-1) ───────────────────
// FR-58 calls the threshold a "quorum threshold". In this project `quorum` already names the TRUSTEE
// quorum (trust-deed.md:227, Deed Cl. 19) and members hold no governance vote under the Deed or the
// Niyamavali. Nor does any string here say a survey "decides", "approves", "ratifies", "passes",
// "carries" or "votes". A survey GATHERS VIEWS. The Story 2.2 tone gate is the enforcement point and
// the microcopy gate is the automated floor; this file is where the discipline is actually written.

const EN: Record<string, string> = {
  'survey.title': 'Surveys & polls',
  'survey.subtitle':
    'Ask members what they think. A survey opens when the clock reaches its start date and stops accepting responses at its end date — nothing needs to be run. Every survey goes through a non-author tone review before it can be published.',
  // ⭐ The LBD-1 statement, on the page itself rather than only in a code comment.
  'survey.advisoryNotice':
    'A survey gathers views. It does not decide anything, and its results do not bind any decision.',
  'survey.new': 'New survey',
  'survey.filter.all': 'All states',
  'survey.list.empty': 'No surveys yet. Create the first one.',
  'survey.list.error': 'Could not load surveys. Try refreshing the page.',
  'survey.page.prev': 'Previous',
  'survey.page.next': 'Next',

  // [Review][Patch] — code review of 10-15-survey-poll (2026-08-17): client-side validation messages
  // for `save()` — both used to fail silently (an empty window no-opped the button; a bad threshold
  // was silently coerced to `null`) with no feedback at all.
  'survey.error.windowRequired': 'Enter both an open-from and an open-until date before saving.',
  'survey.error.thresholdInvalid': 'Responses hoped for must be a whole number of 1 or more, or left blank.',

  'survey.field.title': 'Title (English)',
  'survey.field.body': 'Description (English)',
  'survey.field.titleHi': 'Title (Hindi)',
  'survey.field.bodyHi': 'Description (Hindi)',
  'survey.field.audience': 'Who is being asked',
  'survey.field.audienceValue': 'Which state',
  'survey.field.validFrom': 'Open from',
  'survey.field.validUntil': 'Open until',
  'survey.field.responseThreshold': 'Responses hoped for (optional)',

  'survey.questions.heading': 'Questions',
  'survey.questions.add': 'Add question',
  'survey.questions.remove': 'Remove question',
  'survey.questions.empty': 'No questions yet. A survey needs at least one question before it can be published.',
  'survey.question.text': 'Question (English)',
  'survey.question.textHi': 'Question (Hindi)',
  'survey.question.type': 'Answer type',
  'survey.question.type.single_choice': 'Choose one',
  'survey.question.type.multi_choice': 'Choose any number',
  'survey.question.type.free_text': 'Written answer',
  'survey.option.add': 'Add option',
  'survey.option.remove': 'Remove option',
  'survey.option.text': 'Option (English)',
  'survey.option.textHi': 'Option (Hindi)',

  'survey.action.create': 'Create survey',
  'survey.action.save': 'Save',
  'survey.action.publish': 'Publish',
  'survey.action.close': 'Close survey',
  'survey.action.cancel': 'Cancel',
  'survey.action.viewResults': 'View results',
  'survey.action.backToList': 'Back to surveys',

  'survey.results.heading': 'Results',
  'survey.results.loading': 'Loading results…',
  'survey.results.error': 'Could not load the results. Try refreshing the page.',
  'survey.results.noResponses': 'Nobody has responded yet.',
  'survey.results.answeredCount': 'answered this question',
  'survey.results.showFreeText': 'Show written answers',
  'survey.results.hideFreeText': 'Hide written answers',
  'survey.results.freeTextEmpty': 'No written answers to this question yet.',

  // ⭐ These three are the LBD-3 statement in the UI. An admin must understand that "we cannot tell
  // you who said what" is a DESIGN PROPERTY, not a missing feature they should ask for.
  'survey.results.anonymityNote':
    'Written answers are shown without any indication of who wrote them, and they are listed in no fixed order. There is no way to see how a particular member answered — this surface cannot show that, by design.',
  'survey.results.aggregateNote':
    'These are counts of how members answered. Individual responses are not shown and are not linked to anyone.',
  'survey.results.exportNote': 'Written answers cannot be exported.',

  'survey.hint.bilingual': 'Both English and Hindi copy are required before a survey can be published.',
  'survey.hint.author': 'You cannot publish a survey you wrote yourself — another admin must do it.',
  // ⭐ The LBD-5 freeze, explained where the author meets it.
  'survey.hint.frozen':
    'This survey is published, so its questions, audience and wording are now fixed. Members have already been asked, and changing a question would turn every answer already given into an answer to something else. Only the closing date can be moved, and only later.',
  'survey.hint.terminal': 'This survey is closed. A closed survey cannot be reopened — to ask again, publish a new one.',
  'survey.hint.notTargetable':
    'This audience cannot be used for a survey. Only “All members” and “A state” can be targeted — answering requires a signed-in member, so there is no public audience.',
  // ⭐ The LBD-1 statement again, at the exact field FR-58 called a "quorum threshold".
  'survey.hint.responseThreshold':
    'A participation figure only. It changes nothing: the survey opens, closes and reports the same way whether or not this number is reached, and reaching it does not approve or decide anything.',
  'survey.hint.oneResponse': 'Each member may answer once. A submitted answer cannot be changed.',
};

export function resolveEn(key: string): string {
  return EN[key] ?? key;
}
