// nextSurveyStatus + deriveSurveyDisplayState — Story 10.15 (AC1, AC2). Pure, DB-free.
//
// Exhaustive over every (status, action) pair including the ILLEGAL ones — a legality reducer that is
// only tested on its happy arms proves nothing about what it refuses.

import { describe, expect, it } from 'vitest';

import { SURVEY_STATUSES, type SurveyStatus } from '../../src/schema/surveys.js';
import {
  SURVEY_ACTIONS,
  deriveSurveyDisplayState,
  isLegalSurveyTransition,
  isSurveyOpen,
  nextSurveyStatus,
} from '../../src/surveys/status.js';

const FROM = new Date('2026-09-01T00:00:00.000Z');
const UNTIL = new Date('2026-09-30T00:00:00.000Z');

function row(status: SurveyStatus) {
  return { status, validFrom: FROM, validUntil: UNTIL };
}

describe('nextSurveyStatus', () => {
  it('allows draft --publish--> published', () => {
    expect(nextSurveyStatus('draft', 'publish')).toBe('published');
  });

  it('allows draft --close--> closed (the discard path)', () => {
    expect(nextSurveyStatus('draft', 'close')).toBe('closed');
  });

  it('allows published --close--> closed', () => {
    expect(nextSurveyStatus('published', 'close')).toBe('closed');
  });

  // ⛔ TERMINAL, and NOT symmetry-for-its-own-sake: reopening would resume collecting into an
  // aggregate an admin has already read and may have quoted.
  it('makes closed terminal — no action escapes it, and there is no reopen', () => {
    for (const action of SURVEY_ACTIONS) {
      expect(nextSurveyStatus('closed', action)).toBeNull();
    }
  });

  it('refuses re-publishing a published survey', () => {
    expect(nextSurveyStatus('published', 'publish')).toBeNull();
  });

  it('returns null for every pair not in the legal map', () => {
    const legal = new Set(['draft:publish', 'draft:close', 'published:close']);
    for (const status of SURVEY_STATUSES) {
      for (const action of SURVEY_ACTIONS) {
        const expected = legal.has(`${status}:${action}`);
        expect(isLegalSurveyTransition(status, action)).toBe(expected);
      }
    }
  });
});

describe('deriveSurveyDisplayState', () => {
  it('reports draft for an unpublished survey regardless of the clock', () => {
    // The author has not asked anything yet — a draft whose window has already run out is still a
    // draft, not "expired".
    expect(deriveSurveyDisplayState(row('draft'), new Date('2026-10-15T00:00:00.000Z'))).toBe('draft');
    expect(deriveSurveyDisplayState(row('draft'), new Date('2026-08-01T00:00:00.000Z'))).toBe('draft');
  });

  it('reports closed for a closed survey regardless of the clock', () => {
    expect(deriveSurveyDisplayState(row('closed'), new Date('2026-09-15T00:00:00.000Z'))).toBe('closed');
  });

  it('reports scheduled before the window opens', () => {
    expect(deriveSurveyDisplayState(row('published'), new Date('2026-08-31T23:59:59.999Z'))).toBe('scheduled');
  });

  it('reports open inside the window', () => {
    expect(deriveSurveyDisplayState(row('published'), new Date('2026-09-15T00:00:00.000Z'))).toBe('open');
  });

  it('reports expired after the window', () => {
    expect(deriveSurveyDisplayState(row('published'), new Date('2026-10-01T00:00:00.000Z'))).toBe('expired');
  });

  // ⭐ THE BOUNDARY PAIR (AC2): valid_from INCLUSIVE, valid_until EXCLUSIVE. Asserted at EXACTLY the
  // two instants, not near them — an off-by-one here silently opens or closes a survey a moment early.
  it('treats valid_from as INCLUSIVE — exactly at valid_from the survey is open', () => {
    expect(deriveSurveyDisplayState(row('published'), FROM)).toBe('open');
    expect(isSurveyOpen(row('published'), FROM)).toBe(true);
  });

  it('treats valid_until as EXCLUSIVE — exactly at valid_until the survey is expired', () => {
    expect(deriveSurveyDisplayState(row('published'), UNTIL)).toBe('expired');
    expect(isSurveyOpen(row('published'), UNTIL)).toBe(false);
  });

  it('one millisecond before valid_until is still open', () => {
    expect(isSurveyOpen(row('published'), new Date(UNTIL.getTime() - 1))).toBe(true);
  });
});
