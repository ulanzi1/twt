// Pure view-model derivations for the Survey/Poll console — Story 10.15 (Task 8; AC1, AC7).
//
// Everything here is PURE and DB-free so the console's decisions are unit-testable without a render.
// ⚠ Unit-testing these is NOT sufficient on its own: prose asserted only at the view-model reaches
// nobody (the 10.10 AC9 lesson), so the results screen additionally carries RENDER tests.
//
// Sibling-module discipline ([[feedback_story_validate_footguns]]): this is the SURVEYS module. It is
// not a tab inside `banners` or `news-blog`, it shares no component with them, and the three consoles
// look similar enough that cross-wiring would go unnoticed.

import { SURVEY_TARGETABLE_AUDIENCE_SCOPES, type SurveyAudienceScope, type SurveyDisplayState } from '@twt/contracts';

/** The stored lifecycle status (three values — the other display states are derived). */
export type SurveyStatus = 'draft' | 'published' | 'closed';

/** Sentinel id for an editor holding an unsaved new draft. */
export const UNSAVED_DRAFT_ID = '__unsaved__';

/** Human label for a derived display state. */
export function displayStateLabel(state: SurveyDisplayState): string {
  switch (state) {
    case 'draft':
      return 'Draft';
    case 'scheduled':
      return 'Scheduled';
    case 'open':
      return 'Open';
    case 'expired':
      return 'Closed by date';
    case 'closed':
      return 'Closed';
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

/** Tailwind-ish class hints per display state, so `open` reads differently from `expired`. */
export function displayStateClasses(state: SurveyDisplayState): string {
  switch (state) {
    case 'open':
      return 'state-open';
    case 'scheduled':
      return 'state-scheduled';
    case 'expired':
      return 'state-expired';
    case 'closed':
      return 'state-closed';
    case 'draft':
    default:
      return 'state-draft';
  }
}

/** Only a draft may be published (`nextSurveyStatus` is the server-side authority; this mirrors it). */
export function canPublish(status: SurveyStatus): boolean {
  return status === 'draft';
}

/** A draft (discard) or a published survey (stop collecting) may be closed. `closed` is terminal. */
export function canClose(status: SurveyStatus): boolean {
  return status === 'draft' || status === 'published';
}

/**
 * ⭐ WHAT A PUBLISHED SURVEY STILL ALLOWS — the LBD-5 freeze, in the console.
 *
 * A draft is fully editable. A published survey may have ONLY its `valid_until` extended; a closed
 * one is frozen entirely. The editor uses this to DISABLE the frozen inputs rather than letting an
 * admin type a change that the server will 409 — an editor that accepts input it knows will be
 * rejected is a worse explanation than a disabled field with a reason next to it.
 */
export function editableFields(status: SurveyStatus): 'all' | 'valid-until-only' | 'none' {
  if (status === 'draft') return 'all';
  if (status === 'published') return 'valid-until-only';
  return 'none';
}

/** Is this survey editable at all? */
export function isEditable(status: SurveyStatus): boolean {
  return editableFields(status) !== 'none';
}

/**
 * Can this audience scope actually reach anyone today?
 *
 * ⚠ ⭐ `public` IS NOT TARGETABLE HERE, and that is the opposite of the banners console — a survey
 * has no unauthenticated respondent (LBD-7). Read from the shared `@twt/contracts` mirror, which a
 * sync-guard pins to the domain predicate's own list, so this indicator can never drift from what
 * the read actually does.
 */
export function isTargetableAudience(scope: SurveyAudienceScope): boolean {
  return SURVEY_TARGETABLE_AUDIENCE_SCOPES.includes(scope);
}

/**
 * ⭐ The percentage a bar should render for one option.
 *
 * Denominated in `answered_count` for THAT question — ⛔ never `response_count`. A member who skipped
 * the question did not vote against every option, and denominating in the total responses would show
 * a unanimous answer as a minority whenever anyone skipped. Returns 0 (not NaN) when nobody answered.
 */
export function optionSharePct(count: number, answeredCount: number): number {
  if (answeredCount <= 0) return 0;
  return Math.round((count / answeredCount) * 100);
}

/**
 * ⭐ HOW THE THRESHOLD IS DESCRIBED — this is Load-Bearing Decision 1 rendered as copy, and the
 * wording is the control, not decoration.
 *
 * A survey is ADVISORY: it INFORMS a decision and never MAKES one. So the label must never say the
 * survey "passed", "carried", "was approved" or "reached quorum" — that last word is a Deed term for
 * the TRUSTEE quorum (Cl. 19) and members hold no governance vote at all. `null` is reported as
 * "no target was set" rather than "not met": a target nobody set was never missed.
 */
export function thresholdLabel(responseCount: number, threshold: number | null, met: boolean | null): string {
  if (threshold === null || met === null) {
    return `${responseCount} responses so far. No response target was set for this survey.`;
  }
  return met
    ? `${responseCount} responses — the response target of ${threshold} has been reached. This is a participation figure only; a survey gathers views and does not decide anything.`
    : `${responseCount} of the ${threshold} responses hoped for. This is a participation figure only; a survey gathers views and does not decide anything.`;
}

/**
 * Map a server error code to guidance the author can act on.
 *
 * ⚠ `survey.frozen_field` is the one an admin will hit most, and a bare "conflict" would leave them
 * re-trying the same edit — so it names the remedy that actually exists (close and publish a new one).
 */
export function surveyErrorGuidance(code: string | undefined): string | null {
  switch (code) {
    case 'survey.frozen_field':
      return 'This survey is published, so its questions, audience and wording are fixed. Members have already been asked — changing the question now would silently turn every answer already given into an answer to something else. To ask something different, close this survey and publish a new one.';
    case 'survey.window_invalid':
      return 'A published survey’s closing date can only be moved later, never earlier. To stop collecting responses now, close the survey.';
    case 'survey.invalid_state':
      return 'This survey has moved on since the page was loaded — reload and try again. A closed survey cannot be reopened.';
    case 'survey.bilingual_required':
      return 'Both English and Hindi copy are required before a survey can be published.';
    case 'survey.questionnaire_invalid':
      return 'A question does not meet the rules — check that every question has text in both languages, that choice questions have between 2 and 10 options, and that the survey has at least one question.';
    case 'survey.audience_unsupported':
      return 'That audience cannot be used for a survey. Only “All members” and “A state” can be targeted — a survey needs a signed-in member to answer it, so there is no public audience.';
    case 'survey.audience_value_required':
      return 'Choose which state this survey is for.';
    case 'tone_review.required':
      return 'A survey must be reviewed and published by someone other than the person who wrote it. Ask another admin to publish it.';
    default:
      return null;
  }
}
