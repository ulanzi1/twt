// Story 6.33 — the questionnaire chain's wire vocabulary in LOCKSTEP with the domain engine (test-only — contracts never
// imports `@twt/domain` in a shipped file — TR3), and the request shapes' refusals.

import { questionnaires } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  GROUND_INSPECTION_ANSWER_MAX_CODES,
  hasUnstorableChars,
  QUESTIONNAIRE_CHAIN_QUESTION_KINDS,
  QUESTIONNAIRE_CHAIN_STEPS,
  QUESTIONNAIRE_VERSION_KINDS,
  QuestionnaireDirectRequest,
  QuestionnaireDraftQuestion,
  QuestionnaireMakeLiveRequest,
  QuestionnaireProposeRequest,
  QuestionnaireReturnRequest,
} from '../src/index.js';

describe('Story 6.33 — the chain contracts', () => {
  it('LOCKSTEP: the steps, the kinds, the chain question kinds and the inspection option cap equal the domain\'s', () => {
    expect([...QUESTIONNAIRE_CHAIN_STEPS]).toEqual([...questionnaires.CHAIN_STEPS]);
    expect([...QUESTIONNAIRE_VERSION_KINDS]).toEqual([...questionnaires.QUESTIONNAIRE_KINDS]);
    expect([...QUESTIONNAIRE_CHAIN_QUESTION_KINDS]).toEqual([...questionnaires.CHAIN_QUESTION_KINDS]);
    expect(GROUND_INSPECTION_ANSWER_MAX_CODES).toBe(questionnaires.GROUND_INSPECTION_CHAIN_OPTIONS_MAX);
  });

  it('a draft question is a RULED key or a staff question — ⛔ a date, ⛔ a client-chosen flag (sensitive / warning / approvedBy)', () => {
    expect(QuestionnaireDraftQuestion.safeParse({ ruled: true, key: 'has_died' }).success).toBe(true);
    const staff = { key: 'water_source', kind: 'single', text: { en: 'Q', hi: 'प्र' }, options: [{ code: 'a', text: { en: 'A', hi: 'अ' } }, { code: 'b', text: { en: 'B', hi: 'ब' } }], showIf: null, health: false };
    expect(QuestionnaireDraftQuestion.safeParse(staff).success).toBe(true);
    expect(QuestionnaireDraftQuestion.safeParse({ ...staff, kind: 'date' }).success).toBe(false);
    for (const extra of [{ sensitive: false }, { warning: true }, { approvedBy: ['2026-10-10-304'] }, { copyKey: 'x.y' }]) {
      expect(QuestionnaireDraftQuestion.safeParse({ ...staff, ...extra }).success).toBe(false);
    }
  });

  it('the requests are strict; a return needs a non-blank note; a direct a reason; make-live targets a Pariwar or null (ALL)', () => {
    expect(QuestionnaireProposeRequest.safeParse({ kind: 'peer_mesh', pages: [{ questions: [{ ruled: true, key: 'has_died' }] }], extra: 1 }).success).toBe(false);
    expect(QuestionnaireReturnRequest.safeParse({ note: '   ' }).success).toBe(false);
    expect(QuestionnaireMakeLiveRequest.safeParse({ targetPariwarId: null }).success).toBe(true);
    expect(QuestionnaireMakeLiveRequest.safeParse({ targetPariwarId: 'x' }).success).toBe(false);
    const direct = { kind: 'peer_mesh', targetPariwarId: null, pages: [{ questions: [{ ruled: true, key: 'has_died' }] }], reason: '', hindiReviewed: true, classificationAttested: true };
    expect(QuestionnaireDirectRequest.safeParse(direct).success).toBe(false);
    expect(QuestionnaireDirectRequest.safeParse({ ...direct, reason: 'a reason' }).success).toBe(true);
  });

  it('review RV22 — a return NOTE or a direct REASON holding a NUL / a lone surrogate is refused at the door (a 400), ⛔ a Postgres 22P05 as a 500; and the contracts\' rule equals the domain\'s', () => {
    const nul = String.fromCharCode(0);
    const lone = String.fromCharCode(0xd800);
    const pair = String.fromCharCode(0xd83d, 0xde00);
    expect(QuestionnaireReturnRequest.safeParse({ note: `reword${nul}` }).success).toBe(false);
    expect(QuestionnaireReturnRequest.safeParse({ note: `reword${lone}` }).success).toBe(false);
    expect(QuestionnaireReturnRequest.safeParse({ note: `reword ${pair}` }).success).toBe(true);
    const direct = { kind: 'peer_mesh', targetPariwarId: null, pages: [{ questions: [{ ruled: true, key: 'has_died' }] }], hindiReviewed: true, classificationAttested: true };
    expect(QuestionnaireDirectRequest.safeParse({ ...direct, reason: `because${nul}` }).success).toBe(false);
    expect(QuestionnaireDirectRequest.safeParse({ ...direct, reason: `because${lone}` }).success).toBe(false);
    expect(QuestionnaireDirectRequest.safeParse({ ...direct, reason: 'because' }).success).toBe(true);
    // LOCKSTEP — the same answer as the domain's `hasUnstorableText` on every shape
    for (const s of ['', 'plain', 'पानी', `a${nul}`, `a${lone}`, `${String.fromCharCode(0xdc00)}a`, `x${pair}y`, `${lone}${lone}`, `${pair}${lone}`]) {
      expect(hasUnstorableChars(s)).toBe(questionnaires.hasUnstorableText(s));
    }
  });
});
