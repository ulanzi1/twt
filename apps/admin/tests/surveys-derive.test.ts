// Survey console view-model derivations (Story 10.15, Task 8/11). Pure, DB-free, render-free.
//
// ⚠ These are NECESSARY BUT NOT SUFFICIENT. Prose asserted only at the view-model reaches nobody
// (the 10.10 AC9 lesson) — `surveys-page.test.tsx` asserts the same sentences at the RENDER.

import { describe, expect, it } from 'vitest';

import {
  canClose,
  canPublish,
  displayStateLabel,
  editableFields,
  isEditable,
  isTargetableAudience,
  optionSharePct,
  surveyErrorGuidance,
  thresholdLabel,
} from '../src/modules/surveys/derive.js';
import { resolveEn } from '../src/modules/surveys/i18n-en.js';

describe('lifecycle gating', () => {
  it('only a draft may be published', () => {
    expect(canPublish('draft')).toBe(true);
    expect(canPublish('published')).toBe(false);
    expect(canPublish('closed')).toBe(false);
  });

  it('a draft or a published survey may be closed; closed is terminal', () => {
    expect(canClose('draft')).toBe(true);
    expect(canClose('published')).toBe(true);
    expect(canClose('closed')).toBe(false);
  });

  // ⭐ The LBD-5 freeze, as the console applies it.
  it('a draft is fully editable, a published survey only its closing date, a closed one not at all', () => {
    expect(editableFields('draft')).toBe('all');
    expect(editableFields('published')).toBe('valid-until-only');
    expect(editableFields('closed')).toBe('none');
    expect(isEditable('closed')).toBe(false);
  });
});

describe('audience targetability', () => {
  it('members-all and state are targetable', () => {
    expect(isTargetableAudience('members-all')).toBe(true);
    expect(isTargetableAudience('state')).toBe(true);
  });

  // ⭐ THE LBD-7 INVERSION, at the console. The banners console shows `public` as targetable; this
  // one must not — a survey has no unauthenticated respondent.
  it('public is NOT targetable — the OPPOSITE of the banners console', () => {
    expect(isTargetableAudience('public')).toBe(false);
  });

  it('role and cohort are not targetable', () => {
    expect(isTargetableAudience('role')).toBe(false);
    expect(isTargetableAudience('cohort')).toBe(false);
  });
});

describe('optionSharePct', () => {
  // ⭐ Denominated in the QUESTION's answered_count, not the survey's response_count: a member who
  // skipped did not vote against every option.
  it('denominates in answered_count', () => {
    expect(optionSharePct(3, 4)).toBe(75);
    expect(optionSharePct(4, 4)).toBe(100);
  });

  it('returns 0 rather than NaN when nobody answered', () => {
    expect(optionSharePct(0, 0)).toBe(0);
  });
});

// ⭐ LBD-1 — the threshold copy IS the control, not decoration.
describe('thresholdLabel', () => {
  const FORBIDDEN = ['quorum', 'passed', 'carried', 'approved', 'ratified', 'decided', 'vote'];

  it('reports "no target was set" for null — never "not met"', () => {
    const label = thresholdLabel(4, null, null);
    expect(label).toContain('No response target was set');
    expect(label.toLowerCase()).not.toContain('not met');
  });

  it('describes a met threshold as PARTICIPATION, never as a verdict', () => {
    const label = thresholdLabel(25, 20, true);
    expect(label).toContain('participation figure');
    expect(label).toContain('does not decide anything');
  });

  it('describes an unmet threshold without implying failure of a decision', () => {
    const label = thresholdLabel(5, 20, false);
    expect(label).toContain('participation figure');
  });

  it('NEVER uses a governance verb or the word quorum, in any of its three arms', () => {
    for (const label of [thresholdLabel(4, null, null), thresholdLabel(25, 20, true), thresholdLabel(5, 20, false)]) {
      for (const word of FORBIDDEN) {
        expect(label.toLowerCase()).not.toContain(word);
      }
    }
  });
});

describe('displayStateLabel', () => {
  it('names all five derived states, distinguishing expired from closed', () => {
    expect(displayStateLabel('draft')).toBe('Draft');
    expect(displayStateLabel('scheduled')).toBe('Scheduled');
    expect(displayStateLabel('open')).toBe('Open');
    // "Closed by date" vs "Closed" — an admin must be able to tell a window that ran out from a
    // survey somebody deliberately stopped.
    expect(displayStateLabel('expired')).toBe('Closed by date');
    expect(displayStateLabel('closed')).toBe('Closed');
  });
});

describe('surveyErrorGuidance', () => {
  // ⭐ The one an admin will hit most. A bare "conflict" would leave them retrying the same edit.
  it('explains the freeze AND names the remedy that exists', () => {
    const g = surveyErrorGuidance('survey.frozen_field');
    expect(g).toContain('close this survey and publish a new one');
  });

  it('points a shortening attempt at close', () => {
    expect(surveyErrorGuidance('survey.window_invalid')).toContain('close the survey');
  });

  it('explains why there is no public audience', () => {
    expect(surveyErrorGuidance('survey.audience_unsupported')).toContain('signed-in member');
  });

  it('explains the non-author publish rule', () => {
    expect(surveyErrorGuidance('tone_review.required')).toContain('other than the person who wrote it');
  });

  it('returns null for an unknown code rather than inventing guidance', () => {
    expect(surveyErrorGuidance('something.else')).toBeNull();
    expect(surveyErrorGuidance(undefined)).toBeNull();
  });
});

// ⛔ THE LBD-1 COPY GATE, at the module that actually holds the strings. The Task-11 grep gate is the
// repo-wide floor; this is the same rule asserted where a reviewer reads it.
describe('the console copy never claims a survey decides anything', () => {
  const KEYS = [
    'survey.title',
    'survey.subtitle',
    'survey.advisoryNotice',
    'survey.field.responseThreshold',
    'survey.hint.responseThreshold',
    'survey.results.heading',
    'survey.results.anonymityNote',
    'survey.results.aggregateNote',
    'survey.hint.frozen',
    'survey.hint.terminal',
    'survey.hint.notTargetable',
  ];

  it('uses none of the governance verbs, and never the word quorum', () => {
    for (const key of KEYS) {
      const copy = resolveEn(key).toLowerCase();
      for (const word of ['quorum', 'approves', 'ratifies', 'passes', 'carries', 'votes']) {
        expect(copy, `${key} must not contain "${word}"`).not.toContain(word);
      }
    }
  });

  it('states plainly that a survey gathers views and does not decide', () => {
    expect(resolveEn('survey.advisoryNotice')).toContain('does not decide anything');
  });

  it('states plainly that the threshold changes nothing', () => {
    expect(resolveEn('survey.hint.responseThreshold')).toContain('It changes nothing');
  });
});
