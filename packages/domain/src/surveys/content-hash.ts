// The tone-review content hash — Story 10.15 (Task 3; AC4, Load-Bearing Decision 5).
//
// SHA-256 hex of the RFC-8785 canonical JSON of the four copy fields PLUS the `questions` array —
// the `bannerContentHash` / `newsContentHash` discipline: a HASH in the sign-off, ⛔ NEVER the raw
// copy and NEVER the raw questions (an audit line carries the hash; the content stays out of the log).
//
// ── ⭐ WHY THE QUESTIONNAIRE IS IN THE HASH, AND WHY THAT MAKES THIS SIMPLER THAN 10.9 ────────
// 10.9's hash covers copy ONLY, and it doubles as a REVISION ORACLE: an edit that changes the hash
// on a PUBLISHED banner invalidates the prior sign-off and requires a fresh non-author review. That
// machinery exists because a published banner's copy can still change.
//
// A published survey's copy and questionnaire CANNOT change (LBD-5 — the only permitted post-publish
// mutation is extending `valid_until`, which is in neither half of the hash). So this hash is a
// ONE-SHOT BINDING: it is computed once, at publish, against content that is frozen from that instant
// onward. ⛔ There is deliberately NO re-sign-after-edit path here, and its absence is not an
// oversight to fill in — building one would require unfreezing the questionnaire, which is the thing
// LBD-5 forbids.
//
// The questionnaire belongs IN the hash rather than beside it because a tone reviewer reviews the
// QUESTIONS as much as the title: "do you support the trustees' decision?" is a leading question, and
// leading questions are exactly what a tone gate is for. A hash over copy alone would let the
// questions change between review and publish while the sign-off still verified.

import { createHash } from 'node:crypto';

import { canonicalJsonStringify } from '../canonical-json.js';
import type { SurveyId } from '../ids/index.js';
import type { SurveyQuestion } from './types.js';

/**
 * The resource locator a survey's tone-review sign-off is bound to (`survey:<surveyId>`) — the
 * `bannerResourceLocator` / `newsResourceLocator` analogue. Keyed to the SURVEY so the gate's
 * resource-bound invariant matches the publish target.
 */
export function surveyResourceLocator(surveyId: SurveyId | string): string {
  return `survey:${surveyId}`;
}

/** The four member-visible copy fields — half of the content-hash input. */
export interface SurveyCopy {
  title: string | null;
  body: string | null;
  titleHi: string | null;
  bodyHi: string | null;
}

/**
 * The canonical content hash binding a tone-review sign-off to the EXACT reviewed content: SHA-256
 * hex over `{title, body, title_hi, body_hi, questions}` in RFC-8785 canonical form.
 *
 * ⚠ The copy keys are emitted SNAKE_CASE (`title_hi`, not `titleHi`) to match the wire and JSONB
 * shape, and `questions` is passed through UNCHANGED — its inner keys are already snake_case
 * (`types.ts`), so no mapping happens here and none can drift. `canonicalJsonStringify` sorts keys,
 * so the hash is stable regardless of the order the caller built the object in.
 */
export function surveyContentHash(copy: SurveyCopy, questions: readonly SurveyQuestion[]): string {
  const canonical = canonicalJsonStringify({
    title: copy.title ?? null,
    body: copy.body ?? null,
    title_hi: copy.titleHi ?? null,
    body_hi: copy.bodyHi ?? null,
    questions,
  });
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

/** Which of the four required copy fields (if any) are absent or blank. */
export function missingSurveyCopyFields(copy: SurveyCopy): string[] {
  const missing: string[] = [];
  if (!copy.title || copy.title.trim() === '') missing.push('title');
  if (!copy.body || copy.body.trim() === '') missing.push('body');
  if (!copy.titleHi || copy.titleHi.trim() === '') missing.push('title_hi');
  if (!copy.bodyHi || copy.bodyHi.trim() === '') missing.push('body_hi');
  return missing;
}
