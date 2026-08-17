// Pure survey status-legality + display-state derivation — Story 10.15 (Task 2; AC1, AC2).
//
// The `nextBannerStatus` (10.9) / `nextPostStatus` (10.5) / `nextTicketState` (10.4) precedent: PURE
// reducers naming the LEGAL transitions so the API layer can reject an illegal one with a typed 409
// BEFORE any write. DB-free → unit-tested exhaustively over every legal AND illegal arm. The DB
// `survey_status` enum only constrains the VALUE domain; THESE functions are the authority on which
// moves are allowed and on what the surface shows.
//
// The tone-review gate, the bilingual requirement, the questionnaire freeze and the window check are
// SEPARATE concerns layered on top by the write path — these helpers are purely structural.

import type { SurveyDisplayState, SurveyStatus } from '../schema/surveys.js';

/**
 * The lifecycle ACTIONS a survey transition may request. Distinct from the STATUS values: an action
 * is the verb the handler dispatches; `nextSurveyStatus` maps (currentStatus, action) → the resulting
 * status, or `null` when the action is illegal from that status.
 *   · `publish` — draft → published
 *   · `close`   — draft → closed (a DISCARD of an unpublished draft) OR published → closed
 */
export const SURVEY_ACTIONS = ['publish', 'close'] as const;
export type SurveyAction = (typeof SURVEY_ACTIONS)[number];

/**
 * The legal (status, action) → next-status map. Every arm not present here is ILLEGAL and returns
 * `null` (fail-closed).
 *
 * `close` is legal from BOTH `draft` and `published`: closing a draft is the DISCARD path (a survey
 * that will never be asked), and closing a published survey is the stop-collecting path.
 *
 * ⛔ `closed` is TERMINAL — there is deliberately NO reopen, and this is not symmetry-for-its-own-sake
 * with 10.9's `retracted`. Reopening a survey would resume collecting answers into an aggregate an
 * admin has ALREADY READ and may have already acted on, silently changing a number someone quoted.
 * To ask again: publish a NEW survey. That is a supersession and it leaves both records intact
 * ([[feedback_supersede_never_reinterpret]]).
 *
 * ⚠ Note what is absent: there is no `expire` action. Expiry is a READ-TIME derivation over the
 * window (AC2 — no scheduler, no sweep, no worker), so it never appears as a transition. A survey
 * past `valid_until` is still `published` in the DB and `expired` on every surface.
 */
const LEGAL_TRANSITIONS: Readonly<Record<SurveyStatus, Partial<Record<SurveyAction, SurveyStatus>>>> = {
  draft: { publish: 'published', close: 'closed' },
  published: { close: 'closed' },
  closed: {},
};

/**
 * PURE legality reducer: the status a survey reaches when `action` is applied from `status`, or
 * `null` when the action is illegal from that status. The API guard calls this pre-write and 409s on
 * `null` (the 10.4 / 10.5 / 10.9 "reducer guard" discipline).
 */
export function nextSurveyStatus(status: SurveyStatus, action: SurveyAction): SurveyStatus | null {
  return LEGAL_TRANSITIONS[status][action] ?? null;
}

/** Is `action` legal from `status`? Thin boolean wrapper over `nextSurveyStatus`. */
export function isLegalSurveyTransition(status: SurveyStatus, action: SurveyAction): boolean {
  return nextSurveyStatus(status, action) !== null;
}

/** The minimum a row must carry for its display state to be derived. */
export interface SurveyWindowRow {
  status: SurveyStatus;
  validFrom: Date;
  validUntil: Date;
}

/**
 * PURE: the display state of a survey at instant `now` (AC2).
 *
 * ⛔ A DERIVATION OVER STORED FIELDS, NEVER A PERSISTED COLUMN
 * ([[project_yogdaan_status_derivation_convention]]). A stored `expired` would be wrong for exactly
 * as long as a sweep lagged — and there is no sweep, by design.
 *
 * `closed` wins over the window (a closed survey is closed whether or not its window has run out —
 * the window is irrelevant once collection has stopped), and `draft` likewise: an unpublished draft
 * whose window has already passed still reads `draft`, because the author has not asked anything yet.
 * Only a `published` row consults the clock:
 *
 *   · `now <  validFrom`                    → `scheduled`
 *   · `validFrom <= now < validUntil`       → `open`
 *   · `now >= validUntil`                   → `expired`
 *
 * ⭐ `valid_from` is INCLUSIVE and `valid_until` is EXCLUSIVE — asserted by boundary tests at EXACTLY
 * `valid_from` (open) and EXACTLY `valid_until` (expired). This is the same predicate the member read
 * filters on and the same one the response WRITE path enforces (AC2: expiry is enforced on the write,
 * not merely hidden from the read), so there is ONE definition of "open" rather than three.
 */
export function deriveSurveyDisplayState(row: SurveyWindowRow, now: Date): SurveyDisplayState {
  if (row.status === 'closed') return 'closed';
  if (row.status === 'draft') return 'draft';
  const t = now.getTime();
  if (t < row.validFrom.getTime()) return 'scheduled';
  if (t < row.validUntil.getTime()) return 'open';
  return 'expired';
}

/**
 * PURE: is this survey accepting responses at `now`? The single predicate behind the member read
 * filter AND the response-write 409 — one definition, two call sites (AC2).
 */
export function isSurveyOpen(row: SurveyWindowRow, now: Date): boolean {
  return deriveSurveyDisplayState(row, now) === 'open';
}
